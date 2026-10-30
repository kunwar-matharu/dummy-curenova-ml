with open('app/services/ml_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """                cand.provenance = cand_prov
                cand.score_type = "ranking_score" """

repl1 = """                cand.provenance = cand_prov
                cand.score_type = "ranking_score"
                cand.indication_status = cand_data.get("indication_status", "potential_repurposing")
                cand.is_known_indication = cand_data.get("is_known_indication", False)"""

text = text.replace(target1, repl1)

with open('app/services/ml_service.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("UPDATED ML SERVICE")

with open('app/services/agentic_orchestrator.py', 'r', encoding='utf-8') as f:
    text = f.read()

target2 = """                "stress_score": getattr(c, "stress_score", None),
                "stress_interpretation": getattr(c, "stress_interpretation", None),
                "provenance": getattr(c, "provenance", None) or ("dynamic_feature_generation" if first_provenance == "dynamic_feature_generation" else "precomputed_feature_store")
            })"""

repl2 = """                "stress_score": getattr(c, "stress_score", None),
                "stress_interpretation": getattr(c, "stress_interpretation", None),
                "indication_status": getattr(c, "indication_status", "potential_repurposing"),
                "is_known_indication": getattr(c, "is_known_indication", False),
                "provenance": getattr(c, "provenance", None) or ("dynamic_feature_generation" if first_provenance == "dynamic_feature_generation" else "precomputed_feature_store")
            })"""

text = text.replace(target2, repl2, 1)

with open('app/services/agentic_orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("UPDATED ORCHESTRATOR")

