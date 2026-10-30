"""

CureNova ML Production Inference Adapter

Model: cure_nova_xgb_final.joblib

Model Version: cure-nova-xgb-final

Features: 39 biomedical and molecular features



This module provides a unified in-process interface for:

1. Loading the XGBoost production model and feature definitions

2. Querying candidate drug pairs for diseases (Disease -> Drug)

3. Querying candidate disease pairs for drugs (Drug -> Disease)

4. Scoring candidates using the trained XGBoost model

5. Enriching candidates with Open Targets biological evidence

6. Enriching candidates with ChEMBL pharmacological activity evidence

7. Executing the independent robustness stress test engine

"""



from pathlib import Path

import json

import logging

import urllib.request

from typing import Dict, Any, List, Optional



logger = logging.getLogger("curenova.ml.predictor")



ML_DIR = Path(__file__).resolve().parent

MODEL_PATH = ML_DIR / "models" / "cure_nova_xgb_final.joblib"

METADATA_PATH = ML_DIR / "models" / "cure_nova_xgb_final.json"

CHEMBL_FILE = ML_DIR / "data" / "chembl" / "chembl_drug_evidence.json"

if not CHEMBL_FILE.exists() and (Path(r"A:\CureNovaML") / "data" / "chembl" / "chembl_drug_evidence.json").exists():

    CHEMBL_FILE = Path(r"A:\CureNovaML") / "data" / "chembl" / "chembl_drug_evidence.json"



MODEL_VERSION = "cure-nova-xgb-final"



# Import runtime components

try:

    from .predict_v4 import predict as _raw_predict, predict_drug as _raw_predict_drug

    from .evidence_utils import (

        get_drug_evidence,

        get_chembl_live_evidence,

        get_combined_drug_evidence,

    )

    from .stress_test import run_stress_test

    from .evidence_ranker import EvidenceGroundedRanker

except ImportError:

    # Allow running directly as standalone script

    from predict_v4 import predict as _raw_predict, predict_drug as _raw_predict_drug

    from evidence_utils import (

        get_drug_evidence,

        get_chembl_live_evidence,

        get_combined_drug_evidence,

    )

    from stress_test import run_stress_test

    from evidence_ranker import EvidenceGroundedRanker





# Curated mapping from disease ontology IDs to standard clinical display names

_DISEASE_NAME_MAP: Dict[str, str] = {

    "MONDO_0005149": "Pulmonary Arterial Hypertension",

    "MONDO_0005575": "Colorectal Cancer",

    "MONDO_0004975": "Alzheimer's Disease & Neurodegeneration",

    "MONDO_0004989": "Breast Carcinoma",

    "MONDO_0018827": "Acute Myeloid Leukemia",

    "MONDO_0100096": "Severe COVID-19 Acute Respiratory Distress",

    "MONDO_0000508": "Major Depressive Disorder",

    "MONDO_0005180": "Parkinson's Disease",

    "MONDO_0018177": "Glioblastoma Multiforme",

    "MONDO_0005148": "Type 2 Diabetes Mellitus",

    "MONDO_0021040": "Pancreatic Neoplasm",

    "MONDO_0005070": "Neuroepitheliomatous Neoplasm / Glioma",

    "MONDO_0008383": "Rheumatoid Arthritis",

    "MONDO_0005178": "Osteoarthritis",

    "MONDO_0005101": "Coronary Artery Disease",

    "MONDO_0005059": "Chronic Myelogenous Leukemia (CML)",

    "MONDO_0004948": "Gastrointestinal Stromal Tumor (GIST)",

    "MONDO_0007254": "Atopic Dermatitis",

    "MONDO_0005062": "Metabolic Syndrome",

    "MONDO_0018078": "Non-Alcoholic Fatty Liver Disease",

    "MONDO_0005133": "Hyperglycemia / Diabetes Mellitus",

    "MONDO_0002715": "Polycystic Ovary Syndrome (PCOS)",

    "MONDO_0005192": "Diabetic Nephropathy",

    "MONDO_0010150": "Non-Small Cell Lung Carcinoma",

    "MONDO_0001187": "Gastric Adenocarcinoma",

    "MONDO_0021100": "Esophageal Neoplasm",

    "MONDO_0015686": "Systemic Sclerosis",

    "MONDO_0011382": "Tuberous Sclerosis Complex",

    "MONDO_0003778": "Renal Cell Carcinoma",

    "MONDO_0044348": "Subependymal Giant Cell Astrocytoma",

    "MONDO_0003799": "Lymphangioleiomyomatosis",

    "MONDO_0019471": "Neuroendocrine Tumor",

    "MONDO_0005015": "Diabetes Mellitus",

    "MONDO_0004979": "Asthma",

    "MONDO_0005044": "Systemic Lupus Erythematosus",

    "MONDO_0005027": "Multiple Sclerosis",

    "MONDO_0005155": "Cystic Fibrosis",

    "MONDO_0005109": "Heart Failure",

    "MONDO_0011122": "Obesity",

    "EFO_0000544": "Idiopathic Pulmonary Fibrosis",

    "EFO_0000305": "Breast Cancer",

    "EFO_0000384": "Crohn's Disease",

    "EFO_0000729": "Ulcerative Colitis",

    "HP_0001072": "Thickened skin / Cutaneous Sclerosis",

    "HP_0001250": "Seizure",

}



_DYNAMIC_DISEASE_CACHE: Dict[str, str] = {}



# Curated name-to-identifier mappings for robust inference resolution

_CURATED_NAME_TO_ONTOLOGY: Dict[str, str] = {
    "hypertension": "MONDO_0007781",
    "atherosclerosis": "MONDO_0005311",
    "copd": "MONDO_0005002",
    "chronic obstructive pulmonary disease": "MONDO_0005002",
    "epilepsy": "MONDO_0005027",
    "schizophrenia": "MONDO_0005090",
    "tuberculosis": "MONDO_0005232",
    "malaria": "MONDO_0005136",
    "hepatitis c": "MONDO_0005183",
    "chronic kidney disease": "MONDO_0005300",
    "ckd": "MONDO_0005300",
    "asthma": "MONDO_0004979",
    "heart failure": "MONDO_0005016",


    "pulmonary arterial hypertension": "MONDO_0005149",

    "pah": "MONDO_0005149",

    "colorectal cancer": "MONDO_0005575",

    "colon cancer": "MONDO_0005575",

    "alzheimer's disease": "MONDO_0004975",

    "alzheimers disease": "MONDO_0004975",

    "alzheimer's": "MONDO_0004975",

    "alzheimer": "MONDO_0004975",

    "breast cancer": "MONDO_0004989",

    "breast carcinoma": "MONDO_0004989",

    "severe covid-19 acute respiratory distress": "MONDO_0100096",

    "covid-19": "MONDO_0100096",

    "covid": "MONDO_0100096",

    "type 2 diabetes": "MONDO_0005148",

    "t2d": "MONDO_0005148",

    "parkinson's disease": "MONDO_0005180",

    "parkinson": "MONDO_0005180",

    "acute myeloid leukemia": "MONDO_0018827",

    "aml": "MONDO_0018827",

    "glioblastoma": "MONDO_0018177",

    "glioblastoma multiforme": "MONDO_0018177",

    "cystic fibrosis": "MONDO_0005155",

    "heart failure": "MONDO_0005109",

    "multiple sclerosis": "MONDO_0005027",

    "rheumatoid arthritis": "MONDO_0008383",

}



_CURATED_NAME_TO_CHEMBL: Dict[str, str] = {
    "atorvastatin": "CHEMBL1487",
    "warfarin": "CHEMBL1464",
    "clopidogrel": "CHEMBL1771",
    "amlodipine": "CHEMBL1491",
    "propranolol": "CHEMBL27",
    "doxycycline": "CHEMBL1433",
    "azithromycin": "CHEMBL417",
    "ivermectin": "CHEMBL1389",
    "fluoxetine": "CHEMBL41",
    "sertraline": "CHEMBL809",
    "levodopa": "CHEMBL1009",
    "gabapentin": "CHEMBL940",
    "rifampicin": "CHEMBL374479",
    "amoxicillin": "CHEMBL1082",
    "omeprazole": "CHEMBL1503",


    "sildenafil": "CHEMBL192",

    "viagra": "CHEMBL192",

    "revatio": "CHEMBL192",

    "aspirin": "CHEMBL25",

    "metformin": "CHEMBL1431",

    "glucophage": "CHEMBL1431",

    "everolimus": "CHEMBL1908360",

    "afinitor": "CHEMBL1908360",

    "imatinib": "CHEMBL941",

    "gleevec": "CHEMBL941",

    "glivec": "CHEMBL941",

    "tacrolimus": "CHEMBL3989887",

    "prograf": "CHEMBL3989887",

    "niclosamide": "CHEMBL1448",

    "pyrotinib": "CHEMBL3647420",

    "sirolimus": "CHEMBL413",

    "rapamycin": "CHEMBL413",

    "baricitinib": "CHEMBL3545062",

    "losartan": "CHEMBL159",

    "erlotinib": "CHEMBL1079742",

    "lapatinib": "CHEMBL1201179",

    "ribociclib": "CHEMBL3545110",

    "osimertinib": "CHEMBL3545300",

}





# Curated registry of established / approved clinical indications for benchmark compounds.

# Critical for distinguishing known clinical indications from novel repurposing hypotheses.

KNOWN_INDICATIONS_MAP: Dict[str, Dict[str, Any]] = {

    "CHEMBL1908360": {  # Everolimus

        "ontology_ids": {

            "MONDO_0011382", "MONDO_0044348", "MONDO_0003778", "MONDO_0003799",

            "MONDO_0019471", "MONDO_0004989", "EFO_0000305", "HP_0001072", "HP_0001250"

        },

        "keywords": {

            "tuberous sclerosis", "sega", "astrocytoma", "renal cell carcinoma",

            "lymphangioleiomyomatosis", "neuroendocrine", "breast carcinoma", "breast cancer", "seizure"

        }

    },

    "CHEMBL25": {  # Aspirin

        "ontology_ids": {"MONDO_0008383", "MONDO_0005178", "MONDO_0005101"},

        "keywords": {

            "rheumatoid arthritis", "osteoarthritis", "coronary artery disease",

            "myocardial infarction", "angina", "pain", "inflammation", "fever", "stroke"

        }

    },

    "CHEMBL941": {  # Imatinib

        "ontology_ids": {"MONDO_0005059", "MONDO_0004948"},

        "keywords": {

            "chronic myelogenous leukemia", "chronic myeloid leukemia", "cml",

            "gastrointestinal stromal tumor", "gist", "mastocytosis"

        }

    },

    "CHEMBL1431": {  # Metformin

        "ontology_ids": {"MONDO_0005148", "MONDO_0005062", "MONDO_0005133", "MONDO_0002715", "MONDO_0005015"},

        "keywords": {

            "type 2 diabetes", "diabetes mellitus", "metabolic syndrome",

            "hyperglycemia", "polycystic ovary syndrome", "pcos"

        }

    },

    "CHEMBL520": {  # Tacrolimus

        "ontology_ids": {"MONDO_0007254"},

        "keywords": {

            "atopic dermatitis", "eczema", "transplant rejection", "graft versus host", "gvhd"

        }

    },

    "CHEMBL2103837": {  # Lenvatinib

        "ontology_ids": {"MONDO_0003778"},

        "keywords": {

            "renal cell carcinoma", "thyroid cancer", "thyroid carcinoma",

            "hepatocellular carcinoma", "endometrial carcinoma"

        }

    },

    "CHEMBL6166": {  # Adalimumab

        "ontology_ids": {"MONDO_0008383", "EFO_0000384", "EFO_0000729"},

        "keywords": {

            "rheumatoid arthritis", "crohn's disease", "ulcerative colitis", "psoriasis", "ankylosing spondylitis"

        }

    },

    "CHEMBL53463": {  # Rituximab

        "ontology_ids": {"MONDO_0008383"},

        "keywords": {

            "non-hodgkin lymphoma", "chronic lymphocytic leukemia", "cll", "rheumatoid arthritis"

        }

    },

    "CHEMBL2105658": {  # Fingolimod

        "ontology_ids": {"MONDO_0005027"},

        "keywords": {"multiple sclerosis"}

    },

    "CHEMBL3137343": {  # Semaglutide

        "ontology_ids": {"MONDO_0005148", "MONDO_0011122"},

        "keywords": {"type 2 diabetes", "obesity", "weight loss", "weight management"}

    },

    "CHEMBL4297800": {  # Tirzepatide

        "ontology_ids": {"MONDO_0005148", "MONDO_0011122"},

        "keywords": {"type 2 diabetes", "obesity", "weight loss", "weight management"}

    },

    "CHEMBL2047871": {  # Empagliflozin

        "ontology_ids": {"MONDO_0005148", "MONDO_0005109"},

        "keywords": {"type 2 diabetes", "heart failure"}

    },

    "CHEMBL4594241": {  # Sotorasib

        "ontology_ids": {"MONDO_0010150"},

        "keywords": {"non-small cell lung cancer", "non-small cell lung carcinoma", "nsclc"}

    },

    "CHEMBL189963": {  # Palbociclib

        "ontology_ids": {"MONDO_0004989", "EFO_0000305"},

        "keywords": {"breast cancer", "breast carcinoma"}

    },

    "CHEMBL2010601": {  # Ivacaftor

        "ontology_ids": {"MONDO_0005155"},

        "keywords": {"cystic fibrosis"}

    },

}





def classify_candidate_indication(

    chembl_id: str,

    disease_id: str,

    disease_name: str,

    mechanisms: Optional[List[Dict[str, Any]]] = None,

    chembl_evidence: Optional[Dict[str, Any]] = None,

) -> Dict[str, str]:

    """

    Deterministic classification of a candidate pair into:

    1. Known Indication ("known_indication")

    2. Potential Repurposing ("potential_repurposing")

    3. Unlabeled Computational Candidate ("unlabeled_computational")

    """

    clean_chembl = (chembl_id or "").strip()

    clean_dis_id = (disease_id or "").strip()

    dis_lower = (disease_name or "").lower()



    # 1. Check known clinical indication registry

    known_entry = KNOWN_INDICATIONS_MAP.get(clean_chembl)

    if known_entry:

        if clean_dis_id and clean_dis_id in known_entry.get("ontology_ids", set()):

            return {

                "indication_status": "known_indication",

                "indication_label": "Known indication — not a novel repurposing hypothesis.",

                "is_known_indication": True,

            }

        for kw in known_entry.get("keywords", set()):

            if kw in dis_lower:

                return {

                    "indication_status": "known_indication",

                    "indication_label": "Known indication — not a novel repurposing hypothesis.",

                    "is_known_indication": True,

                }



    # 2. Check for confirmed biological targets or bioactivity

    mech_count = len(mechanisms or [])

    has_chembl_target = bool(chembl_evidence and chembl_evidence.get("strong_target_count", 0) > 0)

    has_chembl_activity = bool(chembl_evidence and chembl_evidence.get("usable_activity_count", 0) > 0)



    if mech_count > 0 or has_chembl_target:

        return {

            "indication_status": "potential_repurposing",

            "indication_label": "Potential repurposing candidate (investigational research hypothesis).",

            "is_known_indication": False,

        }



    return {

        "indication_status": "unlabeled_computational",

        "indication_label": "Unlabeled computational candidate (feature embedding similarity; mechanistic evidence unverified).",

        "is_known_indication": False,

    }





def derive_deterministic_evidence_strength(

    is_known: bool,

    mechanisms: Optional[List[Dict[str, Any]]] = None,

    chembl_evidence: Optional[Dict[str, Any]] = None,

    biological_edges_count: int = 0

) -> str:

    """

    Computes deterministic evidence strength according to biological validation levels:

    - Strong (Direct Target + Bioactivity + Clinical/Approved)

    - Moderate (Direct Target + Bioactivity)

    - Preliminary Preclinical

    - Insufficient (Computational Hypothesis Only)

    """

    chembl = chembl_evidence or {}

    max_p = chembl.get("max_pchembl")

    direct_targets = len(mechanisms or []) + chembl.get("strong_target_count", 0)



    if is_known:

        return "Strong (Direct Target + Bioactivity + Clinical/Approved)"

    if direct_targets > 0 and max_p is not None and max_p >= 7.0:

        return "Moderate (Direct Target + Bioactivity)"

    if direct_targets > 0 or (max_p is not None and max_p >= 6.0) or biological_edges_count > 0:

        return "Preliminary Preclinical"

    return "Insufficient (Computational Hypothesis Only)"





def get_disease_display_name(disease_id: str) -> str:

    """Resolves disease ontology identifier to a human-readable display name."""

    if not disease_id:

        return "Unspecified Indication"

    

    clean_id = str(disease_id).strip()

    if clean_id in _DISEASE_NAME_MAP:

        return _DISEASE_NAME_MAP[clean_id]



    if clean_id in _DYNAMIC_DISEASE_CACHE:

        return _DYNAMIC_DISEASE_CACHE[clean_id]



    # Dynamic lookup via Open Targets GraphQL

    try:

        url = "https://api.platform.opentargets.org/api/v4/graphql"

        gql = {

            "query": """

            query DiseaseName($id: String!) {

              disease(efoId: $id) {

                id

                name

              }

            }

            """,

            "variables": {"id": clean_id}

        }

        req = urllib.request.Request(

            url,

            data=json.dumps(gql).encode("utf-8"),

            headers={"Content-Type": "application/json", "User-Agent": "CureNova/2.0"}

        )

        with urllib.request.urlopen(req, timeout=1.5) as resp:

            data = json.loads(resp.read().decode("utf-8"))

            d_name = data.get("data", {}).get("disease", {}).get("name")

            if d_name:

                resolved = str(d_name).title()

                _DYNAMIC_DISEASE_CACHE[clean_id] = resolved

                return resolved

    except Exception as e:

        logger.debug("Open Targets dynamic disease name lookup skipped for %s: %s", clean_id, str(e))



    # Clean fallback: humanize identifier

    fallback = clean_id.replace("_", " ").title()

    _DYNAMIC_DISEASE_CACHE[clean_id] = fallback

    return fallback





def get_model_info() -> Dict[str, Any]:

    """Returns production model metadata and validation metrics."""

    metadata = {}

    if METADATA_PATH.exists():

        try:

            with open(METADATA_PATH, "r", encoding="utf-8") as f:

                metadata = json.load(f)

        except Exception as e:

            logger.warning("Could not read metadata JSON: %s", e)



    return {

        "model_version": MODEL_VERSION,

        "model_type": "XGBoost",

        "feature_count": len(metadata.get("features", [])) or 39,

        "features": metadata.get("features", []),

        "unseen_disease_holdout": {

            "average_precision": 0.9047,

            "roc_auc": 0.9735,

        },

        "unseen_drug_holdout": {

            "average_precision": 0.8652,

            "roc_auc": 0.9580,

        },

        "score_type": "ranking_score",

        "clinical_use": False,

        "evaluation_note": (

            "Metrics are Average Precision and ROC-AUC on held-out entities. "

            "Scores are ranking scores, not calibrated clinical probabilities."

        ),

        "disclaimer": (

            "These are research hypotheses generated from biomedical data. "

            "Scores are ranking scores, not probabilities of clinical efficacy "

            "or treatment recommendations. Candidates require independent validation."

        ),

    }





def enrich_candidate(candidate: Dict[str, Any], disease_id: str = "", disease_name: str = "") -> Dict[str, Any]:

    """

    Enriches a candidate drug (for Disease -> Drug) with:

    1. Open Targets biological evidence (mechanisms of action, targets, clinical stage)

    2. ChEMBL bioactivity evidence (pChEMBL, assays, strong targets)

    3. Indication status classification (Known Indication vs Novel Repurposing)

    4. Deterministic evidence strength level

    5. CureNova Stress Test robustness analysis

    """

    drug_id = candidate.get("drug_id", "")

    target_dis_id = disease_id or candidate.get("disease_id", "")

    target_dis_name = disease_name or candidate.get("disease_name", "")



    # 1. Open Targets evidence

    ot_evidence = get_drug_evidence(drug_id)

    candidate["evidence_refs"] = ot_evidence

    if not candidate.get("drug_name") and ot_evidence.get("drug_name"):

        candidate["drug_name"] = ot_evidence.get("drug_name")



    mechanisms = ot_evidence.get("mechanisms", [])



    # 2. ChEMBL pharmacological activity evidence

    chembl = get_chembl_live_evidence(drug_id)

    candidate["chembl_evidence"] = {

        "available": chembl.get("available", False),

        "source": chembl.get("source", "ChEMBL"),

        "source_release": chembl.get("source_release"),

        "drug_name": chembl.get("drug_name"),

        "activity_record_count": chembl.get("activity_record_count", 0),

        "usable_activity_count": chembl.get("usable_activity_count", 0),

        "target_count": chembl.get("target_count", 0),

        "strong_target_count": chembl.get("strong_target_count", 0),

        "max_pchembl": chembl.get("max_pchembl"),

        "targets": chembl.get("targets", [])[:10],

        "note": chembl.get("note"),

    }



    # 3. Indication Status Classification

    ind_class = classify_candidate_indication(

        chembl_id=drug_id,

        disease_id=target_dis_id,

        disease_name=target_dis_name,

        mechanisms=mechanisms,

        chembl_evidence=candidate["chembl_evidence"],

    )

    candidate["indication_status"] = ind_class["indication_status"]

    candidate["indication_label"] = ind_class["indication_label"]

    candidate["is_known_indication"] = ind_class["is_known_indication"]



    # 4. Deterministic Evidence Strength Level

    candidate["evidence_strength"] = derive_deterministic_evidence_strength(

        is_known=ind_class["is_known_indication"],

        mechanisms=mechanisms,

        chembl_evidence=candidate["chembl_evidence"],

    )



    # 5. Independent stress test

    stress = run_stress_test(candidate)

    candidate["stress_test"] = stress

    candidate["stress_score"] = stress.get("overall_score", 0.0)

    candidate["stress_interpretation"] = stress.get("interpretation", "")



    return candidate





def enrich_disease_candidate(

    candidate: Dict[str, Any],

    drug_id: str,

    ot_evidence: Optional[Dict[str, Any]] = None,

    chembl_evidence: Optional[Dict[str, Any]] = None,

) -> Dict[str, Any]:

    """

    Enriches a candidate disease (for Drug -> Disease) with:

    1. Human-readable disease display name

    2. Open Targets biological mechanism of action evidence

    3. ChEMBL bioactivity evidence

    4. Indication status classification (Known Indication vs Novel Repurposing)

    5. Deterministic evidence strength level

    6. CureNova Stress Test robustness analysis

    """

    disease_id = candidate.get("disease_id", "")

    disease_name = get_disease_display_name(disease_id)

    candidate["disease_name"] = disease_name



    # 1. Open Targets evidence for the drug (use pre-fetched if provided)

    ot = ot_evidence if ot_evidence is not None else get_drug_evidence(drug_id)

    candidate["evidence_refs"] = ot

    if not candidate.get("drug_name") and ot.get("drug_name"):

        candidate["drug_name"] = ot.get("drug_name")



    mechanisms = ot.get("mechanisms", [])



    # 2. ChEMBL pharmacological activity evidence (use pre-fetched if provided)

    chembl = chembl_evidence if chembl_evidence is not None else get_chembl_live_evidence(drug_id)

    candidate["chembl_evidence"] = {

        "available": chembl.get("available", False),

        "source": chembl.get("source", "ChEMBL"),

        "source_release": chembl.get("source_release"),

        "drug_name": chembl.get("drug_name"),

        "activity_record_count": chembl.get("activity_record_count", 0),

        "usable_activity_count": chembl.get("usable_activity_count", 0),

        "target_count": chembl.get("target_count", 0),

        "strong_target_count": chembl.get("strong_target_count", 0),

        "max_pchembl": chembl.get("max_pchembl"),

        "targets": chembl.get("targets", [])[:10],

        "note": chembl.get("note"),

    }



    # 3. Indication Status Classification

    ind_class = classify_candidate_indication(

        chembl_id=drug_id,

        disease_id=disease_id,

        disease_name=disease_name,

        mechanisms=mechanisms,

        chembl_evidence=candidate["chembl_evidence"],

    )

    candidate["indication_status"] = ind_class["indication_status"]

    candidate["indication_label"] = ind_class["indication_label"]

    candidate["is_known_indication"] = ind_class["is_known_indication"]



    # 4. Deterministic Evidence Strength Level

    candidate["evidence_strength"] = derive_deterministic_evidence_strength(

        is_known=ind_class["is_known_indication"],

        mechanisms=mechanisms,

        chembl_evidence=candidate["chembl_evidence"],

    )



    # 5. Independent stress test

    stress = run_stress_test(candidate)

    candidate["stress_test"] = stress

    candidate["stress_score"] = stress.get("overall_score", 0.0)

    candidate["stress_interpretation"] = stress.get("interpretation", "")



    return candidate





def predict_candidates(disease_id: str, top_k: int = 10, disease_name: str = "") -> Dict[str, Any]:

    """

    Four-Tier Execution Engine for Disease -> Drug candidate discovery:

    Tier 1: PRODUCTION_XGBOOST (feature store lookup -> XGBoost scoring)

    Tier 2: DYNAMIC_XGBOOST

    Tier 3: EVIDENCE_GROUNDED_RANKING (Open Targets associated targets & MoA)

    Tier 4: INSUFFICIENT_DATA (Honest transparent reporting)

    """

    clean_id = str(disease_id).strip()

    # Normalize name to ontology ID if needed

    if not any(clean_id.startswith(p) for p in ("MONDO_", "EFO_", "Orphanet_", "HP_", "OBA_")):

        clean_id = _CURATED_NAME_TO_ONTOLOGY.get(clean_id.lower(), clean_id)



    disp_name = disease_name or get_disease_display_name(clean_id)



    # Tier 1: Production XGBoost from feature store

    raw_res = _raw_predict(disease_id=clean_id, top_k=top_k)

    if raw_res.get("candidates"):

        raw_res["prediction_mode"] = "PRODUCTION_XGBOOST"

        raw_res["engine"] = "CureNova XGBoost Final"

        return raw_res



    # Tier 3: Evidence-Grounded Biomedical Ranking

    evidence_res = EvidenceGroundedRanker.rank_drugs_for_disease(

        disease_id=clean_id,

        disease_name=disp_name,

        top_k=top_k

    )

    if evidence_res.get("candidate_count", 0) > 0:

        return evidence_res



    # Tier 4: Insufficient data

    raw_res["prediction_mode"] = "INSUFFICIENT_DATA"

    return raw_res





def predict_disease_candidates(drug_id: str, top_k: int = 10, drug_name: str = "") -> Dict[str, Any]:

    """

    Four-Tier Execution Engine for Drug -> Disease candidate discovery:

    Tier 1: PRODUCTION_XGBOOST (feature store lookup -> XGBoost scoring)

    Tier 2: DYNAMIC_XGBOOST

    Tier 3: EVIDENCE_GROUNDED_RANKING (Open Targets clinical trials & target-disease biology)

    Tier 4: INSUFFICIENT_DATA (Honest transparent reporting)

    """

    clean_id = str(drug_id).strip()

    # Normalize drug name to ChEMBL ID if needed

    if not clean_id.upper().startswith("CHEMBL"):

        clean_id = _CURATED_NAME_TO_CHEMBL.get(clean_id.lower(), clean_id)



    # Tier 1 & 2: Production XGBoost from feature store or dynamic feature generation

    raw_res = _raw_predict_drug(drug_id=clean_id, top_k=top_k)

    if raw_res.get("candidates"):

        prov = raw_res.get("provenance", "precomputed_feature_store")

        raw_res["prediction_mode"] = "DYNAMIC_XGBOOST" if prov == "dynamic_feature_generation" else "PRODUCTION_XGBOOST"

        raw_res["engine"] = "CureNova XGBoost Final"

        raw_res["provenance"] = prov

        return raw_res



    # (Tier 3 EvidenceGroundedRanker bypassed for drug query to prevent non-ML candidate leakage)



    # Tier 4: Insufficient data

    raw_res["prediction_mode"] = "INSUFFICIENT_DATA"

    return raw_res





def predict_and_enrich(disease_id: str, top_k: int = 10, disease_name: str = "") -> Dict[str, Any]:

    """

    End-to-end ML pipeline (Disease -> Drug):

    1. Four-Tier candidate drug discovery (XGBoost / Evidence-Grounded)

    2. Open Targets & ChEMBL biological evidence enrichment

    3. Deterministic indication status classification

    4. Robustness stress test

    """

    clean_id = str(disease_id).strip()

    if not any(clean_id.startswith(p) for p in ("MONDO_", "EFO_", "Orphanet_", "HP_", "OBA_")):

        clean_id = _CURATED_NAME_TO_ONTOLOGY.get(clean_id.lower(), clean_id)



    d_name = disease_name or get_disease_display_name(clean_id)

    result = predict_candidates(disease_id=clean_id, top_k=top_k, disease_name=d_name)



    # If already evidence-grounded, candidates are pre-enriched and verified

    if result.get("prediction_mode") == "EVIDENCE_GROUNDED_RANKING":

        return result



    candidates = result.get("candidates", [])

    enriched = []

    for candidate in candidates:

        enriched.append(enrich_candidate(candidate, disease_id=clean_id, disease_name=d_name))



    result["candidates"] = enriched

    return result





def predict_drug_and_enrich(drug_id: str, top_k: int = 10, drug_name: str = "") -> Dict[str, Any]:

    """

    End-to-end symmetric ML pipeline (Drug -> Disease):

    1. Four-Tier candidate disease discovery (XGBoost / Evidence-Grounded)

    2. Disease entity label resolution

    3. Open Targets & ChEMBL biological evidence enrichment

    4. Deterministic indication status classification

    5. Robustness stress test

    """

    clean_id = str(drug_id).strip()

    if not clean_id.upper().startswith("CHEMBL"):

        clean_id = _CURATED_NAME_TO_CHEMBL.get(clean_id.lower(), clean_id)



    result = predict_disease_candidates(drug_id=clean_id, top_k=top_k, drug_name=drug_name)



    # If already evidence-grounded, candidates are pre-enriched and verified

    if result.get("prediction_mode") == "EVIDENCE_GROUNDED_RANKING":

        return result



    candidates = result.get("candidates", [])

    shared_ot = get_drug_evidence(clean_id)

    shared_chembl = get_chembl_live_evidence(clean_id)



    enriched = []

    for candidate in candidates:

        enriched.append(

            enrich_disease_candidate(

                candidate,

                drug_id=clean_id,

                ot_evidence=shared_ot,

                chembl_evidence=shared_chembl,

            )

        )



    result["candidates"] = enriched

    return result





class CureNovaMLPredictor:

    """Class wrapper for CureNova ML inference engine (both directions)."""



    version = MODEL_VERSION



    @classmethod

    def get_info(cls) -> Dict[str, Any]:

        return get_model_info()



    @classmethod

    def predict(cls, disease_id: str, top_k: int = 10, enrich: bool = True) -> Dict[str, Any]:

        """Disease -> Drug repurposing inference."""

        if enrich:

            return predict_and_enrich(disease_id=disease_id, top_k=top_k)

        return predict_candidates(disease_id=disease_id, top_k=top_k)



    @classmethod

    def predict_for_drug(cls, drug_id: str, top_k: int = 10, enrich: bool = True) -> Dict[str, Any]:

        """Drug -> Disease repurposing inference."""

        if enrich:

            return predict_drug_and_enrich(drug_id=drug_id, top_k=top_k)

        return predict_disease_candidates(drug_id=drug_id, top_k=top_k)



    @classmethod

    def stress_test(cls, candidate: Dict[str, Any]) -> Dict[str, Any]:

        return run_stress_test(candidate)





if __name__ == "__main__":

    import sys



    arg = sys.argv[1] if len(sys.argv) > 1 else "CHEMBL1908360"

    k = int(sys.argv[2]) if len(sys.argv) > 2 else 3



    if arg.upper().startswith("CHEMBL"):

        print(f"Running CureNova ML Drug -> Disease Inference for {arg} (top {k})...")

        res = predict_drug_and_enrich(arg, top_k=k)

    else:

        print(f"Running CureNova ML Disease -> Drug Inference for {arg} (top {k})...")

        res = predict_and_enrich(arg, top_k=k)



    print(json.dumps(res, indent=2, ensure_ascii=False))

# Compatibility aliases
predict_candidates_for_drug = predict_disease_candidates
predict_and_enrich_for_drug = predict_drug_and_enrich
