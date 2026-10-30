import sqlite3
con2 = sqlite3.connect('A:/curenova-bakend/curenova.db')
print('Dest db for Tilorone:', con2.execute("SELECT id, drug_name, disease_name FROM candidate_predictions WHERE drug_name LIKE '%Tilorone%'").fetchall())
