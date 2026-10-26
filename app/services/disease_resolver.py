"""
Disease Ontology Resolver Service
Normalizes natural-language disease queries and clinical condition terms into
standard Open Targets Platform ontology identifiers (MONDO, EFO, Orphanet).
"""

import json
import logging
import re
import urllib.request
import urllib.parse
from typing import Optional, Tuple, Dict
from sqlalchemy.orm import Session
from ..models.models import Disease

logger = logging.getLogger("curenova.disease_resolver")

# Verified curated mappings between common query terms and Open Targets ontology IDs
CURATED_DISEASE_MAPPINGS: Dict[str, Tuple[str, str]] = {
    # Key query pattern (lower): (Canonical Name, Open Targets Ontology ID)
    "pulmonary arterial hypertension": ("Pulmonary Arterial Hypertension", "MONDO_0005149"),
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
    "parkinson's disease": ("Parkinson's Disease", "MONDO_0005180"),
    "parkinson": ("Parkinson's Disease", "MONDO_0005180"),
    "glioblastoma multiforme": ("Glioblastoma Multiforme", "MONDO_0018177"),
    "glioblastoma": ("Glioblastoma Multiforme", "MONDO_0018177"),
    "type 2 diabetes": ("Type 2 Diabetes Mellitus", "MONDO_0005148"),
    "diabetic nephropathy": ("Diabetic Nephropathy", "MONDO_0005148"),
    "pancreatic cancer": ("Pancreatic Neoplasm", "MONDO_0021040"),
    "pancreatic neoplasm": ("Pancreatic Neoplasm", "MONDO_0021040"),
    "acute myeloid leukemia": ("Acute Myeloid Leukemia", "MONDO_0018827"),
    "aml": ("Acute Myeloid Leukemia", "MONDO_0018827"),
}

ONTOLOGY_PREFIXES = ("MONDO_", "EFO_", "Orphanet_", "HP_", "OBA_")


class DiseaseResolver:
    """
    Resolves disease queries to Open Targets-compatible ontology IDs.
    Preserves existing database entity records where available.
    """

    @classmethod
    def resolve_disease(
        cls,
        query: str,
        db: Optional[Session] = None
    ) -> Tuple[str, Optional[str], Optional[Disease]]:
        """
        Resolves a user query into (resolved_display_name, ontology_id, db_disease_or_none).

        Returns:
            resolved_name: Human-readable disease name
            ontology_id: Open Targets ontology ID (e.g. 'MONDO_0004989') or None if unresolvable
            db_disease: SQLAlchemy Disease model instance if found in DB, else None
        """
        clean_query = query.strip()
        lower_query = clean_query.lower()

        # 1. Direct ontology identifier pass-through
        for prefix in ONTOLOGY_PREFIXES:
            if clean_query.startswith(prefix):
                db_disease = None
                if db:
                    db_disease = db.query(Disease).filter(
                        (Disease.mesh_id == clean_query) | (Disease.name.ilike(f"%{clean_query}%"))
                    ).first()
                display_name = db_disease.name if db_disease else clean_query
                return display_name, clean_query, db_disease

        # 2. Check curated dictionary for exact or partial match
        if lower_query in CURATED_DISEASE_MAPPINGS:
            name, ont_id = CURATED_DISEASE_MAPPINGS[lower_query]
            db_disease = None
            if db:
                db_disease = db.query(Disease).filter(Disease.name.ilike(f"%{name}%")).first()
            return name, ont_id, db_disease

        for key, (name, ont_id) in CURATED_DISEASE_MAPPINGS.items():
            if key in lower_query or lower_query in key:
                db_disease = None
                if db:
                    db_disease = db.query(Disease).filter(Disease.name.ilike(f"%{name}%")).first()
                return name, ont_id, db_disease

        # 3. Check existing database diseases
        db_disease = None
        if db:
            db_disease = db.query(Disease).filter(Disease.name.ilike(f"%{clean_query}%")).first()
            if db_disease:
                # Check if database disease name matches our mapping
                d_name_lower = db_disease.name.lower()
                for key, (name, ont_id) in CURATED_DISEASE_MAPPINGS.items():
                    if key in d_name_lower or d_name_lower in key:
                        return db_disease.name, ont_id, db_disease

        # 4. Dynamic Open Targets GraphQL lookup (live resolution)
        dynamic_id, dynamic_name = cls._query_opentargets_api(clean_query)
        if dynamic_id:
            logger.info("Dynamically resolved query '%s' to %s (%s)", clean_query, dynamic_id, dynamic_name)
            return dynamic_name or clean_query, dynamic_id, db_disease

        # 5. Resolution failed: return display name with None ontology ID
        # DO NOT invent an ontology ID
        fallback_name = db_disease.name if db_disease else clean_query
        return fallback_name, None, db_disease

    @classmethod
    def _query_opentargets_api(cls, query_string: str) -> Tuple[Optional[str], Optional[str]]:
        """Queries official Open Targets Platform API to find best disease match."""
        url = "https://api.platform.opentargets.org/api/v4/graphql"
        gql = {
            "query": """
            query SearchDisease($queryString: String!) {
              search(queryString: $queryString, entityNames: ["disease"], page: {index: 0, size: 1}) {
                hits {
                  id
                  name
                  entity
                }
              }
            }
            """,
            "variables": {"queryString": query_string}
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(gql).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "CureNova/2.0 biomedical-research-platform"
                }
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                hits = data.get("data", {}).get("search", {}).get("hits", [])
                if hits:
                    first = hits[0]
                    return first.get("id"), first.get("name")
        except Exception as e:
            logger.debug("Open Targets dynamic disease lookup skipped for '%s': %s", query_string, str(e))

        return None, None
