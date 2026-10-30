with open('ml/predictor.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    # Tier 1: Production XGBoost from feature store

    raw_res = _raw_predict_drug(drug_id=clean_id, top_k=top_k)

    if raw_res.get("candidates"):

        raw_res["prediction_mode"] = "PRODUCTION_XGBOOST"

        raw_res["engine"] = "CureNova XGBoost Final"

        return raw_res"""

repl = """    # Tier 1 & 2: Production XGBoost from feature store or dynamic feature generation

    raw_res = _raw_predict_drug(drug_id=clean_id, top_k=top_k)

    if raw_res.get("candidates"):

        prov = raw_res.get("provenance", "precomputed_feature_store")

        raw_res["prediction_mode"] = "DYNAMIC_XGBOOST" if prov == "dynamic_feature_generation" else "PRODUCTION_XGBOOST"

        raw_res["engine"] = "CureNova XGBoost Final"

        raw_res["provenance"] = prov

        return raw_res"""

target_norm = target.replace("\r\n", "\n")
text_norm = text.replace("\r\n", "\n")

if target_norm in text_norm:
    text_norm = text_norm.replace(target_norm, repl.replace("\r\n", "\n"), 1)
    with open('ml/predictor.py', 'w', encoding='utf-8') as f:
        f.write(text_norm)
    print("REPLACED SUCCESS")
else:
    print("NOT FOUND")

