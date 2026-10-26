import React from 'react';
import { AlertTriangle, AlertCircle, ShieldCheck, CheckCircle, HelpCircle, Info } from 'lucide-react';

export const RiskBadge = ({ severity = 'Low Risk', size = 'md', className = '', showPulse = true }) => {
  const norm = String(severity).toLowerCase();

  let colors = 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]';
  let icon = <Info className="w-3.5 h-3.5 shrink-0" />;
  let isCritical = false;

  if (norm.includes('high') || norm.includes('severe') || norm.includes('critical') || norm.includes('fatal') || norm.includes('contraindicated')) {
    colors = 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] border-[var(--color-status-critical-border)] font-bold';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-status-critical)] shrink-0" />;
    isCritical = true;
  } else if (norm.includes('moderate') || norm.includes('warning') || norm.includes('caution')) {
    colors = 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)] font-semibold';
    icon = <AlertCircle className="w-3.5 h-3.5 text-[var(--color-status-warning)] shrink-0" />;
  } else if (norm.includes('low') || norm.includes('mild') || norm.includes('safe') || norm.includes('normal')) {
    colors = 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border-[var(--color-status-safe-border)] font-medium';
    icon = <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-status-safe)] shrink-0" />;
  } else if (norm.includes('strong evidence') || norm.includes('high confidence')) {
    colors = 'bg-[var(--color-brand-surface)] text-[var(--color-brand-text)] border-[var(--color-brand-border)] font-semibold';
    icon = <CheckCircle className="w-3.5 h-3.5 text-[var(--color-brand-primary)] shrink-0" />;
  } else if (norm.includes('conflicting') || norm.includes('unknown') || norm.includes('unclear')) {
    colors = 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border-[var(--color-border-strong)] font-medium';
    icon = <HelpCircle className="w-3.5 h-3.5 shrink-0" />;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1 rounded-md'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5 gap-2 font-medium rounded-lg'
      : 'text-xs px-2.5 py-1 gap-1.5 font-medium rounded-md';

  return (
    <span
      className={`inline-flex items-center border tracking-tight select-none ${colors} ${sizeClasses} ${className}`}
    >
      {isCritical && showPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-critical)] animate-pulse shrink-0" />
      )}
      {icon}
      <span className="truncate">{severity}</span>
    </span>
  );
};

export default RiskBadge;
