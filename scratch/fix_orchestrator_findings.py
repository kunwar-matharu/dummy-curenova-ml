with open('app/services/agentic_orchestrator.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: matched_drug.name directly (do not uppercase Everolimus if matched from DB)
text = text.replace(
    'entity_resolved_name = "EVEROLIMUS" if matched_drug.name.upper() == "EVEROLIMUS" else matched_drug.name',
    'entity_resolved_name = matched_drug.name'
)
text = text.replace(
    'entity_resolved_name = "EVEROLIMUS" if drug_raw_name.upper() == "EVEROLIMUS" else drug_raw_name',
    'entity_resolved_name = drug_raw_name'
)

# Fix 2: findings_summary when is_unresolved
old_findings = '"findings_summary": f"Resolved query ({query_type.upper()}) to {entity_type}: \'{entity_resolved_name}\' [ID: {identifier_label}].",'
new_findings = '"findings_summary": (f"Query \'{query}\' could not be mapped to a known {query_type.upper()} entity in biomedical ontologies." if is_unresolved else f"Resolved query ({query_type.upper()}) to {entity_type}: \'{entity_resolved_name}\' [ID: {identifier_label}]."),'

if old_findings in text:
    text = text.replace(old_findings, new_findings, 1)
    print("FINDINGS REPLACED")
else:
    print("FINDINGS NOT FOUND")

with open('app/services/agentic_orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("ORCHESTRATOR UPDATED")

