import sqlite3
import shutil
import os
from datetime import datetime

def run_migration(db_path: str = "curenova.db", backup: bool = True):
    """
    Safely migrates curenova.db to Milestone 2 authentication schema.
    Does not delete or reset any existing tables or rows.
    """
    if not os.path.exists(db_path):
        print(f"Database file '{db_path}' does not exist. Nothing to migrate.")
        return

    # 1. Create a safe backup before migration
    if backup:
        backup_path = f"{db_path}.pre_m2_backup_{int(datetime.now().timestamp())}"
        shutil.copy2(db_path, backup_path)
        print(f"Created safety backup at: {backup_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 2. Check existing columns in users table
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = {col[1] for col in cursor.fetchall()}

        if "is_active" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
            print("Added 'is_active' column to users table.")

        if "is_verified" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1")
            print("Added 'is_verified' column to users table.")

        if "approval_status" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'")
            print("Added 'approval_status' column to users table.")

        # 3. Create refresh_tokens table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            jti VARCHAR(100) NOT NULL UNIQUE,
            family_id VARCHAR(100) NOT NULL,
            is_revoked BOOLEAN DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_jti ON refresh_tokens(jti)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_family_id ON refresh_tokens(family_id)")
        print("Ensured 'refresh_tokens' table and indexes exist.")

        # 4. Migrate demo user passwords to Argon2id hashes (password: "CureNova2026!Secure")
        argon2_hash = "$argon2id$v=19$m=65536,t=3,p=4$4Ok5SFZFNL58y8TB1Aty9w$yDW80JO8wQKG4FsoXC43220e2YivcS1/ZZVa8kUpRy8"
        cursor.execute("""
            UPDATE users
            SET hashed_password = ?, is_active = 1, is_verified = 1, approval_status = 'approved'
            WHERE hashed_password LIKE 'pbkdf2_demo_%'
        """, (argon2_hash,))
        updated_count = cursor.rowcount
        if updated_count > 0:
            print(f"Upgraded {updated_count} legacy demo user passwords to Argon2id.")

        # 5. Add default system administrator if not present
        cursor.execute("SELECT id FROM users WHERE email = 'admin@curenova.ai'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO users (email, full_name, role, hashed_password, is_active, is_verified, approval_status, created_at)
                VALUES ('admin@curenova.ai', 'CureNova System Admin', 'admin', ?, 1, 1, 'approved', CURRENT_TIMESTAMP)
            """, (argon2_hash,))
            print("Created default admin user 'admin@curenova.ai'.")

        conn.commit()
        print("Milestone 2 migration committed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Migration error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
