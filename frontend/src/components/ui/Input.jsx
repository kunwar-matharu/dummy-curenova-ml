import React from 'react';

export default function Input({
  label,
  id,
  error,
  helperText,
  icon: Icon,
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#dc2626] ml-0.5">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          required={required}
          className={`w-full rounded-lg bg-[var(--color-surface-card)] text-[var(--color-text-primary)] text-sm px-3.5 py-2 border transition-all duration-150 placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-transparent disabled:opacity-50 disabled:bg-[var(--color-surface-sunken)] ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-[#dc2626] focus:ring-[#dc2626]'
              : 'border-[var(--color-border-strong)] hover:border-[var(--color-border-focus)]'
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <span className="text-xs font-medium text-[#dc2626] dark:text-[#f87171]">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>
      ) : null}
    </div>
  );
}
