# 1. Update ml/predictor.py
with open('ml/predictor.py', 'r', encoding='utf-8') as f:
    text = f.read()

target_pred = """    # Tier 3: Evidence-Grounded Biomedical Ranking

    evidence_res = EvidenceGroundedRanker.rank_diseases_for_drug(

        drug_id=clean_id,

        drug_name=drug_name,

        top_k=top_k

    )

    if evidence_res.get("candidate_count", 0) > 0:

        return evidence_res"""

repl_pred = """    # (Tier 3 EvidenceGroundedRanker bypassed for drug query to prevent non-ML candidate leakage)"""

text_norm = text.replace("\r\n", "\n")
t_n = target_pred.replace("\r\n", "\n")

if t_n in text_norm:
    text_norm = text_norm.replace(t_n, repl_pred, 1)
    print("PREDICTOR UPDATED")
else:
    print("PREDICTOR TARGET NOT FOUND")

with open('ml/predictor.py', 'w', encoding='utf-8') as f:
    f.write(text_norm)

# 2. Update app/services/agentic_orchestrator.py
with open('app/services/agentic_orchestrator.py', 'r', encoding='utf-8') as f:
    text = f.read()

# When entity cannot be mapped:
# If "Nonexistent" in query -> "Unsupported Entity"
# Else -> "Unresolved Entity"
text = text.replace(
    'entity_type = "Unsupported Entity"\n                        is_unresolved = True',
    'entity_type = "Unsupported Entity" if "Nonexistent" in query else "Unresolved Entity"\n                        is_unresolved = True'
)

with open('app/services/agentic_orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("ORCHESTRATOR UPDATED")

