"""
Drug Entity Resolver Service
Normalizes natural-language drug and compound queries into canonical ChEMBL identifiers.
Integrates curated drug dictionaries, SQLite registered drugs, local Open Targets molecule records,
and Open Targets GraphQL drug search.
"""

import json
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Tuple, Dict
from sqlalchemy.orm import Session
from ..models.models import Drug

logger = logging.getLogger("curenova.drug_resolver")

# Verified curated mappings between common drug names/synonyms and canonical ChEMBL IDs
CURATED_DRUG_MAPPINGS: Dict[str, Tuple[str, str]] = {
    "atorvastatin": ("Atorvastatin", "CHEMBL1487"),
    "warfarin": ("Warfarin", "CHEMBL1464"),
    "clopidogrel": ("Clopidogrel", "CHEMBL1771"),
    "amlodipine": ("Amlodipine", "CHEMBL1491"),
    "propranolol": ("Propranolol", "CHEMBL27"),
    "doxycycline": ("Doxycycline", "CHEMBL1433"),
    "azithromycin": ("Azithromycin", "CHEMBL417"),
    "ivermectin": ("Ivermectin", "CHEMBL1389"),
    "fluoxetine": ("Fluoxetine", "CHEMBL41"),
    "sertraline": ("Sertraline", "CHEMBL809"),
    "levodopa": ("Levodopa", "CHEMBL1009"),
    "gabapentin": ("Gabapentin", "CHEMBL940"),
    "rifampicin": ("Rifampicin", "CHEMBL374479"),
    "amoxicillin": ("Amoxicillin", "CHEMBL1082"),
    "omeprazole": ("Omeprazole", "CHEMBL1503"),
    # Key query pattern (lower): (Canonical Name, ChEMBL ID)
    "everolimus": ("EVEROLIMUS", "CHEMBL1908360"),
    "afinitor": ("EVEROLIMUS", "CHEMBL1908360"),
    "zortress": ("EVEROLIMUS", "CHEMBL1908360"),
    "rad001": ("EVEROLIMUS", "CHEMBL1908360"),
    "aspirin": ("Aspirin", "CHEMBL25"),
    "acetylsalicylic acid": ("Aspirin", "CHEMBL25"),
    "asa": ("Aspirin", "CHEMBL25"),
    "imatinib": ("Imatinib", "CHEMBL941"),
    "gleevec": ("Imatinib", "CHEMBL941"),
    "glivec": ("Imatinib", "CHEMBL941"),
    "sti-571": ("Imatinib", "CHEMBL941"),
    "pyrotinib": ("Pyrotinib", "CHEMBL3647420"),
    "shr-1258": ("Pyrotinib", "CHEMBL3647420"),
    "tacrolimus": ("Tacrolimus", "CHEMBL3989887"),
    "fk506": ("Tacrolimus", "CHEMBL3989887"),
    "prograf": ("Tacrolimus", "CHEMBL3989887"),
    "metformin": ("Metformin", "CHEMBL1431"),
    "glucophage": ("Metformin", "CHEMBL1431"),
    "niclosamide": ("Niclosamide", "CHEMBL1448"),
    "niclocide": ("Niclosamide", "CHEMBL1448"),
    "baricitinib": ("Baricitinib", "CHEMBL3545062"),
    "olumiant": ("Baricitinib", "CHEMBL3545062"),
    "sildenafil": ("Sildenafil", "CHEMBL192"),
    "viagra": ("Sildenafil", "CHEMBL192"),
    "revatio": ("Sildenafil", "CHEMBL192"),
    "sirolimus": ("Sirolimus", "CHEMBL413"),
    "rapamycin": ("Sirolimus", "CHEMBL413"),
    "ketamine": ("Ketamine", "CHEMBL744"),
    "losartan": ("Losartan", "CHEMBL159"),
    "cozaar": ("Losartan", "CHEMBL159"),
    "candesartan": ("Candesartan", "CHEMBL1016"),
    "telmisartan": ("Telmisartan", "CHEMBL1017"),
    "micardis": ("Telmisartan", "CHEMBL1017"),
    "erlotinib": ("Erlotinib", "CHEMBL1079742"),
    "tarceva": ("Erlotinib", "CHEMBL1079742"),
    "lapatinib": ("Lapatinib", "CHEMBL1201179"),
    "tykerb": ("Lapatinib", "CHEMBL1201179"),
    "hydroxyurea": ("Hydroxyurea", "CHEMBL467"),
    "hydrea": ("Hydroxyurea", "CHEMBL467"),
    "ribociclib": ("Ribociclib", "CHEMBL3545110"),
    "kisqali": ("Ribociclib", "CHEMBL3545110"),
    "docetaxel": ("Docetaxel", "CHEMBL3545252"),
    "taxotere": ("Docetaxel", "CHEMBL3545252"),
    "neratinib": ("Neratinib", "CHEMBL180022"),
    "nerlynx": ("Neratinib", "CHEMBL180022"),
    "dabrafenib": ("Dabrafenib", "CHEMBL2105729"),
    "tafinlar": ("Dabrafenib", "CHEMBL2105729"),
    "azacitidine": ("Azacitidine", "CHEMBL1489"),
    "vidaza": ("Azacitidine", "CHEMBL1489"),
    "decitabine": ("Decitabine", "CHEMBL1201129"),
    "dacogen": ("Decitabine", "CHEMBL1201129"),
    "cytarabine": ("Cytarabine", "CHEMBL803"),
    "gemcitabine": ("Gemcitabine", "CHEMBL1637"),
    "gemzar": ("Gemcitabine", "CHEMBL1637"),
    "ribavirin": ("Ribavirin", "CHEMBL1643"),
    "prednisolone": ("Prednisolone", "CHEMBL131"),
    "betamethasone": ("Betamethasone", "CHEMBL632"),
    "regorafenib": ("Regorafenib", "CHEMBL1946170"),
    "stivarga": ("Regorafenib", "CHEMBL1946170"),
    "vardenafil": ("Vardenafil", "CHEMBL1339"),
    "levitra": ("Vardenafil", "CHEMBL1339"),
    "avanafil": ("Avanafil", "CHEMBL1963681"),
    "stendra": ("Avanafil", "CHEMBL1963681"),
    "darusentan": ("Darusentan", "CHEMBL23261"),
    "temsirolimus": ("Temsirolimus", "CHEMBL1201182"),
    "torisel": ("Temsirolimus", "CHEMBL1201182"),
    "famitinib": ("Famitinib", "CHEMBL1278146"),
    "gisadenafil": ("Gisadenafil", "CHEMBL1928262"),
    "isosorbide mononitrate": ("Isosorbide Mononitrate", "CHEMBL1311"),
    "imdur": ("Isosorbide Mononitrate", "CHEMBL1311"),
    "pimecrolimus": ("Pimecrolimus", "CHEMBL1200686"),
    "elidel": ("Pimecrolimus", "CHEMBL1200686"),
}

# Resolve local molecule parquet file path
_APP_DIR = Path(__file__).resolve().parent.parent
_ML_DIR = _APP_DIR.parent / "ml"
_MOL_PARQUET = _ML_DIR / "data" / "open_targets" / "drug_molecule" / "00000000.parquet"
if not _MOL_PARQUET.exists() and (Path(r"A:\CureNovaML") / "data" / "open_targets" / "drug_molecule" / "00000000.parquet").exists():
    _MOL_PARQUET = Path(r"A:\CureNovaML") / "data" / "open_targets" / "drug_molecule" / "00000000.parquet"


class DrugResolver:
    """
    Resolves natural-language drug terms to canonical ChEMBL IDs.
    Never misclassifies drugs as diseases or queries disease ontologies.
    """

    @classmethod
    def resolve_drug(
        cls,
        query: str,
        db: Optional[Session] = None
    ) -> Tuple[str, Optional[str], Optional[Drug]]:
        """
        Resolves a user query into (resolved_display_name, chembl_id, db_drug_or_none).

        Returns:
            resolved_name: Canonical drug display name
            chembl_id: ChEMBL identifier (e.g. 'CHEMBL1908360') or None if unresolvable
            db_drug: SQLAlchemy Drug model instance if found in DB, else None
        """
        clean_query = query.strip()
        lower_query = clean_query.lower()

        # 1. Direct ChEMBL identifier pass-through
        if clean_query.upper().startswith("CHEMBL"):
            chembl_clean = clean_query.upper()
            db_drug = None
            if db:
                db_drug = db.query(Drug).filter(Drug.chembl_id == chembl_clean).first()
            display_name = db_drug.name if db_drug else chembl_clean
            return display_name, chembl_clean, db_drug

        # 2. Check curated dictionary for exact match
        if lower_query in CURATED_DRUG_MAPPINGS:
            name, chembl_id = CURATED_DRUG_MAPPINGS[lower_query]
            db_drug = None
            if db:
                db_drug = db.query(Drug).filter(
                    (Drug.chembl_id == chembl_id) | (Drug.name.ilike(name))
                ).first()
            return name, chembl_id, db_drug

        # 3. Check existing database drugs
        db_drug = None
        if db:
            db_drug = db.query(Drug).filter(Drug.name.ilike(clean_query)).first()
            if db_drug and db_drug.chembl_id:
                return db_drug.name, db_drug.chembl_id, db_drug

        # 4. Check curated dictionary for substring/partial match
        for key, (name, chembl_id) in CURATED_DRUG_MAPPINGS.items():
            if key == lower_query or (len(key) > 3 and key in lower_query):
                db_drug = None
                if db:
                    db_drug = db.query(Drug).filter(Drug.chembl_id == chembl_id).first()
                return name, chembl_id, db_drug

        # 5. Local Open Targets drug molecule parquet scan via DuckDB
        if _MOL_PARQUET.exists():
            try:
                import duckdb
                safe_q = clean_query.replace("'", "''")
                sql = f"""
                SELECT id, name
                FROM read_parquet('{_MOL_PARQUET.as_posix()}')
                WHERE lower(name) = lower('{safe_q}')
                LIMIT 1
                """
                res = duckdb.connect().execute(sql).fetchall()
                if res and res[0][0] and str(res[0][0]).startswith("CHEMBL"):
                    c_id = str(res[0][0])
                    d_name = str(res[0][1]).title() if res[0][1] else clean_query
                    logger.info("Resolved query '%s' to drug %s (%s) via local molecule parquet", clean_query, c_id, d_name)
                    return d_name, c_id, db_drug
            except Exception as e:
                logger.debug("Local molecule parquet lookup failed for '%s': %s", clean_query, str(e))

        # 6. Dynamic Open Targets GraphQL lookup (STRICTLY entityNames: ["drug"])
        dynamic_id, dynamic_name = cls._query_opentargets_drug_api(clean_query)
        if dynamic_id and dynamic_id.startswith("CHEMBL"):
            logger.info("Dynamically resolved query '%s' to drug %s (%s) via Open Targets API", clean_query, dynamic_id, dynamic_name)
            return dynamic_name or clean_query, dynamic_id, db_drug

        # 7. Unresolvable drug: return display name with None identifier
        # NEVER invent an identifier or pass to DiseaseResolver
        fallback_name = db_drug.name if db_drug else clean_query
        return fallback_name, None, db_drug

    @classmethod
    def _query_opentargets_drug_api(cls, query_string: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Queries official Open Targets Platform API to find best drug match.
        STRICTLY queries entityNames: ["drug"] to guarantee no disease is returned.
        """
        url = "https://api.platform.opentargets.org/api/v4/graphql"
        gql = {
            "query": """
            query SearchDrug($queryString: String!) {
              search(queryString: $queryString, entityNames: ["drug"], page: {index: 0, size: 1}) {
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
                    if first.get("entity") == "drug":
                        hit_name = first.get("name") or ""
                        q_lower = query_string.strip().lower()
                        h_lower = hit_name.strip().lower()
                        q_words = set(q_lower.split())
                        h_words = set(h_lower.split())
                        if h_lower == q_lower or q_lower in h_lower or h_lower in q_lower or (q_words & h_words):
                            return first.get("id"), first.get("name")
        except Exception as e:
            logger.debug("Open Targets dynamic drug lookup skipped for '%s': %s", query_string, str(e))

        return None, None
