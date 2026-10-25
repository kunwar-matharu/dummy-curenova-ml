import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional

from ..database import get_db
from ..models.models import User, RefreshToken
from ..schemas.schemas import (
    UserSignup, UserLogin, UserOut, TokenResponse,
    TokenRefreshResponse, RefreshTokenRequest, LogoutRequest,
    UserApprovalRequest
)
from ..services.auth_service import (
    hash_password, verify_password, hash_token,
    create_access_token, create_refresh_token, decode_jwt_token,
    login_rate_limiter
)
from ..dependencies.auth import (
    get_current_user, get_optional_current_user, get_current_active_user, require_admin
)


router = APIRouter(prefix="/auth", tags=["Authentication & Roles"])

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    """
    Registers a new user account with normalized email, duplicate check,
    Argon2id password hashing, and role verification gates.
    """
    norm_email = payload.email.strip().lower()

    # 1. Duplicate check
    existing = db.query(User).filter(User.email == norm_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists"
        )

    # 2. Prevent unvetted privilege escalation on signup
    role = payload.role.strip().lower()
    if role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot self-register as an administrator"
        )
    if role not in ("patient", "doctor", "researcher"):
        role = "patient"

    # Researcher and doctor roles require administrative approval
    if role in ("researcher", "doctor"):
        approval_status = "pending"
        is_verified = False
    else:
        approval_status = "approved"
        is_verified = True

    # 3. Hash password using Argon2id
    hashed_pwd = hash_password(payload.password)

    new_user = User(
        email=norm_email,
        full_name=payload.full_name.strip(),
        role=role,
        hashed_password=hashed_pwd,
        is_active=True,
        is_verified=is_verified,
        approval_status=approval_status
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates a user using Argon2id password verification.
    Issues JWT access token and rotating refresh token.
    Enforces rate-limiting and generic errors to eliminate account enumeration.
    """
    norm_email = creds.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{norm_email}"

    # 1. Rate-limiting check
    if login_rate_limiter.is_rate_limited(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please wait before retrying."
        )

    # 2. User lookup
    user = db.query(User).filter(User.email == norm_email).first()

    # 3. Password verification via Argon2id (never fall back to another user)
    if not user or not verify_password(creds.password, user.hashed_password):
        login_rate_limiter.record_attempt(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 4. Account status check
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Successful login: reset rate limiter
    login_rate_limiter.reset(rate_limit_key)

    # 5. Issue Access Token & Refresh Token pair
    access_token, expires_in = create_access_token(user.id, user.role, user.email)
    raw_refresh, token_hash, jti, family_id, expires_at = create_refresh_token(user.id)

    # Store refresh token hash (never plaintext)
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        jti=jti,
        family_id=family_id,
        is_revoked=False,
        expires_at=expires_at
    )
    db.add(refresh_record)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
        user=user
    )

@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Rotates refresh tokens with atomic concurrency control and reuse detection.
    Performs conditional database state transition that allows only one request to claim an unrevoked token.
    On failure or collision, rolls back changes and terminates the compromised token family.
    """
    import jwt
    raw_token = payload.refresh_token.strip()
    try:
        decoded = decode_jwt_token(raw_token, expected_type="refresh")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except (jwt.PyJWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed refresh token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token_jti = decoded.get("jti")
    if not token_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing unique token identifier (jti)",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token_hash = hash_token(raw_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token record not found",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 1. Reuse detection: if token is already marked revoked, trigger security invalidation across the family
    if record.is_revoked:
        db.query(RefreshToken).filter(RefreshToken.family_id == record.family_id).update(
            {"is_revoked": True},
            synchronize_session="fetch"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Revoked refresh token reuse detected. All sessions in this token family have been terminated.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 2. Check stored expiration timestamp
    now = datetime.now(timezone.utc)
    exp_at = record.expires_at
    if exp_at.tzinfo is None:
        exp_at = exp_at.replace(tzinfo=timezone.utc)
    if exp_at < now:
        record.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 3. Check user account active status
    user = db.query(User).filter(User.id == record.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 4. Atomic conditional state transition:
    # Exactly one concurrent request can successfully transition is_revoked from False to True.
    claimed_rows = db.query(RefreshToken).filter(
        RefreshToken.id == record.id,
        RefreshToken.is_revoked == False
    ).update(
        {"is_revoked": True},
        synchronize_session="fetch"
    )

    if claimed_rows != 1:
        # A concurrent request claimed this token first! Roll back and invalidate family.
        db.rollback()
        db.query(RefreshToken).filter(RefreshToken.family_id == record.family_id).update(
            {"is_revoked": True},
            synchronize_session="fetch"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Concurrent refresh token collision detected. All sessions in this token family have been terminated.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 5. Issue replacement tokens only AFTER the token claim succeeds
    new_access, expires_in = create_access_token(user.id, user.role, user.email)
    new_refresh, new_hash, new_jti, _, new_expires_at = create_refresh_token(
        user.id, family_id=record.family_id
    )

    new_record = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        jti=new_jti,
        family_id=record.family_id,
        is_revoked=False,
        expires_at=new_expires_at
    )
    db.add(new_record)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction error while persisting refreshed session."
        )

    return TokenRefreshResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=expires_in
    )


@router.post("/logout")
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Revokes active refresh session.
    Validates token ownership to prevent cross-user session revocation.
    """
    if payload.refresh_token:
        raw_token = payload.refresh_token.strip()
        try:
            decoded = decode_jwt_token(raw_token, expected_type="refresh")
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or malformed refresh token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        token_user_id = int(decoded.get("sub", 0))
        # Enforce token ownership: authenticated user cannot revoke someone else's session
        if current_user and current_user.id != token_user_id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot revoke a session belonging to another user"
            )

        token_hash = hash_token(raw_token)
        record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == token_user_id
        ).first()
        if record:
            record.is_revoked = True
            db.commit()
    elif current_user:
        # Revoke all refresh tokens for this user
        db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update(
            {"is_revoked": True}
        )
        db.commit()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either refresh_token in request body or Bearer authorization header required to logout"
        )

    return {"message": "Session terminated successfully"}


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Returns the authenticated user profile based strictly on verified JWT credentials.
    Replaces client-supplied role query parameters.
    """
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Administrative directory of users. Restricted strictly to administrators."""
    return db.query(User).all()

@router.post("/users/{user_id}/approve", response_model=UserOut)
def approve_user_role(
    user_id: int,
    approval: UserApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Approves or rejects pending researcher/doctor role requests."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.approval_status = approval.approval_status
    user.is_verified = (approval.approval_status == "approved")
    db.commit()
    db.refresh(user)
    return user
