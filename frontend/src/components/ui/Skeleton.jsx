import React from 'react';

export default function Skeleton({
  className = '',
  variant = 'rectangular', // 'text' | 'circular' | 'rectangular'
  width,
  height,
  style = {},
  ...props
}) {
  const baseClasses = 'bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] animate-shimmer relative overflow-hidden shrink-0';

  const variantClasses = {
    text: 'rounded h-4 my-1 w-full',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-lg'
  };

  const combinedStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.rectangular} ${className}`}
      style={combinedStyles}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-1/3 h-3" />
        <Skeleton variant="circular" className="w-6 h-6" />
      </div>
      <Skeleton variant="rectangular" className="w-1/2 h-8" />
      <Skeleton variant="text" className="w-full h-3" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3 border-b border-[var(--color-border-subtle)]">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
