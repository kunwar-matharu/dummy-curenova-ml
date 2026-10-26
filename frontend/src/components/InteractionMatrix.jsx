import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import Tooltip from './ui/Tooltip';

export const InteractionMatrix = ({ drugs = [], matrixCells = [], onSelectPair }) => {
  const [selectedCell, setSelectedCell] = useState(null);

  if (!drugs || drugs.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] rounded-xl border border-[var(--color-border-subtle)]">
        Enter at least two medications to generate the pairwise pharmacokinetic interaction matrix.
      </div>
    );
  }

  const getCell = (row, col) => {
    return (
      matrixCells.find(
        (c) =>
          (c.drug_row === row && c.drug_col === col) ||
          (c.drug_row === col && c.drug_col === row)
      ) || { severity: 'None', has_interaction: false, summary: 'No direct conflict' }
    );
  };

  const getCellStyling = (row, col) => {
    if (row === col) {
      return {
        bg: 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] cursor-default',
        icon: null,
        code: '—',
        label: 'Self'
      };
    }
    const cell = getCell(row, col);
    if (!cell.has_interaction || cell.severity === 'None') {
      return {
        bg: 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] hover:bg-[var(--color-status-safe-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-status-safe)]',
        icon: ShieldCheck,
        code: 'SAFE',
        label: 'No Conflict'
      };
    }
    if (cell.severity === 'High Risk' || cell.severity === 'Critical') {
      return {
        bg: 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] font-bold hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#dc2626]',
        icon: AlertTriangle,
        code: 'CRIT',
        label: 'High Risk'
      };
    }
    if (cell.severity === 'Moderate Risk') {
      return {
        bg: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] font-semibold hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#d97706]',
        icon: AlertCircle,
        code: 'MOD',
        label: 'Moderate'
      };
    }
    return {
      bg: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]',
      icon: Info,
      code: 'INFO',
      label: 'Informational'
    };
  };

  const handleCellClick = (row, col) => {
    if (row === col) return;
    const cell = getCell(row, col);
    setSelectedCell({ row, col, ...cell });
    if (onSelectPair) {
      onSelectPair(row, col, cell);
    }
  };

  const handleKeyDown = (e, row, col) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCellClick(row, col);
    }
  };

  return (
    <div className="space-y-4">
      {/* Matrix Controls & Accessible Legend (Icon + Letter + Color) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[var(--color-text-primary)]">
          Pairwise Interaction Heatmap
        </span>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)] border border-[var(--color-status-critical-border)] text-[10px] font-bold">
              <AlertTriangle className="w-3 h-3 text-[var(--color-status-critical)]" />
              <span>[CRIT] High Risk</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)] text-[10px] font-semibold">
              <AlertCircle className="w-3 h-3 text-[var(--color-status-warning)]" />
              <span>[MOD] Moderate</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)] border border-[var(--color-status-safe-border)] text-[10px] font-medium">
              <ShieldCheck className="w-3 h-3 text-[var(--color-status-safe)]" />
              <span>[SAFE] Monitored</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Table Matrix Container */}
      <div className="overflow-x-auto max-h-[460px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-2xs">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              {/* Sticky Top-Left Corner */}
              <th className="sticky top-0 left-0 z-30 p-3 text-left font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] border-r border-b border-[var(--color-border-subtle)] w-36">
                Active Regimen
              </th>
              {drugs.map((drug) => (
                <th
                  key={drug}
                  className="sticky top-0 z-20 p-3 text-center font-bold text-[var(--color-text-primary)] bg-[var(--color-surface-sunken)] border-r last:border-0 border-b border-[var(--color-border-subtle)] min-w-28 truncate"
                  title={drug}
                >
                  {drug}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugs.map((rowDrug) => (
              <tr key={rowDrug} className="border-b border-[var(--color-border-subtle)] last:border-0">
                {/* Sticky Left Row Header */}
                <td className="sticky left-0 z-10 p-3 font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-sunken)] border-r border-[var(--color-border-subtle)] truncate">
                  {rowDrug}
                </td>

                {drugs.map((colDrug) => {
                  const cell = getCell(rowDrug, colDrug);
                  const isSelf = rowDrug === colDrug;
                  const style = getCellStyling(rowDrug, colDrug);
                  const CellIcon = style.icon;

                  return (
                    <td
                      key={colDrug}
                      tabIndex={isSelf ? -1 : 0}
                      onClick={() => handleCellClick(rowDrug, colDrug)}
                      onKeyDown={(e) => handleKeyDown(e, rowDrug, colDrug)}
                      className={`p-3 text-center border-r border-[var(--color-border-subtle)] last:border-0 transition-all outline-none ${
                        style.bg
                      } ${!isSelf ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                      title={isSelf ? 'Self' : `${rowDrug} + ${colDrug}: ${cell.severity} - ${cell.summary}`}
                    >
                      {isSelf ? (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {CellIcon && <CellIcon className="w-3.5 h-3.5 shrink-0" />}
                          <span className="font-mono text-[11px]">{style.code}</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Detail Drawer / Callout */}
      {selectedCell && (
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[var(--color-text-primary)]">
                Selected Pair: {selectedCell.row} ↔ {selectedCell.col}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedCell.severity === 'High Risk'
                    ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-text)]'
                    : selectedCell.severity === 'Moderate Risk'
                    ? 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]'
                    : 'bg-[var(--color-status-safe-bg)] text-[var(--color-status-safe-text)]'
                }`}
              >
                {selectedCell.severity}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {selectedCell.summary || 'No direct pharmacokinetic interaction observed.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractionMatrix;
