"""
CureNova 2.0 Persistence & Relational Schema Migration
------------------------------------------------------
Idempotent migration script that upgrades an existing SQLite database (curenova.db)
to support:
1. investigation_runs table
2. patient_medications table
3. Added columns on candidate_predictions:
   - investigation_id (INTEGER)
   - workflow_id (VARCHAR(100))
   - score_type (VARCHAR(50) DEFAULT 'ranking_score')
   - provenance (VARCHAR(100) DEFAULT 'precomputed_feature_store')
   - molecular_features_json (TEXT)
4. Indexes for fast query lookup
5. Non-destructive: preserves all existing data and tables
"""

import os
import sys
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "curenova.db"

def get_row_counts(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in cursor.fetchall()]
    counts = {}
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        counts[t] = cursor.fetchone()[0]
    return counts

def run_migration(db_path: Path):
    if not db_path.exists():
        print(f"Database file not found at {db_path}. No migration needed.")
        return

    print(f"=== Starting Persistence Migration on {db_path} ===")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    before_counts = get_row_counts(conn)
    print(f"Existing tables ({len(before_counts)}):")
    for t, cnt in sorted(before_counts.items()):
        print(f"  - {t}: {cnt} rows")

    # 1. Create investigation_runs table if missing
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS investigation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id VARCHAR(100) NOT NULL UNIQUE,
        query VARCHAR(255) NOT NULL,
        entity_resolved_name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50) DEFAULT 'Disease',
        user_id INTEGER REFERENCES users(id),
        user_role VARCHAR(50) DEFAULT 'researcher',
        provenance_mode VARCHAR(50) DEFAULT 'deterministic_fallback',
        candidate_count INTEGER DEFAULT 0,
        top_candidate_name VARCHAR(255),
        top_candidate_score FLOAT,
        results_json TEXT NOT NULL,
        search_type VARCHAR(50) DEFAULT 'drug_to_disease',
        status VARCHAR(50) DEFAULT 'completed',
        execution_duration_ms INTEGER,
        model_version VARCHAR(50) DEFAULT 'cure-nova-xgb-final',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_investigation_runs_id ON investigation_runs (id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_investigation_runs_workflow_id ON investigation_runs (workflow_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_investigation_runs_query ON investigation_runs (query);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_investigation_runs_status ON investigation_runs (status);")

    # 2. Create patient_medications table if missing
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patient_medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        drug_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) DEFAULT 'As prescribed',
        frequency VARCHAR(100) DEFAULT 'Daily',
        time_of_day VARCHAR(50) DEFAULT 'Morning (8:00 AM)',
        taken BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_patient_medications_id ON patient_medications (id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_patient_medications_user_id ON patient_medications (user_id);")

    # 3. Add missing columns to candidate_predictions
    cursor.execute("PRAGMA table_info(candidate_predictions);")
    existing_cols = {row[1] for row in cursor.fetchall()}

    columns_to_add = [
        ("investigation_id", "INTEGER REFERENCES investigation_runs(id)"),
        ("workflow_id", "VARCHAR(100)"),
        ("score_type", "VARCHAR(50) DEFAULT 'ranking_score'"),
        ("provenance", "VARCHAR(100) DEFAULT 'precomputed_feature_store'"),
        ("molecular_features_json", "TEXT"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in existing_cols:
            print(f"Adding column '{col_name}' to candidate_predictions...")
            cursor.execute(f"ALTER TABLE candidate_predictions ADD COLUMN {col_name} {col_def};")
        else:
            print(f"Column '{col_name}' already exists in candidate_predictions.")

    # 4. Create indexes on candidate_predictions
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_candidate_predictions_investigation_id ON candidate_predictions (investigation_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_candidate_predictions_workflow_id ON candidate_predictions (workflow_id);")

    conn.commit()

    after_counts = get_row_counts(conn)
    print("\n=== Migration Completed Successfully ===")
    print(f"Tables after migration ({len(after_counts)}):")
    for t, cnt in sorted(after_counts.items()):
        before = before_counts.get(t, "(new)")
        print(f"  - {t}: {cnt} rows (before: {before})")

    # Safety check: ensure no data loss on previously existing tables
    for t, before_cnt in before_counts.items():
        assert after_counts[t] == before_cnt, f"DATA LOSS DETECTED on table {t}! {after_counts[t]} != {before_cnt}"

    conn.close()
    print("\nData integrity verified: All existing records intact!")

if __name__ == "__main__":
    run_migration(DB_PATH)

