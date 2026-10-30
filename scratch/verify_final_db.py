import sqlite3
con = sqlite3.connect('curenova.db')
tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
print('Total Tables:', len(tables))
row_counts = {t: con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in tables}
for t, cnt in sorted(row_counts.items()):
    print(f"  {t:30s}: {cnt:4d} rows")
cand_cols = [c[1] for c in con.execute('PRAGMA table_info(candidate_predictions)').fetchall()]
print('Candidate columns count:', len(cand_cols))
assert all(col in cand_cols for col in ['investigation_id', 'workflow_id', 'score_type', 'provenance', 'molecular_features_json'])
print('All 5 relational candidate columns verified!')

