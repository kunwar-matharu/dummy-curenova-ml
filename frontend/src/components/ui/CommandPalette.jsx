import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Search,
  Command,
  Sun,
  Moon,
  UserCheck,
  Stethoscope,
  Microscope,
  HeartHandshake,
  ExternalLink,
  Pill,
  BookOpen,
  Share2,
  FileText,
  X
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const actions = [
    // Navigation
    {
      category: 'Pages',
      id: 'nav-doc-dash',
      title: 'Doctor Clinical Overview',
      subtitle: 'Overview of regimens, critical alerts, and active triage',
      icon: Stethoscope,
      action: () => navigate('/doctor/dashboard')
    },
    {
      category: 'Pages',
      id: 'nav-doc-safety',
      title: 'Medication Safety & Matrix',
      subtitle: 'Polypharmacy checker and drug interaction matrix',
      icon: Pill,
      action: () => navigate('/doctor/medication-safety')
    },
    {
      category: 'Pages',
      id: 'nav-res-dash',
      title: 'Researcher Overview',
      subtitle: 'Repurposing hypotheses and literature evidence volume',
      icon: Microscope,
      action: () => navigate('/researcher/dashboard')
    },
    {
      category: 'Pages',
      id: 'nav-res-repurposing',
      title: 'Drug Repurposing Engine',
      subtitle: 'Ranked candidate indications and trial evidence',
      icon: Microscope,
      action: () => navigate('/researcher/drug-repurposing')
    },
    {
      category: 'Pages',
      id: 'nav-pat-dash',
      title: 'Patient Medication Portal',
      subtitle: 'Plain-language medication schedule and discussion sheet',
      icon: HeartHandshake,
      action: () => navigate('/patient/dashboard')
    },
    {
      category: 'Pages',
      id: 'nav-evidence',
      title: 'Biomedical Evidence Explorer',
      subtitle: 'Search PubMed, ChEMBL, openFDA, and Reactome sources',
      icon: BookOpen,
      action: () => navigate('/evidence')
    },
    {
      category: 'Pages',
      id: 'nav-kg',
      title: 'Biomedical Knowledge Graph',
      subtitle: 'Interactive multi-relational graph visualization',
      icon: Share2,
      action: () => navigate('/knowledge-graph')
    },
    // Drug quick actions
    {
      category: 'Clinical Candidates',
      id: 'drug-metformin',
      title: 'Metformin Hydrochloride (RxCUI 6809)',
      subtitle: 'Jump to safety evaluation for metformin',
      icon: Pill,
      action: () => navigate('/doctor/medication-safety?drug=Metformin')
    },
    {
      category: 'Clinical Candidates',
      id: 'drug-warfarin',
      title: 'Warfarin Sodium (RxCUI 11289)',
      subtitle: 'Evaluate high-risk anticoagulant interactions',
      icon: Pill,
      action: () => navigate('/doctor/medication-safety?drug=Warfarin')
    },
    {
      category: 'Clinical Candidates',
      id: 'drug-lisinopril',
      title: 'Lisinopril (RxCUI 29046)',
      subtitle: 'ACE inhibitor renal and hyperkalemia safety check',
      icon: Pill,
      action: () => navigate('/doctor/medication-safety?drug=Lisinopril')
    },

    // Theme toggle
    {
      category: 'Preferences',
      id: 'theme-toggle',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle clinical interface color scheme',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => toggleTheme()
    }
  ];

  const roleSpecificActions = actions.filter((item) => {
    if (!user) return true;
    if (user.role === 'doctor') {
      return !item.id.startsWith('nav-res') && !item.id.startsWith('nav-pat');
    }
    if (user.role === 'researcher') {
      return !item.id.startsWith('nav-doc') && !item.id.startsWith('nav-pat');
    }
    if (user.role === 'patient') {
      return !item.id.startsWith('nav-doc') && !item.id.startsWith('nav-res') && !item.id.startsWith('drug-');
    }
    return true;
  });

  const filtered = roleSpecificActions.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else if (onClose) onClose(false); // toggle trigger
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] rounded-2xl shadow-[var(--shadow-overlay)] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a clinical command, drug, disease, or destination..."
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded">
            ESC
          </kbd>
        </div>

        {/* Action list */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--color-border-subtle)]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
              No matching clinical items or navigation routes found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? 'bg-[var(--color-surface-hover)] text-[var(--color-brand-primary)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]'
                        : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate text-[var(--color-text-primary)]">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider ml-2 shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[var(--color-surface-sunken)] border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] font-mono text-[10px]">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] font-mono text-[10px]">↵</kbd> Select
            </span>
          </div>
          <span>CureNova Clinical Command</span>
        </div>
      </div>
    </div>
  );
}
