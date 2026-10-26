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
      border: 'border-[#0284C7]/30 dark:border-[#38BDF8]/40',
      accentBar: 'border-l-4 border-l-[#0284C7] dark:border-l-[#38BDF8]',
      bg: 'bg-[#F0F7FF] dark:bg-[#0C1A30] dark:shadow-[inset_0_1px_0_0_rgba(56,189,248,0.15)]',
      iconBg: 'bg-[#E0F2FE] text-[#0369A1] dark:bg-[#0EA5E9]/20 dark:text-[#38BDF8] dark:border dark:border-[#38BDF8]/30',
      titleColor: 'text-[#0C3B5E] dark:text-[#FFFFFF]',
      subtitleColor: 'text-[var(--color-text-muted)] dark:text-[#94A3B8]',
      badgeBg: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] dark:bg-[#0EA5E9]/20 dark:text-[#7DD3FC] dark:border-[#38BDF8]/40',
    },
    success: {
      border: 'border-[#16A34A]/30 dark:border-[#34D399]/40',
      accentBar: 'border-l-4 border-l-[#16A34A] dark:border-l-[#34D399]',
      bg: 'bg-[#F0FDF4] dark:bg-[#061D12] dark:shadow-[inset_0_1px_0_0_rgba(52,211,153,0.15)]',
      iconBg: 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#10B981]/20 dark:text-[#6EE7B7] dark:border dark:border-[#34D399]/30',
      titleColor: 'text-[#14532D] dark:text-[#ECFDF5]',
      subtitleColor: 'text-[var(--color-text-muted)] dark:text-[#A7F3D0]',
      badgeBg: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0] dark:bg-[#10B981]/20 dark:text-[#A7F3D0] dark:border-[#34D399]/40',
    },
    warning: {
      border: 'border-[#D97706]/30 dark:border-[#FBBF24]/40',
      accentBar: 'border-l-4 border-l-[#D97706] dark:border-l-[#FBBF24]',
      bg: 'bg-[#FFFBEB] dark:bg-[#201505] dark:shadow-[inset_0_1px_0_0_rgba(251,191,36,0.15)]',
      iconBg: 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] dark:border dark:border-[#FBBF24]/30',
      titleColor: 'text-[#78350F] dark:text-[#FEF3C7]',
      subtitleColor: 'text-[var(--color-text-muted)] dark:text-[#FDE68A]',
      badgeBg: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#F59E0B]/20 dark:text-[#FDE047] dark:border-[#FBBF24]/40',
    },
    danger: {
      border: 'border-[#DC2626]/30 dark:border-[#F87171]/40',
      accentBar: 'border-l-4 border-l-[#DC2626] dark:border-l-[#F87171]',
      bg: 'bg-[#FEF2F2] dark:bg-[#220B0B] dark:shadow-[inset_0_1px_0_0_rgba(248,113,113,0.15)]',
      iconBg: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#EF4444]/20 dark:text-[#FCA5A5] dark:border dark:border-[#F87171]/30',
      titleColor: 'text-[#7F1D1D] dark:text-[#FFF1F2]',
      subtitleColor: 'text-[var(--color-text-muted)] dark:text-[#FECDD3]',
      badgeBg: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA] dark:bg-[#EF4444]/20 dark:text-[#FCA5A5] dark:border-[#F87171]/40',
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
