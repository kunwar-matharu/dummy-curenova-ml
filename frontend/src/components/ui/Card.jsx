import React from 'react';

export default function Card({
  children,
  elevation = 'raised', // 'flat' | 'raised' | 'critical'
  className = '',
  onClick,
  interactive = false,
  ...props
}) {
  const elevationStyles = {
    flat: 'bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-none',
    raised: 'bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-base)] hover:shadow-[var(--shadow-raised)] transition-shadow duration-200',
    critical: 'bg-[var(--color-surface-card)] border border-[var(--color-status-critical-border)] border-l-4 border-l-[var(--color-status-critical-rail)] shadow-[var(--shadow-raised)] dark:bg-[var(--color-status-critical-bg)]'
  };

  const interactiveStyles = (interactive || Boolean(onClick))
    ? 'cursor-pointer hover:border-[var(--color-border-strong)] transition-all duration-150 active:scale-[0.998]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl overflow-hidden ${elevationStyles[elevation] || elevationStyles.raised} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-base font-semibold text-[var(--color-text-primary)] tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-[var(--color-text-muted)] mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`px-5 py-3 bg-[var(--color-surface-sunken)] border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs text-[var(--color-text-muted)] ${className}`} {...props}>
      {children}
    </div>
  );
}
