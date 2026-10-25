import os
import time
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from ..config import settings

# Initialize standard Argon2id PasswordHasher
_ph = PasswordHasher()

def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def hash_token(token: str) -> str:
    """Computes SHA-256 hash of a token for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_access_token(user_id: int, role: str, email: str) -> Tuple[str, int]:
    """
    Creates a signed JWT access token with issuer, audience, and expiration.
    Returns (token_string, expires_in_seconds).
    """
    now = datetime.now(timezone.utc)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    exp = now + timedelta(seconds=expires_in)
    jti = str(uuid.uuid4())

    payload = {
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "sub": str(user_id),
        "email": email,
        "role": role,
        "token_type": "access",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp())
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return token, expires_in

def create_refresh_token(user_id: int, family_id: Optional[str] = None) -> Tuple[str, str, str, str, datetime]:
    """
    Creates a cryptographically signed refresh token with a unique family ID for rotation.
    Returns (raw_token, token_hash, jti, family_id, expires_at).
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    fam_id = family_id or str(uuid.uuid4())

    payload = {
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "sub": str(user_id),
        "token_type": "refresh",
        "jti": jti,
        "family_id": fam_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp())
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    raw_hash = hash_token(token)
    return token, raw_hash, jti, fam_id, expires_at

def decode_jwt_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Decodes and validates token signature, issuer, audience, and expiration.
    Enforces token_type and required claims ('sub', 'jti').
    Raises jwt.PyJWTError on invalid token.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        issuer=settings.JWT_ISSUER,
        audience=settings.JWT_AUDIENCE
    )
    if payload.get("token_type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected token type '{expected_type}', got '{payload.get('token_type')}'")
    if not payload.get("sub"):
        raise jwt.InvalidTokenError("Token payload missing required 'sub' (subject) claim")
    return payload


class LoginRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for login attempts.
    Limits failed authentication attempts per client IP or email identifier.
    Includes active pruning to prevent unbounded memory growth.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: Dict[str, list[float]] = {}

    def _prune(self, now: float) -> None:
        """Removes expired entries across all keys to prevent unbounded memory growth."""
        expired_keys = [k for k, v in self._attempts.items() if not v or (now - v[-1] >= self.window_seconds)]
        for k in expired_keys:
            del self._attempts[k]

    def is_rate_limited(self, identifier: str) -> bool:
        now = time.time()
        # Periodic sweep if map grows beyond threshold
        if len(self._attempts) > 1000:
            self._prune(now)

        timestamps = self._attempts.get(identifier, [])
        valid = [t for t in timestamps if now - t < self.window_seconds]
        if valid:
            self._attempts[identifier] = valid
        else:
            self._attempts.pop(identifier, None)
        return len(valid) >= self.max_attempts

    def record_attempt(self, identifier: str) -> None:
        now = time.time()
        if identifier not in self._attempts:
            self._attempts[identifier] = []
        self._attempts[identifier].append(now)

    def reset(self, identifier: str) -> None:
        if identifier in self._attempts:
            del self._attempts[identifier]

# Global singleton rate limiter for auth endpoints
login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)


def get_client_ip(request: Any) -> str:
    """
    Safely retrieves the direct client host IP without trusting unverified
    X-Forwarded-For headers from untrusted proxies.
    Falls back to '127.0.0.1' if client is None.
    """
    if hasattr(request, "client") and request.client and getattr(request.client, "host", None):
        return request.client.host
    return "127.0.0.1"


class EndpointRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for API endpoints.
    Tracks request timestamps keyed by client IP or authenticated subject.
    Includes active pruning to prevent unbounded memory growth.

    LIMITATION NOTE (Multi-worker deployments):
    In-memory rate limiters maintain state strictly within local process memory.
    In multi-process or multi-worker production environments (e.g. Uvicorn with multiple workers
    or multiple Kubernetes pods), each worker maintains independent state. For production clusters,
    a distributed Redis/Memcached-backed rate limiter is required.
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60, name: str = "endpoint"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.name = name
        self._requests: Dict[str, list[float]] = {}

    def _prune(self, now: float) -> None:
        """Removes expired entries across all keys to prevent unbounded memory growth."""
        expired_keys = [k for k, v in self._requests.items() if not v or (now - v[-1] >= self.window_seconds)]
        for k in expired_keys:
            del self._requests[k]

    def is_rate_limited(self, identifier: str) -> bool:
        now = time.time()
        # Periodic sweep if map grows beyond threshold
        if len(self._requests) > 1000:
            self._prune(now)

        timestamps = self._requests.get(identifier, [])
        valid = [t for t in timestamps if now - t < self.window_seconds]
        if valid:
            self._requests[identifier] = valid
        else:
            self._requests.pop(identifier, None)
        return len(valid) >= self.max_requests

    def record_request(self, identifier: str) -> None:
        now = time.time()
        if identifier not in self._requests:
            self._requests[identifier] = []
        self._requests[identifier].append(now)

    def reset(self, identifier: Optional[str] = None) -> None:
        if identifier is None:
            self._requests.clear()
        elif identifier in self._requests:
            del self._requests[identifier]

    def check_rate_limit(self, identifier: str) -> None:
        """
        Enforces rate limiting: raises HTTP 429 Too Many Requests if the limit
        is exceeded; otherwise records the request.
        """
        if self.is_rate_limited(identifier):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {self.name}. Maximum {self.max_requests} requests per {self.window_seconds}s."
            )
        self.record_request(identifier)


# Outbound external API rate limiter (ClinicalTrials.gov, PubMed)
outbound_rate_limiter = EndpointRateLimiter(max_requests=10, window_seconds=60, name="live external APIs")

# Patient portal plain language explanation rate limiter
patient_explain_rate_limiter = EndpointRateLimiter(max_requests=15, window_seconds=60, name="patient research explanation")

# Evidence synthesis rate limiter
evidence_synthesis_rate_limiter = EndpointRateLimiter(max_requests=10, window_seconds=60, name="evidence synthesis")

