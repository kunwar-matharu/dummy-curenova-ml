import json
import os
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import duckdb


_LOCAL_BASE = Path(__file__).resolve().parent
BASE_DIR = _LOCAL_BASE if (_LOCAL_BASE / "data" / "open_targets" / "drug_molecule" / "00000000.parquet").exists() else Path(r"A:\CureNovaML")

MOLECULE_FILE = BASE_DIR / "data" / "open_targets" / "drug_molecule" / "00000000.parquet"
MOA_FILE = BASE_DIR / "data" / "open_targets" / "drug_mechanism_of_action" / "00000000.parquet"

CHEMBL_CACHE_FILE = BASE_DIR / "data" / "chembl" / "chembl_api_cache.json"

OPEN_TARGETS_DRUG_URL = "https://platform.opentargets.org/drug/{drug_id}"
CHEMBL_API = "https://www.ebi.ac.uk/chembl/api/data"


def _load_json(path):
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")

    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    os.replace(tmp, path)


CHEMBL_CACHE = _load_json(CHEMBL_CACHE_FILE)
_CHEMBL_MEM_CACHE = dict(CHEMBL_CACHE)
_DRUG_EVIDENCE_CACHE = {}


def _chembl_request(path, params=None):
    url = f"{CHEMBL_API}/{path}"

    if params:
        url += "?" + urlencode(params)

    request = Request(
        url,
        headers={
            "User-Agent": "CureNova/1.0 biomedical-research-platform"
        },
    )

    try:
        with urlopen(request, timeout=3.0) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, Exception):
        return None


def get_chembl_live_evidence(drug_id):
    """
    Fetch pharmacological activity evidence for a ChEMBL compound.

    This is an evidence lookup only.
    It does NOT imply efficacy, safety, or treatment suitability.
    """

    if not drug_id or not drug_id.startswith("CHEMBL"):
        return {
            "available": False,
            "source": "ChEMBL",
            "reason": "not_a_chembl_id",
        }

    # Cache hit (memory or disk)
    cached = _CHEMBL_MEM_CACHE.get(drug_id) or CHEMBL_CACHE.get(drug_id)

    if cached is not None:
        return cached

    molecule = _chembl_request(
        f"molecule/{drug_id}.json"
    )

    if molecule is None:
        res = {
            "available": False,
            "source": "ChEMBL",
            "reason": "molecule_lookup_failed_or_timeout",
        }
        _CHEMBL_MEM_CACHE[drug_id] = res
        return res

    # Fetch a bounded activity set.
    # We only need evidence summaries, not the entire ChEMBL database.
    activity_data = _chembl_request(
        "activity.json",
        {
            "molecule_chembl_id": drug_id,
            "limit": 1000,
        },
    )

    activities = []

    if activity_data:
        activities = activity_data.get("activities", [])

    usable = []

    allowed_types = {
        "IC50",
        "KI",
        "KD",
        "EC50",
        "AC50",
    }

    for a in activities:
        standard_type = str(a.get("standard_type") or "").upper()
        pchembl = a.get("pchembl_value")

        if standard_type not in allowed_types:
            continue

        if pchembl is None:
            continue

        try:
            pchembl = float(pchembl)
        except (TypeError, ValueError):
            continue

        usable.append(
            {
                "target_chembl_id": a.get("target_chembl_id"),
                "target_pref_name": a.get("target_pref_name"),
                "standard_type": standard_type,
                "pchembl_value": pchembl,
                "standard_relation": a.get("standard_relation"),
                "standard_value": a.get("standard_value"),
                "standard_units": a.get("standard_units"),
                "assay_type": a.get("assay_type"),
                "document_year": a.get("document_year"),
            }
        )

    target_groups = {}

    for row in usable:
        target_id = row.get("target_chembl_id")

        if not target_id:
            continue

        target_groups.setdefault(target_id, []).append(row)

    target_summary = []

    for target_id, rows in target_groups.items():
        values = [r["pchembl_value"] for r in rows]

        best = max(
            rows,
            key=lambda r: r["pchembl_value"]
        )

        target_summary.append(
            {
                "target_chembl_id": target_id,
                "target_name": best.get("target_pref_name"),
                "max_pchembl": round(max(values), 4),
                "median_pchembl": round(
                    sorted(values)[len(values) // 2],
                    4,
                ),
                "activity_count": len(rows),
                "strong_activity": max(values) >= 6.0,
            }
        )

    target_summary.sort(
        key=lambda x: x["max_pchembl"],
        reverse=True,
    )

    evidence = {
        "available": len(usable) > 0,
        "source": "ChEMBL",
        "source_release": "ChEMBL_37",
        "drug_id": drug_id,
        "drug_name": molecule.get("pref_name"),
        "molecule_type": molecule.get("molecule_type"),
        "activity_record_count": len(activities),
        "usable_activity_count": len(usable),
        "target_count": len(target_summary),
        "strong_target_count": sum(
            1 for x in target_summary
            if x["strong_activity"]
        ),
        "max_pchembl": (
            max(x["max_pchembl"] for x in target_summary)
            if target_summary
            else None
        ),
        "targets": target_summary[:25],
        "note": (
            "Pharmacological activity evidence from ChEMBL. "
            "This evidence does not establish clinical efficacy, "
            "clinical safety, or treatment suitability."
        ),
    }

    # Cache successful result
    _CHEMBL_MEM_CACHE[drug_id] = evidence
    CHEMBL_CACHE[drug_id] = evidence
    _save_json(CHEMBL_CACHE_FILE, CHEMBL_CACHE)

    return evidence


def get_drug_evidence(drug_id):
    """
    Open Targets evidence for a drug.
    """
    if not drug_id:
        return {
            "drug_id": drug_id,
            "sources": [],
            "drug_name": None,
            "drug_type": None,
            "maximum_clinical_stage": None,
            "mechanisms": [],
        }

    if drug_id in _DRUG_EVIDENCE_CACHE:
        return _DRUG_EVIDENCE_CACHE[drug_id]

    query = """
    SELECT
        id,
        name,
        drugType,
        maximumClinicalStage
    FROM read_parquet(?)
    WHERE id = ?
    LIMIT 1
    """

    try:
        result = duckdb.connect().execute(
            query,
            [str(MOLECULE_FILE), drug_id],
        ).fetchone()
    except Exception:
        result = None

    if result:
        _, name, drug_type, clinical_stage = result
    else:
        name = None
        drug_type = None
        clinical_stage = None

    mechanisms = []

    try:
        query_moa = """
        SELECT
            mechanismOfAction,
            actionType,
            targetName
        FROM read_parquet(?)
        WHERE list_contains(chemblIds, ?)
        LIMIT 20
        """

        rows = duckdb.connect().execute(
            query_moa,
            [str(MOA_FILE), drug_id],
        ).fetchall()

        for mechanism, action_type, target_name in rows:
            mechanisms.append(
                {
                    "mechanism": mechanism,
                    "action_type": action_type,
                    "target_name": target_name,
                }
            )

    except Exception:
        pass

    ev = {
        "drug_id": drug_id,
        "sources": [
            {
                "source": "Open Targets",
                "dataset": "drug_mechanism_of_action",
                "reference": OPEN_TARGETS_DRUG_URL.format(
                    drug_id=drug_id
                ),
            }
        ],
        "drug_name": name,
        "drug_type": drug_type,
        "maximum_clinical_stage": clinical_stage,
        "mechanisms": mechanisms,
    }
    _DRUG_EVIDENCE_CACHE[drug_id] = ev
    return ev


def get_combined_drug_evidence(drug_id):
    """
    Unified evidence object used by CureNova.

    Open Targets = biological/drug identity context.
    ChEMBL = pharmacological activity evidence.
    """

    open_targets = get_drug_evidence(drug_id)

    chembl = get_chembl_live_evidence(drug_id)

    return {
        "open_targets": open_targets,
        "chembl": chembl,
    }