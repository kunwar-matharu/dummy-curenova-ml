import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export const SafetyDisclaimer = ({ variant = 'banner', className = '' }) => {
  if (variant === 'compact') {
    return (
      <div
        role="note"
        aria-label="Clinical Decision Support Notice"
        className={`flex items-center gap-2 text-xs text-[var(--color-text-muted)] py-2 px-3.5 bg-[var(--color-surface-sunken)] rounded-lg border border-[var(--color-border-subtle)] ${className}`}
      >
        <Info className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
        <span className="leading-snug">
          Clinical decision support only. Not a prescribing system. Always verify regimen decisions with licensed clinical judgment.
        </span>
      </div>
    );
  }

  return (
    <aside
      aria-label="Clinical Decision Support Safety Notice"
      className={`rounded-xl border border-[var(--color-border-subtle)] border-l-4 border-l-[var(--color-status-warning)] bg-[var(--color-surface-card)] p-4 sm:p-5 text-[var(--color-text-primary)] shadow-[var(--shadow-base)] ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border border-[var(--color-status-warning-border)] shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
              Clinical Decision Support Platform
            </h4>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)] font-semibold">
              Advisory Notice
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            CureNova is designed solely to aggregate, connect, and analyze published biomedical evidence. It does
            <strong className="text-[var(--color-text-primary)]"> not</strong> diagnose, prescribe, or replace professional clinical judgment. Patients must never alter, start, or stop medications without consulting a qualified physician or pharmacist.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default SafetyDisclaimer;
