import React from 'react';
import {
  X,
  Dna,
  Layers,
  Activity,
  Target,
  FileText,
  AlertTriangle,
  ExternalLink,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

export const DrugSimilarityDetailModal = ({
  isOpen,
  onClose,
  inputDrug,
  candidate,
  onInspectGraph
}) => {
  if (!isOpen || !candidate) return null;

  const scorePct = Math.round((candidate.similarity_score || 0) * 100);
  const molPct = candidate.molecular_similarity != null ? Math.round(candidate.molecular_similarity * 100) : null;
  const tgtPct = candidate.target_similarity != null ? Math.round(candidate.target_similarity * 100) : null;
  const moaPct = candidate.mechanism_similarity != null ? Math.round(candidate.mechanism_similarity * 100) : null;
  const indPct = candidate.indication_similarity != null ? Math.round(candidate.indication_similarity * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-overlay)] overflow-hidden border border-[var(--color-border-strong)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-[#38BDF8]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Drug Similarity Inspector: {candidate.drug_name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20">
                  {candidate.chembl_id}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                Comparison target: <strong className="text-[var(--color-text-primary)]">{inputDrug}</strong> · Alternative Discovery Dossier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onInspectGraph && (
              <Button
                variant="secondary"
                size="sm"
                icon={Share2}
                onClick={() => onInspectGraph(candidate)}
              >
                View Subgraph
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-left">

          {/* Section A — Drug Similarity Overview */}
          <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Section A · Overall Multi-Factor Similarity
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-extrabold text-[var(--color-text-primary)]">
                    {scorePct}%
                  </span>
                  <div className="text-xs">
                    <span className="font-bold text-[#0284C7] dark:text-[#38BDF8]">
                      Drug Similarity Score: {candidate.similarity_score}
                    </span>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Scale 0.0 - 1.0 (Composite of available molecular, target, MoA, and indication signals)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                  candidate.evidence_level === 'Strong'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : candidate.evidence_level === 'Moderate'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}>
                  Evidence: {candidate.evidence_level}
                </span>

                <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                  {candidate.alternative_status_label}
                </span>
              </div>
            </div>

            {/* Component Signals Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="p-2 rounded-lg bg-[var(--color-surface-card)] text-center">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Molecular</span>
                <span className="text-xs font-bold font-mono">{molPct !== null ? `${molPct}%` : 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--color-surface-card)] text-center">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Target Overlap</span>
                <span className="text-xs font-bold font-mono">{tgtPct !== null ? `${tgtPct}%` : 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--color-surface-card)] text-center">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Mechanism</span>
                <span className="text-xs font-bold font-mono">{moaPct !== null ? `${moaPct}%` : 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--color-surface-card)] text-center">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Indication</span>
                <span className="text-xs font-bold font-mono">{indPct !== null ? `${indPct}%` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section B — Molecular Similarity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-[#0284C7]" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                Section B · Chemical & Molecular Structure Similarity
              </h4>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs space-y-2">
              {candidate.molecular_similarity !== null ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">RDKit Morgan Fingerprint (radius=2, 1024-bit) Tanimoto:</span>
                    <strong className="font-mono text-sm text-[var(--color-text-primary)]">{candidate.molecular_similarity}</strong>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Structural scaffold comparison between {inputDrug} and {candidate.drug_name}. Higher Tanimoto coefficients indicate conserved functional chemical groups.
                  </p>
                </>
              ) : (
                <p className="text-[var(--color-text-muted)] italic">
                  Molecular similarity unavailable (canonical SMILES not indexed for one or both compounds).
                </p>
              )}
            </div>
          </div>

          {/* Section C — Shared Targets */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                Section C · Shared Biological Targets ({candidate.shared_targets?.length || 0})
              </h4>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs space-y-2">
              {candidate.shared_targets?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.shared_targets.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px]">
                      {t.target_name || t.target_id || t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)] italic">
                  No direct shared target genes identified in current curated mapping.
                </p>
              )}
            </div>
          </div>

          {/* Section D — Shared Mechanism of Action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                Section D · Mechanism of Action (MoA) Convergence
              </h4>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Open Targets Mechanism Convergence Score:</span>
                <strong className="font-mono text-sm text-[var(--color-text-primary)]">{candidate.mechanism_similarity ?? 'N/A'}</strong>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Evaluates shared pharmacological mode of action, biochemical pathway inhibition, and target family behavior.
              </p>
            </div>
          </div>

          {/* Section E — Shared Therapeutic Indications */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                Section E · Shared Established Indications ({candidate.shared_indications?.length || 0})
              </h4>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs space-y-2">
              {candidate.shared_indications?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.shared_indications.map((ind, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[11px]">
                      {ind}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)] italic">
                  No overlapping FDA/EMA approved indications recorded in feature store.
                </p>
              )}
            </div>
          </div>

          {/* Section F — Biomedical Evidence Provenance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                Section F · ChEMBL & Open Targets Evidence Provenance
              </h4>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">ChEMBL Identifier:</span>
                <span>{candidate.chembl_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Clinical Stage:</span>
                <span>{candidate.clinical_stage || candidate.approval_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Bioactivity Evidence:</span>
                <span>{candidate.bioactivity_similarity ? 'Pharmacological target assay data available' : 'Inferred from target profile'}</span>
              </div>
            </div>
          </div>

          {/* Section G — Scientific Interpretation & Clinical Safety Boundary */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2.5 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Section G · Scientific Interpretation & Clinical Safety Boundary</span>
            </div>

            <p className="leading-relaxed">
              <strong>Rationale: </strong>{candidate.scientific_rationale}
            </p>

            <div className="p-2.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/40 text-[11px] leading-relaxed">
              <strong>CRITICAL CLINICAL BOUNDARY: </strong>
              Similarity does NOT establish clinical interchangeability, equivalent dosing, equivalent efficacy, or prescription substitution. High similarity indicates shared molecular or mechanistic features warranting preclinical research, not interchangeable medical therapy.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
            CureNova Multi-Factor Similarity Engine v2.5
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>

      </div>
    </div>
  );
};

export default DrugSimilarityDetailModal;

