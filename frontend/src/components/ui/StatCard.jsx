import React from 'react';
import Card from './Card';
import Badge from './Badge';
import { AlertOctagon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
  priority = false, // Critical hazard state
  icon: Icon,
  badgeText,
  onClick,
  className = ''
}) {
  return (
    <Card
      elevation={priority ? 'critical' : 'raised'}
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={`relative transition-all duration-200 ${priority ? 'ring-1 ring-[var(--color-status-critical-border)]' : ''} ${className}`}
    >
      <div className="p-5 flex flex-col justify-between h-full">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              {title}
            </span>
            {priority && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#dc2626] dark:text-[#f87171] mt-0.5">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                IMMEDIATE CLINICAL ACTION REQUIRED
              </span>
            )}
          </div>

          {badgeText ? (
            <Badge variant={priority ? 'critical' : 'info'} size="sm" dot={priority}>
              {badgeText}
            </Badge>
          ) : Icon ? (
            <div
              className={`p-2 rounded-lg shrink-0 ${
                priority
                  ? 'bg-[var(--color-status-critical-bg)] text-[#dc2626] border border-[var(--color-status-critical-border)]'
                  : 'bg-[var(--color-surface-sunken)] text-[var(--color-brand-primary)] border border-[var(--color-border-subtle)]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          ) : null}
        </div>

        {/* Value row with Tabular Numerals */}
        <div className="flex items-baseline justify-between gap-2 mt-auto">
          <div className={`text-2xl sm:text-3xl font-bold tabular tracking-tight ${
            priority ? 'text-[#dc2626] dark:text-[#f87171]' : 'text-[var(--color-text-primary)]'
          }`}>
            {value}
          </div>

          {change && (
            <div
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                changeType === 'positive'
                  ? 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)]'
                  : changeType === 'negative'
                  ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)]'
                  : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]'
              }`}
            >
              {changeType === 'positive' ? (
                <TrendingUp className="w-3 h-3" />
              ) : changeType === 'negative' ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span className="tabular">{change}</span>
            </div>
          )}
        </div>

        {/* Subtitle / context description */}
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 border-t border-[var(--color-border-subtle)] pt-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
