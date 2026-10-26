from __future__ import annotations
import math
from typing import Any

def _num(x, default=0.0):
    try:
        if x is None: return default
        v = float(x)
        return v if math.isfinite(v) else default
    except Exception:
        return default

def _clip01(x): return max(0.0, min(1.0, _num(x)))

def _sigmoid(x):
    return 1.0 / (1.0 + math.exp(-max(-40.0, min(40.0, x))))

def _molecular_present(candidate: dict[str, Any]) -> bool:
    f = candidate.get("features") or {}
    e = candidate.get("evidence_refs") or {}
    m = candidate.get("molecular_evidence") or {}
    return bool(
    candidate.get("has_molecular_structure") or
    f.get("has_molecular_structure") or
    f.get("molecular_structure_available") or
    e.get("canonical_smiles") or e.get("inchi_key") or
    m.get("available") or m.get("canonical_smiles") or m.get("inchi_key")
)

def run_stress_test(candidate: dict[str, Any]) -> dict[str, Any]:
    f = candidate.get("features") or {}
    chem = candidate.get("chembl_evidence") or candidate.get("chembl") or {}
    ml = _clip01(candidate.get("score", 0))
    shared = _num(f.get("shared_targets"))
    avg_assoc = _num(f.get("avg_target_association"))
    max_assoc = _num(f.get("max_target_association"))
    ev = _num(f.get("total_target_evidence"))
    hc = _num(f.get("high_confidence_targets"))
    hev = _num(f.get("high_evidence_targets"))

    target_support = _clip01(shared / 3)
    association_support = _clip01(max(avg_assoc, max_assoc))
    evidence_support = _clip01(math.log1p(ev) / math.log1p(10000))
    confidence_support = _clip01(max(hc / 2, hev / 2))

    available = bool(chem.get("available"))
    activity = _num(chem.get("activity_records"))
    usable = _num(chem.get("usable_activity_records"))
    targets = _num(chem.get("target_count"))
    strong = _num(chem.get("strong_target_count"))
    pchembl = _num(chem.get("max_pchembl"))

    chembl_support = 0.0
    if available:
        chembl_support = _clip01(
            .45 * _sigmoid((pchembl - 5) / 1.5) +
            .25 * _clip01(math.log1p(usable) / math.log1p(100)) +
            .20 * _clip01(strong / 10) +
            .10 * _clip01(targets / 30)
        )

    molecular = 1.0 if _molecular_present(candidate) else 0.0
    known = bool(candidate.get("known_indication", False))
    novelty = 0.0 if known else 1.0

    penalty = 0.0
    flags = []
    if shared <= 0:
        flags.append("NO_TARGET_OVERLAP"); penalty += .06
    if max_assoc <= 0:
        flags.append("NO_TARGET_ASSOCIATION"); penalty += .04
    if ev <= 0:
        flags.append("NO_TARGET_EVIDENCE"); penalty += .04
    if molecular <= 0:
        flags.append("NO_MOLECULAR_STRUCTURE"); penalty += .04
    if available and pchembl >= 6:
        flags.append("STRONG_CHEMBL_ACTIVITY")
    if not available:
        flags.append("NO_CHEMBL_ACTIVITY_EVIDENCE")
        if ml >= .85: penalty += .08
    if ml >= .85 and shared <= 0 and not available:
        flags.append("ML_HIGH_BUT_INDEPENDENT_SUPPORT_WEAK"); penalty += .06
    flags.append("KNOWN_INDICATION" if known else "POTENTIAL_REPURPOSING_HYPOTHESIS")

    raw = (.24*ml + .16*target_support + .13*association_support +
           .10*evidence_support + .08*confidence_support +
           .20*chembl_support + .04*molecular + .05*novelty)
    score = max(0, min(100, 100*raw - 100*penalty))
    interpretation = ("HIGHER ROBUSTNESS RESEARCH HYPOTHESIS" if score >= 75
                      else "MODERATE ROBUSTNESS RESEARCH HYPOTHESIS" if score >= 50
                      else "LOW ROBUSTNESS RESEARCH HYPOTHESIS")
    return {
        "overall_score": round(score, 2),
        "score_type": "heuristic_robustness_score",
        "interpretation": interpretation,
        "components": {
            "ml_ranking_strength": round(ml,4),
            "target_support": round(target_support,4),
            "target_association_support": round(association_support,4),
            "target_evidence_support": round(evidence_support,4),
            "target_confidence_support": round(confidence_support,4),
            "chembl_pharmacology_support": round(chembl_support,4),
            "molecular_structure_support": round(molecular,4),
            "repurposing_novelty": round(novelty,4),
        },
        "chembl_stress_test": {
            "available": available,
            "activity_records": int(activity),
            "usable_activity_records": int(usable),
            "target_count": int(targets),
            "strong_target_count": int(strong),
            "max_pchembl": round(pchembl,3),
        },
        "penalty": round(penalty,4),
        "flags": flags,
        "disclaimer": "Research-hypothesis robustness assessment only. This score is not a probability of clinical efficacy, safety, treatment success, or approval."
    }
