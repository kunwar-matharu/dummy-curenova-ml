import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Circle, ShieldAlert, Cpu, Search, Sparkles } from 'lucide-react';

export const AnalysisProgress = ({
  steps = [],
  title = "Analyzing Biomedical Intelligence Pipeline",
  subtitle = "Orchestrating Retrieval, Reasoning, Safety, and Recommendation Agents via LangGraph",
  onComplete,
  isExecuting = true
}) => {
  const defaultSteps = [
    { id: 'step-1', agent: 'Retrieval Agent', label: 'Query Normalization & Entity Resolution (RxNorm / MeSH)', duration: 400 },
    { id: 'step-2', agent: 'Retrieval Agent', label: 'Harvesting Biomedical Evidence (PubMed, ClinicalTrials.gov, ChEMBL)', duration: 600 },
    { id: 'step-3', agent: 'Reasoning Agent', label: 'Connecting Biological Targets, Genes & Reactome Pathways', duration: 700 },
    { id: 'step-4', agent: 'Safety Agent', label: 'Safety Cross-Validation & Adverse-Event Signal Analysis (openFDA)', duration: 500 },
    { id: 'step-5', agent: 'Recommendation Agent', label: 'Evidence Ranking & Explainable Decision Synthesis', duration: 400 }
  ];

  const activeSteps = steps.length > 0 ? steps : defaultSteps;
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    if (!isExecuting) {
      setCurrentStepIdx(activeSteps.length);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current <= activeSteps.length) {
        setCurrentStepIdx(current);
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 550);

    return () => clearInterval(interval);
  }, [isExecuting, activeSteps.length, onComplete]);

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-6 shadow-[var(--shadow-overlay)] animate-in fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-sunken)] text-[var(--color-brand-primary)] border border-[var(--color-border-subtle)]">
          <Cpu className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3 mt-5">
        {activeSteps.map((step, idx) => {
          const isDone = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;

          return (
            <div
              key={step.id || idx}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isCurrent
                  ? 'bg-[var(--color-surface-hover)] border border-[var(--color-brand-border)] text-[var(--color-text-primary)] font-semibold shadow-xs'
                  : isDone
                  ? 'bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                  : 'text-[var(--color-text-muted)] border border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[var(--color-brand-primary)] animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--color-border-strong)] shrink-0" />
                )}
                <div className="min-w-0">
                  {step.agent && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-brand-primary)] block">
                      {step.agent}
                    </span>
                  )}
                  <span className="text-xs truncate block">{step.label}</span>
                </div>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[var(--color-text-muted)] shrink-0">
                {isDone ? 'Completed' : isCurrent ? 'Working...' : 'Queued'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs text-[var(--color-text-muted)] font-mono">
        <span>LangGraph Stateful Multi-Agent System</span>
        <span className="tabular">
          {Math.min(currentStepIdx, activeSteps.length)} / {activeSteps.length} Agents Verified
        </span>
      </div>
    </div>
  );
};

export default AnalysisProgress;
