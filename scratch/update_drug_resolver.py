with open('app/services/drug_resolver.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('"everolimus": ("Everolimus", "CHEMBL1908360")', '"everolimus": ("EVEROLIMUS", "CHEMBL1908360")')
text = text.replace('"afinitor": ("Everolimus", "CHEMBL1908360")', '"afinitor": ("EVEROLIMUS", "CHEMBL1908360")')
text = text.replace('"zortress": ("Everolimus", "CHEMBL1908360")', '"zortress": ("EVEROLIMUS", "CHEMBL1908360")')
text = text.replace('"rad001": ("Everolimus", "CHEMBL1908360")', '"rad001": ("EVEROLIMUS", "CHEMBL1908360")')

with open('app/services/drug_resolver.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("UPDATED DRUG RESOLVER")

