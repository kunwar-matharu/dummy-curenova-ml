with open('app/services/ml_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace in generate_repurposing_candidates
target1 = """                cand = CandidatePrediction(

                    id=resolved_drug_id or (1000 + rank),

                    project_id=1,

                    drug_id=resolved_drug_id,

                    drug_name=drug_name,

                    chembl_id=chembl_id,

                    disease_id=resolved_disease_id,

                    disease_name=disease_name,

                    model_name=engine_name,

                    model_version=MODEL_VERSION,

                    prediction_score=score,

                    confidence_interval_low=score,  # Point ranking estimate (no fabricated interval)

                    confidence_interval_high=score, # Point ranking estimate (no fabricated interval)

                    calibration_status=calib_status,

                    epistemic_uncertainty=None,     # Uncalibrated / unfabricated

                    aleatoric_uncertainty=None,     # Uncalibrated / unfabricated

                    rank=rank,

                    rationale=rationale,

                    biological_mechanism=biological_mechanism,

                    status="Hypothesis",

                    approval_status=clinical_stage,

                    evidence_count=evidence_count,

                    is_bookmarked=False,

                    last_updated=datetime.now(timezone.utc)

                )"""

repl1 = """                cand_prov = cand_data.get("provenance") or raw_result.get("provenance", "precomputed_feature_store")
                cand = CandidatePrediction(

                    id=resolved_drug_id or (1000 + rank),

                    project_id=1,

                    drug_id=resolved_drug_id,

                    drug_name=drug_name,

                    chembl_id=chembl_id,

                    disease_id=resolved_disease_id,

                    disease_name=disease_name,

                    model_name=engine_name,

                    model_version=MODEL_VERSION,

                    prediction_score=score,

                    confidence_interval_low=score,  # Point ranking estimate (no fabricated interval)

                    confidence_interval_high=score, # Point ranking estimate (no fabricated interval)

                    calibration_status=calib_status,

                    epistemic_uncertainty=None,     # Uncalibrated / unfabricated

                    aleatoric_uncertainty=None,     # Uncalibrated / unfabricated

                    rank=rank,

                    rationale=rationale,

                    biological_mechanism=biological_mechanism,

                    status="Hypothesis",

                    approval_status=clinical_stage,

                    evidence_count=evidence_count,

                    is_bookmarked=False,

                    score_type="ranking_score",

                    provenance=cand_prov,

                    last_updated=datetime.now(timezone.utc)

                )
                cand.provenance = cand_prov
                cand.score_type = "ranking_score" """

# Replace in generate_repurposing_candidates_for_drug
target2 = """                cand = CandidatePrediction(

                    id=resolved_disease_id or (2000 + rank),

                    project_id=1,

                    drug_id=resolved_drug_id,

                    drug_name=drug_name,

                    chembl_id=chembl_id,

                    disease_id=resolved_disease_id,

                    disease_name=cand_disease_name,

                    model_name=engine_name,

                    model_version=MODEL_VERSION,

                    prediction_score=score,

                    confidence_interval_low=score,  # Point ranking estimate (no fabricated interval)

                    confidence_interval_high=score, # Point ranking estimate (no fabricated interval)

                    calibration_status=calib_status,

                    epistemic_uncertainty=None,     # Uncalibrated / unfabricated

                    aleatoric_uncertainty=None,     # Uncalibrated / unfabricated

                    rank=rank,

                    rationale=rationale,

                    biological_mechanism=biological_mechanism,

                    status="Hypothesis",

                    approval_status=clinical_stage,

                    evidence_count=evidence_count,

                    is_bookmarked=False,

                    last_updated=datetime.now(timezone.utc)

                )"""

repl2 = """                cand_prov = cand_data.get("provenance") or raw_result.get("provenance", "precomputed_feature_store")
                cand = CandidatePrediction(

                    id=resolved_disease_id or (2000 + rank),

                    project_id=1,

                    drug_id=resolved_drug_id,

                    drug_name=drug_name,

                    chembl_id=chembl_id,

                    disease_id=resolved_disease_id,

                    disease_name=cand_disease_name,

                    model_name=engine_name,

                    model_version=MODEL_VERSION,

                    prediction_score=score,

                    confidence_interval_low=score,  # Point ranking estimate (no fabricated interval)

                    confidence_interval_high=score, # Point ranking estimate (no fabricated interval)

                    calibration_status=calib_status,

                    epistemic_uncertainty=None,     # Uncalibrated / unfabricated

                    aleatoric_uncertainty=None,     # Uncalibrated / unfabricated

                    rank=rank,

                    rationale=rationale,

                    biological_mechanism=biological_mechanism,

                    status="Hypothesis",

                    approval_status=clinical_stage,

                    evidence_count=evidence_count,

                    is_bookmarked=False,

                    score_type="ranking_score",

                    provenance=cand_prov,

                    last_updated=datetime.now(timezone.utc)

                )
                cand.provenance = cand_prov
                cand.score_type = "ranking_score" """

text_norm = text.replace("\r\n", "\n")
t1_norm = target1.replace("\r\n", "\n")
t2_norm = target2.replace("\r\n", "\n")

if t1_norm in text_norm:
    text_norm = text_norm.replace(t1_norm, repl1.replace("\r\n", "\n"), 1)
    print("T1 REPLACED")
else:
    print("T1 NOT FOUND")

if t2_norm in text_norm:
    text_norm = text_norm.replace(t2_norm, repl2.replace("\r\n", "\n"), 1)
    print("T2 REPLACED")
else:
    print("T2 NOT FOUND")

with open('app/services/ml_service.py', 'w', encoding='utf-8') as f:
    f.write(text_norm)

