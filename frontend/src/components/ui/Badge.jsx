import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const sizeStyles = {
    sm: 'text-[11px] font-medium px-2 py-0.5 rounded-md gap-1 tracking-tight',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-md gap-1.5'
  };

  const variantStyles = {
    critical: 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] border border-[var(--color-status-critical-border)]',
    warning: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)]',
    moderate: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)]',
    normal: 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border border-[var(--color-status-safe-border)]',
    safe: 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border border-[var(--color-status-safe-border)]',
    info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)] border border-[var(--color-status-info-border)]',
    neutral: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'
  };

  const dotColors = {
    critical: 'bg-[#dc2626] animate-pulse',
    warning: 'bg-[#d97706]',
    moderate: 'bg-[#d97706]',
    normal: 'bg-[#059669]',
    safe: 'bg-[#059669]',
    info: 'bg-[#2563eb]',
    neutral: 'bg-[var(--color-text-muted)]'
  };

  return (
    <span
      className={`inline-flex items-center uppercase-none tracking-normal font-sans select-none whitespace-nowrap ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0 text-current" />}
      <span>{children}</span>
    </span>
  );
}
