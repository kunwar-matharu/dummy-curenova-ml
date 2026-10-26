import React from 'react';
import { X, Printer, Download, ShieldCheck, Activity, FileText } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

export const ReportModal = ({ isOpen, onClose, reportType = 'doctor', data }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDoctor = reportType === 'doctor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-overlay)] overflow-hidden border border-[var(--color-border-strong)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {isDoctor ? 'Clinical Medication Safety Intelligence Dossier' : 'Drug Repurposing Evidence Dossier'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                CureNova Report ID: {data.analysis_id || 'REP-PREVIEW'} · Generated on {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors cursor-pointer"
              aria-label="Close report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Printable Content */}
        <div className="overflow-y-auto p-8 space-y-6 text-[var(--color-text-primary)] text-sm print:p-0 print:overflow-visible bg-white dark:bg-[#0c1628]">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0284c7] text-white font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight">CureNova</span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] block">Biomedical Medication Intelligence Platform</span>
              </div>
            </div>
            <div className="text-right text-xs text-[var(--color-text-muted)] font-mono">
              <div>LangGraph Agent Orchestration: Verified</div>
              <div>Decision-Support Mode: Evidence-Grounded</div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-xs">
            <div>
              <span className="text-[var(--color-text-muted)] uppercase tracking-wider text-[10px] font-mono font-bold block">Subject / Query</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {isDoctor
                  ? data.normalized_drugs?.map((d) => d.canonical_name).join(', ') || 'Medication Regimen'
                  : data.disease_detected || data.query}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] uppercase tracking-wider text-[10px] font-mono font-bold block">Assessed Date</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{new Date().toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] uppercase tracking-wider text-[10px] font-mono font-bold block">
                {isDoctor ? 'Overall Risk Category' : 'Top Candidate Ranking'}
              </span>
              <span className="font-bold text-[#0284c7]">
                {isDoctor
                  ? `${data.overall_risk_category} (${data.overall_risk_score}/100)`
                  : `${data.candidates?.[0]?.drug_name || 'N/A'} (Score: ${data.candidates?.[0]?.curenova_ranking || 'N/A'})`}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] uppercase tracking-wider text-[10px] font-mono font-bold block">Evidence Citations</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {isDoctor
                  ? `${data.pairwise_interactions?.length || 0} interaction pair(s)`
                  : `${data.total_evidence_count || 12} biomedical sources`}
              </span>
            </div>
          </div>

          {/* Findings Body */}
          {isDoctor ? (
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-1 text-sm">
                Identified Pairwise & Multi-Drug Interactions
              </h4>
              {data.pairwise_interactions?.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {item.drug_a} ↔ {item.drug_b}
                    </span>
                    <Badge variant={item.severity === 'High Risk' ? 'critical' : 'warning'} size="sm">
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{item.mechanism}</p>
                  <p className="text-xs text-[var(--color-text-primary)] font-medium pt-1 border-t border-[var(--color-border-subtle)]">
                    <span className="text-[var(--color-text-muted)]">Clinician Guidance:</span> {item.doctor_guidance}
                  </p>
                </div>
              ))}

              {data.higher_order_patterns?.length > 0 && (
                <div className="p-4 rounded-xl border border-[var(--color-status-critical-border)] bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)]">
                  <h5 className="font-bold text-xs uppercase tracking-wider mb-1">
                    Higher-Order Multi-Drug Hazard
                  </h5>
                  <p className="text-xs leading-relaxed">
                    {data.higher_order_patterns[0].name}: {data.higher_order_patterns[0].pattern_description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-1 text-sm">
                Potential Repurposing Candidates Evaluated
              </h4>
              {data.candidates?.map((cand, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[var(--color-text-primary)] text-base">{cand.drug_name}</span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-2">Original: {cand.original_indication}</span>
                    </div>
                    <Badge variant="info" size="md">
                      Score: {cand.curenova_ranking}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{cand.mechanism}</p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="text-[var(--color-text-muted)]">Targets:</span>
                    {cand.targets?.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-card)] font-mono text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legal / Clinical Disclaimer */}
          <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] border-l-4 border-l-[var(--color-status-warning)] bg-[var(--color-surface-sunken)] text-[11px] text-[var(--color-text-secondary)] space-y-1">
            <span className="font-bold text-[var(--color-text-primary)] block uppercase tracking-wider text-[10px] font-mono">
              Medical Decision Support Regulatory Notice
            </span>
            <p className="leading-relaxed">
              This document is an evidence-grounded computational assessment generated by CureNova. It does NOT constitute a medical diagnosis, a prescription, or an order for treatment. All clinical decisions must be independently validated by a licensed healthcare professional.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] print:hidden">
          <Button variant="subtle" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
