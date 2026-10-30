"""
CureNova Disease Entity Resolver
Harmonizes disease search terms to canonical ontology terms (MONDO / EFO / MeSH)
and resolves aliases, acronyms, and common condition names.
"""

import logging
import urllib.request
import urllib.parse
import json
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from ..models.models import Disease, Drug

logger = logging.getLogger("curenova.disease_resolver")

# Curated high-confidence disease mappings for rapid resolution
# Merged dictionary preserving broad disease coverage and canonical oncology/cardiovascular targets
CURATED_DISEASE_MAPPINGS = {
    # Destination expanded disease aliases
    "epilepsy": ("Epileptic Disorder", "MONDO_0005027"),
    "epileptic disorder": ("Epileptic Disorder", "MONDO_0005027"),
    "ckd": ("Chronic Kidney Disease", "MONDO_0005300"),
    "chronic kidney disease": ("Chronic Kidney Disease", "MONDO_0005300"),
    "copd": ("Chronic Obstructive Pulmonary Disease", "MONDO_0005002"),
    "chronic obstructive pulmonary disease": ("Chronic Obstructive Pulmonary Disease", "MONDO_0005002"),
    "schizophrenia": ("Schizophrenia", "MONDO_0005090"),
    "atherosclerosis": ("Atherosclerosis", "MONDO_0005311"),
    "tuberculosis": ("Tuberculosis", "MONDO_0005232"),
    "malaria": ("Malaria", "MONDO_0005136"),
    "hepatitis c": ("Hepatitis C Infection", "MONDO_0005183"),
    "asthma": ("Asthma", "MONDO_0004979"),
    "heart failure": ("Congestive Heart Failure", "MONDO_0005016"),
    "congestive heart failure": ("Congestive Heart Failure", "MONDO_0005016"),

    # Source canonical indications and diseases
    "pulmonary arterial hypertension": ("Pulmonary Arterial Hypertension", "MONDO_0005149"),
    "pulmonary hypertension": ("Pulmonary Arterial Hypertension", "MONDO_0005149"),
    "hypertension": ("Essential Hypertension", "MONDO_0000839"),
    "essential hypertension": ("Essential Hypertension", "MONDO_0000839"),
    "pah": ("Pulmonary Arterial Hypertension", "MONDO_0005149"),

    "colorectal cancer": ("Colorectal Cancer", "MONDO_0005575"),
    "colon cancer": ("Colorectal Cancer", "MONDO_0005575"),
    "rectal cancer": ("Colorectal Cancer", "MONDO_0005575"),

    "alzheimer's disease": ("Alzheimer's Disease & Neurodegeneration", "MONDO_0004975"),
    "alzheimers disease": ("Alzheimer's Disease & Neurodegeneration", "MONDO_0004975"),
    "alzheimer's": ("Alzheimer's Disease & Neurodegeneration", "MONDO_0004975"),
    "alzheimer": ("Alzheimer's Disease & Neurodegeneration", "MONDO_0004975"),
    "alzheimer's disease & neurodegeneration": ("Alzheimer's Disease & Neurodegeneration", "MONDO_0004975"),

    "breast cancer": ("Breast Carcinoma", "MONDO_0004989"),
    "breast carcinoma": ("Breast Carcinoma", "MONDO_0004989"),

    "severe covid-19 acute respiratory distress": ("Severe COVID-19 Acute Respiratory Distress", "MONDO_0100096"),
    "covid-19": ("Severe COVID-19 Acute Respiratory Distress", "MONDO_0100096"),
    "covid": ("Severe COVID-19 Acute Respiratory Distress", "MONDO_0100096"),

    "treatment-resistant depression": ("Treatment-Resistant Depression", "MONDO_0000508"),
    "depression": ("Major Depressive Disorder", "MONDO_0000508"),
    "major depressive disorder": ("Major Depressive Disorder", "MONDO_0000508"),

    "parkinson's disease": ("Parkinson's Disease", "MONDO_0005180"),
    "parkinsons disease": ("Parkinson's Disease", "MONDO_0005180"),
    "parkinson's": ("Parkinson's Disease", "MONDO_0005180"),
    "parkinson": ("Parkinson's Disease", "MONDO_0005180"),

    "glioblastoma multiforme": ("Glioblastoma Multiforme", "MONDO_0018177"),
    "glioblastoma": ("Glioblastoma Multiforme", "MONDO_0018177"),
    "gbm": ("Glioblastoma Multiforme", "MONDO_0018177"),

    "type 2 diabetes": ("Type 2 Diabetes Mellitus", "MONDO_0005148"),
    "type 2 diabetes mellitus": ("Type 2 Diabetes Mellitus", "MONDO_0005148"),
    "diabetes": ("Type 2 Diabetes Mellitus", "MONDO_0005148"),
    "diabetic nephropathy": ("Diabetic Nephropathy", "MONDO_0005148"),

    "pancreatic cancer": ("Pancreatic Neoplasm", "MONDO_0021040"),
    "pancreatic neoplasm": ("Pancreatic Neoplasm", "MONDO_0021040"),

    "acute myeloid leukemia": ("Acute Myeloid Leukemia", "MONDO_0018827"),
    "aml": ("Acute Myeloid Leukemia", "MONDO_0018827"),

    "rheumatoid arthritis": ("Rheumatoid Arthritis", "MONDO_0008383"),
    "systemic lupus erythematosus": ("Systemic Lupus Erythematosus", "MONDO_0007915"),
    "lupus": ("Systemic Lupus Erythematosus", "MONDO_0007915"),
    "multiple sclerosis": ("Multiple Sclerosis", "MONDO_0005301"),
    "idiopathic pulmonary fibrosis": ("Idiopathic Pulmonary Fibrosis", "MONDO_0008345"),
    "ipf": ("Idiopathic Pulmonary Fibrosis", "MONDO_0008345"),
}


class DiseaseResolver:
    """
    Standardized disease resolution utility.
    Resolves raw user query strings to canonical ontology terms (MONDO / EFO / MeSH)
    using curated mappings, local database records, and Open Targets Platform lookup.
    """

    @classmethod
    def resolve_disease(
        cls,
        query: str,
        db: Optional[Session] = None
    ) -> Tuple[Optional[str], Optional[str], Optional[Disease]]:
        """
        Resolves a user-provided disease search term to:
        (canonical_name, ontology_id, db_disease_object)

        Returns (None, None, None) if completely unresolvable.
        """
        if not query or not query.strip():
            return None, None, None

        clean_query = query.strip()
        lower_query = clean_query.lower()

        # 1. Exact match in curated mappings
        if lower_query in CURATED_DISEASE_MAPPINGS:
            canonical, onto_id = CURATED_DISEASE_MAPPINGS[lower_query]
            return canonical, onto_id, None

        # 2. Substring match with minimum-length guardrail (>=4 chars) to prevent false positives
        for key, (canonical, onto_id) in CURATED_DISEASE_MAPPINGS.items():
            if len(key) >= 4 and key in lower_query:
                return canonical, onto_id, None
            if len(lower_query) >= 4 and lower_query in key:
                return canonical, onto_id, None

        # 3. Check local database Disease records if session provided
        if db is not None:
            db_disease = db.query(Disease).filter(Disease.name.ilike(clean_query)).first()
            if not db_disease and len(clean_query) >= 4:
                db_disease = db.query(Disease).filter(Disease.name.ilike(f"%{clean_query}%")).first()
            if db_disease:
                onto_id = db_disease.mesh_id or f"DISEASE_{db_disease.id}"
                return db_disease.name, onto_id, db_disease

        # 4. Fallback to Open Targets Platform GraphQL API lookup
        ot_name, ot_id = cls._query_opentargets_api(clean_query)
        if ot_name and ot_id:
            return ot_name, ot_id, None

        return None, None, None

    @classmethod
    def resolve_drug(
        cls,
        query: str,
        db: Optional[Session] = None
    ) -> Tuple[Optional[str], Optional[str], Optional[Drug]]:
        """
        Resolves query as small molecule drug or compound identifier.
        Delegates to DrugResolver if present, with curated mappings and DB checks.
        """
        from .drug_resolver import DrugResolver
        return DrugResolver.resolve_drug(query=query, db=db)

    @classmethod
    def _query_opentargets_api(cls, query_term: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Performs lightweight search query against Open Targets Platform.
        Timeout-bounded to avoid delaying the response.
        """
        graphql_endpoint = "https://api.platform.opentargets.org/api/v4/graphql"
        query_str = """
        query SearchDisease($queryString: String!) {
          search(queryString: $queryString, entityNames: ["disease"], page: {size: 3, index: 0}) {
            hits {
              id
              name
              entity
            }
          }
        }
        """
        payload = json.dumps({"query": query_str, "variables": {"queryString": query_term}}).encode("utf-8")
        headers = {"Content-Type": "application/json", "User-Agent": "CureNova/2.0"}

        try:
            req = urllib.request.Request(graphql_endpoint, data=payload, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                hits = data.get("data", {}).get("search", {}).get("hits", [])
                if hits:
                    best = hits[0]
                    return best.get("name"), best.get("id")
        except Exception as exc:
            logger.debug("Open Targets live query skipped for '%s': %s", query_term, str(exc))

        return None, None
