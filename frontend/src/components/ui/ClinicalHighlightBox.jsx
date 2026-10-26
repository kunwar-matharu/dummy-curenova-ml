import React from 'react';

/**
 * ClinicalHighlightBox
 * A professional medical-grade highlight container with left accent bar,
 * soft clinical surface, crisp borders, and optional badge/icon headers.
 */
export const ClinicalHighlightBox = ({
  title,
  subtitle,
  badge,
  icon: Icon,
  variant = 'primary', // 'primary' (medical blue) | 'success' (green) | 'warning' (amber) | 'danger' (red) | 'neutral'
  children,
  action,
  className = '',
}) => {
  const variantStyles = {
    primary: {
      border: 'border-[var(--color-brand-border)]',
      accentBar: 'border-l-4 border-l-[var(--color-brand-primary)]',
      bg: 'bg-[var(--color-brand-surface)]/50 dark:bg-[var(--color-brand-surface)]/20 dark:shadow-[inset_0_1px_0_0_rgba(45,212,191,0.12)]',
      iconBg: 'bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)] border border-[var(--color-brand-border)]',
      titleColor: 'text-[var(--color-text-primary)]',
      subtitleColor: 'text-[var(--color-text-secondary)]',
      badgeBg: 'bg-[var(--color-brand-surface)] text-[var(--color-brand-text)] border-[var(--color-brand-border)]',
    },
    success: {
      border: 'border-[var(--color-status-safe-border)]',
      accentBar: 'border-l-4 border-l-[var(--color-status-safe)]',
      bg: 'bg-[var(--color-status-safe-bg)]/40 dark:bg-[var(--color-status-safe-bg)]/20 dark:shadow-[inset_0_1px_0_0_rgba(74,222,128,0.12)]',
      iconBg: 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border border-[var(--color-status-safe-border)]',
      titleColor: 'text-[var(--color-text-primary)]',
      subtitleColor: 'text-[var(--color-text-secondary)]',
      badgeBg: 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border-[var(--color-status-safe-border)]',
    },
    warning: {
      border: 'border-[var(--color-status-warning-border)]',
      accentBar: 'border-l-4 border-l-[var(--color-status-warning)]',
      bg: 'bg-[var(--color-status-warning-bg)]/40 dark:bg-[var(--color-status-warning-bg)]/20 dark:shadow-[inset_0_1px_0_0_rgba(251,191,36,0.12)]',
      iconBg: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)]',
      titleColor: 'text-[var(--color-text-primary)]',
      subtitleColor: 'text-[var(--color-text-secondary)]',
      badgeBg: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]',
    },
    danger: {
      border: 'border-[var(--color-status-critical-border)]',
      accentBar: 'border-l-4 border-l-[var(--color-status-critical)]',
      bg: 'bg-[var(--color-status-critical-bg)]/40 dark:bg-[var(--color-status-critical-bg)]/20 dark:shadow-[inset_0_1px_0_0_rgba(248,113,113,0.12)]',
      iconBg: 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] border border-[var(--color-status-critical-border)]',
      titleColor: 'text-[var(--color-text-primary)]',
      subtitleColor: 'text-[var(--color-text-secondary)]',
      badgeBg: 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] border-[var(--color-status-critical-border)]',
    },
    neutral: {
      border: 'border-[var(--color-border-subtle)] dark:border-slate-800',
      accentBar: 'border-l-4 border-l-[#64748B] dark:border-l-[#94A3B8]',
      bg: 'bg-[var(--color-surface-sunken)] dark:bg-[#0B1120]',
      iconBg: 'bg-[var(--color-surface-card)] text-[#475569] dark:text-[#CBD5E1]',
      titleColor: 'text-[var(--color-text-primary)]',
      subtitleColor: 'text-[var(--color-text-muted)]',
      badgeBg: 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]',
    },
  };

  const style = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border ${style.border} ${style.accentBar} ${style.bg} transition-all space-y-3 ${className}`}
    >
      {(title || subtitle || badge || Icon || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg} shadow-2xs`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              {title && <h3 className={`text-sm sm:text-base font-bold tracking-tight ${style.titleColor}`}>{title}</h3>}
              {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {badge && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${style.badgeBg}`}>
                {badge}
              </span>
            )}
            {action}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default ClinicalHighlightBox;
