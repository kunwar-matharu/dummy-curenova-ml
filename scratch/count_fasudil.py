import duckdb
con = duckdb.connect()
path = 'A:/curenova-bakend/ml/data/training/drug_disease_features_v4.parquet'
res = con.execute("SELECT COUNT(drug_id) FROM read_parquet(?) WHERE drug_id = ?", [path, 'CHEMBL38380']).fetchone()
print('Count of CHEMBL38380 in parquet:', res)

