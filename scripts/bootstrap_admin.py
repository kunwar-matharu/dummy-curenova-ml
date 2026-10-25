"""
CureNova Safe Initial Administrator Bootstrap Procedure
-------------------------------------------------------
A safe, one-time administrator provisioning utility.
- Accepts credentials interactively via getpass or securely via environment variable.
- Enforces strict password complexity (minimum 12 characters).
- Hashes password using Argon2id.
- Strictly prohibits logging or exposing passwords and password hashes.
- Idempotent and non-destructive: preserves all existing users and database records.
"""

import sys
import os
import getpass
import argparse
from typing import Optional, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.models import User
from app.services.auth_service import hash_password

INSECURE_BOOTSTRAP_PASSWORDS = {
    "admin",
    "password",
    "admin123",
    "administrator",
    "curenova",
    "CureNova2026!Secure",
    "AStrongRandomPassword2026!#Secure",
    "changeme",
    "secret"
}

def bootstrap_admin(
    email: str,
    password: str,
    full_name: str = "System Administrator",
    db_session=None
) -> Tuple[bool, str]:
    """
    Safely provisions an initial administrator account.
    Returns (success: bool, message: str).
    Never logs or exposes passwords.
    """
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        return False, "Validation Error: A valid email address is required."

    if not password or len(password) < 12:
        return False, "Validation Error: Administrator password must be at least 12 characters long."

    if password in INSECURE_BOOTSTRAP_PASSWORDS:
        return False, "Security Error: Known default, insecure, or compromised password rejected."

    owns_session = False
    db = db_session
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        existing_user = db.query(User).filter(User.email == clean_email).first()
        if existing_user:
            if existing_user.role == "admin":
                return True, f"Administrator account '{clean_email}' already exists. Database records preserved."
            return False, f"Conflict: User '{clean_email}' already exists with role '{existing_user.role}'."

        # Hash securely using Argon2id
        hashed = hash_password(password)

        new_admin = User(
            email=clean_email,
            full_name=full_name.strip(),
            role="admin",
            hashed_password=hashed,
            is_active=True,
            is_verified=True,
            approval_status="approved"
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return True, f"Initial administrator '{clean_email}' bootstrapped successfully (ID: {new_admin.id})."
    except Exception as e:
        db.rollback()
        return False, f"Database Error during administrator bootstrap: {str(e)}"
    finally:
        if owns_session:
            db.close()

def rotate_admin_password(
    email: str,
    new_password: str,
    db_session=None
) -> Tuple[bool, str]:
    """
    Safely rotates an existing administrator account's password.
    - Requires account to exist and possess the 'admin' role.
    - Validates password length (min 12 chars) and rejects known compromised defaults.
    - Hashes password using Argon2id.
    - Revokes all active refresh tokens for the user to force re-authentication.
    - Never logs or exposes passwords.
    """
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        return False, "Validation Error: A valid email address is required."

    if not new_password or len(new_password) < 12:
        return False, "Validation Error: Administrator password must be at least 12 characters long."

    if new_password in INSECURE_BOOTSTRAP_PASSWORDS:
        return False, "Security Error: Known default, insecure, or compromised password rejected."

    owns_session = False
    db = db_session
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        from app.models.models import RefreshToken
        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            return False, f"User Error: No user account found with email '{clean_email}'."
        if user.role != "admin":
            return False, f"Security Error: Account '{clean_email}' is not an administrator. Password rotation denied."

        # Hash new password using Argon2id
        user.hashed_password = hash_password(new_password)

        # Invalidate all active refresh sessions to prevent persistence of compromised sessions
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"is_revoked": True})

        db.commit()
        return True, f"Administrator '{clean_email}' password rotated successfully. Active refresh sessions revoked."
    except Exception as e:
        db.rollback()
        return False, f"Database Error during administrator password rotation: {str(e)}"
    finally:
        if owns_session:
            db.close()

def main():
    parser = argparse.ArgumentParser(
        description="CureNova One-Time Administrator Bootstrap & Rotation Utility"
    )
    parser.add_argument(
        "--email",
        type=str,
        default=os.getenv("CURENOVA_INITIAL_ADMIN_EMAIL", "admin@curenova.ai"),
        help="Administrator email address"
    )
    parser.add_argument(
        "--name",
        type=str,
        default="System Administrator",
        help="Administrator full name"
    )
    parser.add_argument(
        "--rotate",
        action="store_true",
        help="Rotate password for an existing administrator account instead of initial provisioning"
    )
    args = parser.parse_args()

    # Obtain password without printing or exposing
    admin_password = (
        os.getenv("CURENOVA_ADMIN_PASSWORD")
        or (os.getenv("CURENOVA_ROTATION_ADMIN_PASSWORD") if args.rotate else None)
        or os.getenv("CURENOVA_INITIAL_ADMIN_PASSWORD")
    )
    if not admin_password:
        if sys.stdin.isatty():
            prompt_label = "Enter secure replacement administrator password (min 12 chars): " if args.rotate else "Enter secure initial administrator password (min 12 chars): "
            admin_password = getpass.getpass(prompt_label)
            confirm_pwd = getpass.getpass("Confirm administrator password: ")
            if admin_password != confirm_pwd:
                print("[ERROR] Passwords do not match.", file=sys.stderr)
                sys.exit(1)
        else:
            print(
                "[ERROR] Non-interactive execution requires CURENOVA_ADMIN_PASSWORD or CURENOVA_ROTATION_ADMIN_PASSWORD / CURENOVA_INITIAL_ADMIN_PASSWORD environment variable.",
                file=sys.stderr
            )
            sys.exit(1)

    if args.rotate:
        success, message = rotate_admin_password(
            email=args.email,
            new_password=admin_password
        )
    else:
        success, message = bootstrap_admin(
            email=args.email,
            password=admin_password,
            full_name=args.name
        )

    if success:
        print(f"[SUCCESS] {message}")
        sys.exit(0)
    else:
        print(f"[FAILURE] {message}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

