import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  id,
  options = [],
  value,
  onChange,
  error,
  helperText,
  placeholder = 'Select option...',
  className = '',
  required = false,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#dc2626] ml-0.5">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full rounded-lg bg-[var(--color-surface-card)] text-[var(--color-text-primary)] text-sm px-3.5 py-2 pr-9 border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-transparent disabled:opacity-50 disabled:bg-[var(--color-surface-sunken)] cursor-pointer ${
            error
              ? 'border-[#dc2626] focus:ring-[#dc2626]'
              : 'border-[var(--color-border-strong)] hover:border-[var(--color-border-focus)]'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>

        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] absolute right-3 pointer-events-none" />
      </div>

      {error ? (
        <span className="text-xs font-medium text-[#dc2626] dark:text-[#f87171]">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>
      ) : null}
    </div>
  );
}
