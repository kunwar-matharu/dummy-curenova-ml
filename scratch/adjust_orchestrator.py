with open('app/services/agentic_orchestrator.py', 'r', encoding='utf-8') as f:
    text = f.read()

target2 = """        first_provenance = getattr(candidates[0], "provenance", "precomputed_feature_store") if candidates else None
        inference_source = "Dynamic Feature Generation" if first_provenance == "dynamic_feature_generation" else "Precomputed Feature Store" """

repl2 = """        # (first_provenance and inference_source computed above)"""

text_norm = text.replace("\r\n", "\n")
t2_norm = target2.strip().replace("\r\n", "\n")

if t2_norm in text_norm:
    text_norm = text_norm.replace(t2_norm, repl2.strip(), 1)
    print("T2 OK")
else:
    print("T2 FAIL")

with open('app/services/agentic_orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(text_norm)
