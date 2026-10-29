from pathlib import Path
import subprocess
import json
import sys
from io import BytesIO

import joblib
import pandas as pd
import numpy as np

_LOCAL_BASE = Path(__file__).resolve().parent
BASE = _LOCAL_BASE if (_LOCAL_BASE / "models" / "cure_nova_xgb_final.joblib").exists() else Path(r"A:\CureNovaML")

MODEL_PATH = BASE / "models" / "cure_nova_xgb_final.joblib"
DATA_PATH = BASE / "data" / "training" / "drug_disease_features_v4.parquet"
MOLECULAR_PATH = BASE / "data" / "training" / "drug_molecular_features.csv"

if not DATA_PATH.exists() and (Path(r"A:\CureNovaML") / "data" / "training" / "drug_disease_features_v4.parquet").exists():
    DATA_PATH = Path(r"A:\CureNovaML") / "data" / "training" / "drug_disease_features_v4.parquet"

if not MOLECULAR_PATH.exists() and (Path(r"A:\CureNovaML") / "data" / "training" / "drug_molecular_features.csv").exists():
    MOLECULAR_PATH = Path(r"A:\CureNovaML") / "data" / "training" / "drug_molecular_features.csv"

bundle = joblib.load(MODEL_PATH)

model = bundle["model"]
FEATURES = bundle["features"]
MODEL_VERSION = bundle.get("model_version", "cure-nova-xgb-v2")


def query_candidates(disease_id):
    """Queries candidate drugs for a disease where label = 0 (unlabeled hypotheses)."""
    safe_id = str(disease_id).replace("'", "''")

    if not DATA_PATH.exists():
        return pd.DataFrame()

    sql = f"""
    SELECT *
    FROM read_parquet('{DATA_PATH.as_posix()}')
    WHERE disease_id = '{safe_id}'
      AND label = 0
    """

    try:
        import duckdb
        return duckdb.connect().execute(sql).df()
    except Exception:
        result = subprocess.run(
            ["duckdb", "-csv", "-c", sql],
            capture_output=True
        )

        if result.returncode != 0:
            raise RuntimeError(
                result.stderr.decode("utf-8", errors="replace")
            )

        if not result.stdout:
            return pd.DataFrame()

        return pd.read_csv(BytesIO(result.stdout))


def query_disease_candidates(drug_id):
    """
    Symmetric drug-side query:
    Queries candidate diseases for a drug where label = 0 (unlabeled hypotheses).
    Excludes approved/clinical indications (label = 1).
    """
    safe_id = str(drug_id).replace("'", "''")

    if not DATA_PATH.exists():
        return pd.DataFrame()

    sql = f"""
    SELECT *
    FROM read_parquet('{DATA_PATH.as_posix()}')
    WHERE drug_id = '{safe_id}'
      AND label = 0
    """

    try:
        import duckdb
        return duckdb.connect().execute(sql).df()
    except Exception:
        result = subprocess.run(
            ["duckdb", "-csv", "-c", sql],
            capture_output=True
        )

        if result.returncode != 0:
            raise RuntimeError(
                result.stderr.decode("utf-8", errors="replace")
            )

        if not result.stdout:
            return pd.DataFrame()

        return pd.read_csv(BytesIO(result.stdout))


def add_molecular_features(df):
    if df.empty:
        return df

    molecular = pd.read_csv(MOLECULAR_PATH)

    molecular_cols = [
        "drug_id",
        "molecular_weight",
        "logp",
        "tpsa",
        "hbd",
        "hba",
        "rotatable_bonds",
        "rings",
        "aromatic_rings",
        "heavy_atoms",
        "fraction_csp3",
        "formal_charge",
        "num_atoms"
    ]

    molecular = molecular[molecular_cols]

    existing_molecular = [
        c for c in molecular_cols
        if c != "drug_id" and c in df.columns
    ]

    if existing_molecular:
        df = df.drop(columns=existing_molecular)

    df = df.merge(
        molecular,
        on="drug_id",
        how="left"
    )

    descriptor_cols = [
        "molecular_weight",
        "logp",
        "tpsa",
        "hbd",
        "hba",
        "rotatable_bonds",
        "rings",
        "aromatic_rings",
        "heavy_atoms",
        "fraction_csp3",
        "formal_charge",
        "num_atoms"
    ]

    df[descriptor_cols] = (
        df[descriptor_cols]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    df["has_molecular_structure"] = (
        df["drug_id"].isin(
            set(molecular["drug_id"])
        )
    ).astype(int)

    for col in [
        "logp", "tpsa", "hbd", "hba", "rotatable_bonds", "rings",
        "aromatic_rings", "heavy_atoms", "fraction_csp3", "formal_charge", "num_atoms"
    ]:
        mol_col = f"molecular_{col}"
        if mol_col in FEATURES and mol_col not in df.columns and col in df.columns:
            df[mol_col] = df[col]

    return df


def predict(disease_id, top_k=10):
    """
    Disease -> Drug candidate prediction using production XGBoost model.
    """
    candidates = query_candidates(disease_id)

    if candidates.empty:
        return {
            "disease_id": disease_id,
            "model_version": MODEL_VERSION,
            "candidate_count": 0,
            "candidates": [],
            "message": (
                "No unlabeled candidate pairs were found for this "
                "disease in the current candidate dataset."
            )
        }

    candidates = add_molecular_features(candidates)

    missing = [
        feature
        for feature in FEATURES
        if feature not in candidates.columns
    ]

    if missing:
        raise RuntimeError(
            "Missing model features: " + ", ".join(missing)
        )

    X = (
        candidates[FEATURES]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    scores = model.predict_proba(X)[:, 1]

    candidates["score"] = scores

    candidates = (
        candidates
        .sort_values("score", ascending=False)
        .head(top_k)
    )

    output = []

    for rank, (_, row) in enumerate(
        candidates.iterrows(),
        start=1
    ):
        output.append({
            "drug_id": str(row["drug_id"]),
            "rank": rank,
            "score": round(float(row["score"]), 6),
            "score_type": "ranking_score",
            "has_molecular_structure": int(row.get("has_molecular_structure", 0)),
            "shared_targets": float(row.get("shared_targets", 0)),
            "avg_target_association": float(row.get("avg_target_association", 0)),
            "max_target_association": float(row.get("max_target_association", 0)),
            "total_target_evidence": float(row.get("total_target_evidence", 0)),
        })
    return {
        "disease_id": disease_id,
        "model_version": MODEL_VERSION,
        "candidate_count": len(output),
        "candidates": output,
        "disclaimer": (
            "These are research hypotheses generated from biomedical "
            "data. Scores are ranking scores, not probabilities of "
            "clinical efficacy or treatment recommendations. "
            "Candidates require independent evidence validation."
        )
    }


def predict_drug(drug_id, top_k=10):
    """
    Symmetric Drug -> Disease candidate prediction using the SAME production XGBoost model.
    Queries candidate diseases for a drug where label = 0, applies exact 39-feature schema,
    scores via XGBoost predict_proba, and ranks diseases descending by score.
    """
    candidates = query_disease_candidates(drug_id)

    if candidates.empty:
        return {
            "drug_id": drug_id,
            "model_version": MODEL_VERSION,
            "candidate_count": 0,
            "candidates": [],
            "message": (
                "No unlabeled candidate pairs were found for this "
                "drug in the current candidate dataset."
            )
        }

    candidates = add_molecular_features(candidates)

    missing = [
        feature
        for feature in FEATURES
        if feature not in candidates.columns
    ]

    if missing:
        raise RuntimeError(
            "Missing model features: " + ", ".join(missing)
        )

    X = (
        candidates[FEATURES]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    scores = model.predict_proba(X)[:, 1]

    candidates["score"] = scores

    candidates = (
        candidates
        .sort_values("score", ascending=False)
        .head(top_k)
    )

    output = []

    for rank, (_, row) in enumerate(
        candidates.iterrows(),
        start=1
    ):
        output.append({
            "disease_id": str(row["disease_id"]),
            "drug_id": str(row["drug_id"]),
            "rank": rank,
            "score": round(float(row["score"]), 6),
            "score_type": "ranking_score",
            "has_molecular_structure": int(row.get("has_molecular_structure", 0)),
            "shared_targets": float(row.get("shared_targets", 0)),
            "avg_target_association": float(row.get("avg_target_association", 0)),
            "max_target_association": float(row.get("max_target_association", 0)),
            "total_target_evidence": float(row.get("total_target_evidence", 0)),
        })

    return {
        "drug_id": drug_id,
        "model_version": MODEL_VERSION,
        "candidate_count": len(output),
        "candidates": output,
        "disclaimer": (
            "These are research hypotheses generated from biomedical "
            "data. Scores are ranking scores, not probabilities of "
            "clinical efficacy or treatment recommendations. "
            "Candidates require independent evidence validation."
        )
    }


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        entity_id = sys.argv[1]
        top_k = int(sys.argv[2]) if len(sys.argv) >= 3 else 10
    else:
        entity_id = "MONDO_0004989"
        top_k = 10

    if entity_id.upper().startswith("CHEMBL"):
        result = predict_drug(entity_id, top_k)
    else:
        result = predict(entity_id, top_k)

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        )
    )
