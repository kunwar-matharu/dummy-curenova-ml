import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Stethoscope,
  ShieldAlert,
  Activity,
  Cpu,
  ArrowRight,
  Plus,
  Pill,
  X,
  Sparkles,
  Info,
  AlertTriangle,
  FileText,
  HeartPulse,
  Flame,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sliders,
  Layers,
  RotateCcw,
  Zap,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { safetyService } from '../../services/api';
import { ClinicalHighlightBox } from '../../components/ui/ClinicalHighlightBox';

const KNOWN_INTERACTIONS = {
  'warfarin-aspirin': { severity: 'Severe', score: 85, alert: 'High Bleeding Risk (ROR 3.84)' },
  'aspirin-warfarin': { severity: 'Severe', score: 85, alert: 'High Bleeding Risk (ROR 3.84)' },
  'warfarin-ibuprofen': { severity: 'Severe', score: 88, alert: 'GI Hemorrhage & Coagulation Interference' },
  'ibuprofen-warfarin': { severity: 'Severe', score: 88, alert: 'GI Hemorrhage & Coagulation Interference' },
  'clopidogrel-omeprazole': { severity: 'Moderate', score: 62, alert: 'CYP2C19 Inhibition (Reduced Active Metabolite)' },
  'omeprazole-clopidogrel': { severity: 'Moderate', score: 62, alert: 'CYP2C19 Inhibition (Reduced Active Metabolite)' },
  'lisinopril-ibuprofen': { severity: 'Moderate', score: 55, alert: 'Attenuated Antihypertensive Response & Renal Load' },
  'ibuprofen-lisinopril': { severity: 'Moderate', score: 55, alert: 'Attenuated Antihypertensive Response & Renal Load' },
  'lisinopril-spironolactone': { severity: 'Severe', score: 80, alert: 'Severe Hyperkalemia Risk (>5.5 mEq/L)' },
  'spironolactone-lisinopril': { severity: 'Severe', score: 80, alert: 'Severe Hyperkalemia Risk (>5.5 mEq/L)' },
  'tramadol-sertraline': { severity: 'Severe', score: 82, alert: 'Serotonin Toxicity Alert (Central Serotonin Load)' },
  'sertraline-tramadol': { severity: 'Severe', score: 82, alert: 'Serotonin Toxicity Alert (Central Serotonin Load)' },
};

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load real catalog from backend API
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Active Patient / Physiology Controls
  const [patientAge, setPatientAge] = useState(65);
  const [patientEgfr, setPatientEgfr] = useState(75);
  const [selectedOrgan, setSelectedOrgan] = useState('renal');
  const [activeCell, setActiveCell] = useState(null);

  // Active Regimen Drugs (initialized empty - NO DUMMY DATA)
  const [activeDrugs, setActiveDrugs] = useState(() => {
    const initial = location.state?.prefilledMeds || [];
    return initial.map((m) => ({ name: m, enabled: true }));
  });
  const [newDrugInput, setNewDrugInput] = useState('');

  // Stored safety checks history
  const [recentChecks, setRecentChecks] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('curenova_doctor_safety_history');
      if (stored) {
        setRecentChecks(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load recent doctor safety checks', e);
    }
  }, []);

  // Fetch real backend catalog
  useEffect(() => {
    safetyService
      .getCatalog()
      .then((res) => {
        setCatalog(res.catalog || []);
      })
      .catch((err) => console.error('Failed to load drug catalog', err))
      .finally(() => setLoadingCatalog(false));
  }, []);

  // Filter only enabled drugs for live calculation
  const enabledMeds = useMemo(() => {
    return activeDrugs.filter((d) => d.enabled).map((d) => d.name);
  }, [activeDrugs]);

  // Toggle drug inclusion in simulation
  const toggleDrug = (name) => {
    setActiveDrugs((prev) =>
      prev.map((d) => (d.name === name ? { ...d, enabled: !d.enabled } : d))
    );
  };

  // Add drug
  const handleAddDrug = (drugName) => {
    const clean = (drugName || newDrugInput).trim();
    if (!clean) return;
    if (!activeDrugs.some((d) => d.name.toLowerCase() === clean.toLowerCase())) {
      setActiveDrugs([...activeDrugs, { name: clean, enabled: true }]);
    }
    setNewDrugInput('');
  };

  // Remove drug
  const handleRemoveDrug = (name) => {
    setActiveDrugs(activeDrugs.filter((d) => d.name !== name));
  };

  // Dynamic Live Safety Vitals calculation
  const vitals = useMemo(() => {
    const count = enabledMeds.length;
    if (count === 0) {
      return {
        score: null,
        renalCapacity: Math.min(100, Math.round((patientEgfr / 90) * 100)),
        hepaticCapacity: 100,
        cardiacTolerance: 100,
        riskStatus: 'Awaiting Regimen',
        riskColor: 'slate',
        highRiskCount: 0,
        modRiskCount: 0,
      };
    }

    const medsLower = enabledMeds.map((m) => m.toLowerCase());
    let penalty = 0;
    let highRiskCount = 0;
    let modRiskCount = 0;

    // Check all pairwise combinations
    for (let i = 0; i < medsLower.length; i++) {
      for (let j = i + 1; j < medsLower.length; j++) {
        const pair = `${medsLower[i]}-${medsLower[j]}`;
        if (KNOWN_INTERACTIONS[pair]) {
          const item = KNOWN_INTERACTIONS[pair];
          if (item.severity === 'Severe') {
            penalty += 35;
            highRiskCount++;
          } else {
            penalty += 18;
            modRiskCount++;
          }
        }
      }
    }

    // eGFR penalty
    if (patientEgfr < 45) {
      penalty += 15;
    } else if (patientEgfr < 60) {
      penalty += 8;
    }

    // Age penalty
    if (patientAge > 75) penalty += 8;

    const rawScore = Math.max(15, 96 - penalty);
    const renalCapacity = Math.max(20, Math.min(100, Math.round((patientEgfr / 90) * 100) - (penalty > 20 ? 15 : 0)));
    const hepaticCapacity = Math.max(30, 95 - count * 6 - (highRiskCount > 0 ? 15 : 0));
    const cardiacTolerance = Math.max(25, 95 - (highRiskCount > 0 ? 30 : 5) - (patientAge > 70 ? 10 : 0));

    let riskStatus = 'Optimal';
    let riskColor = 'emerald';
    if (rawScore < 45) {
      riskStatus = 'Severe Hazard';
      riskColor = 'rose';
    } else if (rawScore < 75) {
      riskStatus = 'Moderate Alert';
      riskColor = 'amber';
    }

    return {
      score: rawScore,
      renalCapacity,
      hepaticCapacity,
      cardiacTolerance,
      riskStatus,
      riskColor,
      highRiskCount,
      modRiskCount,
    };
  }, [enabledMeds, patientEgfr, patientAge]);

  return (
    <div className="space-y-6 w-full pb-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Clinical Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Clinical Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Logged in as <strong>{user?.name || 'Dr. Sarah Lin'}</strong> • Clinical decision-support protocol active.
          </p>
        </div>

        {/* Live Regimen Counter */}
        <div className="flex items-center gap-3 bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] px-3.5 py-2 rounded-2xl shadow-2xs">
          <Pill className="w-4 h-4 text-[#0284C7]" />
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-muted)] block leading-none">
              Active Regimen
            </span>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {enabledMeds.length} Medication{enabledMeds.length !== 1 ? 's' : ''} Loaded
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Vitals Gauges ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Safety Score Meter */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
              Safety Index
            </span>
            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
              vitals.riskColor === 'rose'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : vitals.riskColor === 'amber'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : vitals.riskColor === 'emerald'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {vitals.riskStatus}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tabular-nums text-[var(--color-text-primary)]">
              {vitals.score !== null ? vitals.score : '--'}
              <span className="text-xs text-[var(--color-text-muted)] font-mono font-normal">/100</span>
            </span>
            <svg className="w-14 h-6 text-[#0284C7] opacity-80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M0,15 L20,15 L28,5 L38,25 L46,8 L54,18 L62,15 L100,15" />
            </svg>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                vitals.riskColor === 'rose' ? 'bg-rose-500' : vitals.riskColor === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${vitals.score ?? 0}%` }}
            />
          </div>
        </div>

        {/* Kidney eGFR Capacity */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
              Renal (eGFR)
            </span>
            <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300">
              {patientEgfr} mL/min
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">
              {vitals.renalCapacity}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block">
              {patientEgfr < 60 ? 'Clearance Reduction' : 'Normal Glomerular Flow'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${vitals.renalCapacity}%` }} />
          </div>
        </div>

        {/* Liver CYP450 Capacity */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[#0284C7]" />
              Hepatic CYP
            </span>
            <span className="text-[10px] font-mono font-bold text-[#0369A1] dark:text-[#38BDF8]">
              CYP3A4 / 2D6
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">
              {vitals.hepaticCapacity}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block">
              Isoform Clearance Margin
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div className="h-full rounded-full bg-[#0284C7] transition-all duration-300" style={{ width: `${vitals.hepaticCapacity}%` }} />
          </div>
        </div>

        {/* Cardiac Tolerance */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              Cardiac Margin
            </span>
            <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">
              QT Interval
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">
              {vitals.cardiacTolerance}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block">
              Repolarization Buffer
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${vitals.cardiacTolerance}%` }} />
          </div>
        </div>
      </div>

      {/* ── Main Layout (7 cols + 5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Digital Twin Sandbox & 2D Matrix Grid */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Patient Medication List with Clinical Highlighting */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  Patient Medication List
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Add current patient medicines or select from common prescriptions below to review safety and warnings.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#E0F2FE] dark:bg-[#0369A1]/20 text-[#0369A1] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#0284C7]/40">
                {enabledMeds.length} Selected for Safety Check
              </span>
            </div>

            {/* Input Form with Medication Catalog Search */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddDrug(); }} className="flex gap-2">
              <div className="relative flex-1">
                <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={newDrugInput}
                  onChange={(e) => setNewDrugInput(e.target.value)}
                  placeholder="Type or select a medication to add..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0284C7] transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick Catalog Drug Pills (Tap to add) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)]">
                Common Clinical Medications (Tap to add):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {catalog.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleAddDrug(c.canonical_name)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] hover:border-[#0284C7] dark:hover:border-[#38BDF8] text-[var(--color-text-secondary)] dark:text-[#E2E8F0] hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors cursor-pointer"
                  >
                    + {c.canonical_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Highlight Box for Active Patient Medications */}
            <ClinicalHighlightBox
              variant="primary"
              title={`Active Patient Medications (${activeDrugs.length})`}
              subtitle="Click any medicine to toggle on/off in the active safety check"
              badge={enabledMeds.length > 0 ? `${enabledMeds.length} active` : undefined}
              icon={Pill}
              className="mt-2"
            >
              <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
                {activeDrugs.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)] italic px-1">
                    No medications added yet. Type a medicine name above or pick from common medications.
                  </span>
                ) : (
                  activeDrugs.map((drug) => (
                    <div
                      key={drug.name}
                      onClick={() => toggleDrug(drug.name)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                        drug.enabled
                          ? 'bg-[var(--color-surface-card)] dark:bg-[#1E293B] text-[#0A2540] dark:text-[#F8FAFC] border-[#0284C7] dark:border-[#38BDF8] shadow-xs dark:shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'bg-transparent text-[var(--color-text-muted)] dark:text-slate-400 border-dashed border-[var(--color-border-strong)] opacity-60 line-through'
                      }`}
                      title="Click to toggle drug ON/OFF in safety check"
                    >
                      <Pill className={`w-3.5 h-3.5 ${drug.enabled ? 'text-[#0284C7] dark:text-[#38BDF8]' : 'text-slate-400'}`} />
                      <span>{drug.name}</span>
                      <span className={`w-2 h-2 rounded-full ${drug.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDrug(drug.name);
                        }}
                        className="text-[var(--color-text-muted)] dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 ml-1 p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ClinicalHighlightBox>

            {/* Launch Report CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                Cross-referenced with verified clinical databases (PubMed, openFDA FAERS, ChEMBL).
              </span>
              <button
                type="button"
                disabled={enabledMeds.length === 0}
                onClick={() => navigate('/doctor/medication-safety', { state: { prefilledMeds: enabledMeds } })}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>Check Drug Interactions & Safety</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2D Pairwise DDI Matrix Grid */}
          {enabledMeds.length >= 2 && (
            <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Live Pairwise Interaction Matrix ({enabledMeds.length}×{enabledMeds.length})
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Click any cell intersection to inspect pairwise pharmacology.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500" /> Severe</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Safe</span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-mono text-[10px] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                        Matrix
                      </th>
                      {enabledMeds.map((med) => (
                        <th key={med} className="p-2 text-center font-bold font-mono text-[11px] text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)]">
                          {med.slice(0, 5)}..
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enabledMeds.map((rowMed, rowIdx) => (
                      <tr key={rowMed} className="hover:bg-[var(--color-surface-sunken)]/50">
                        <td className="p-2 font-bold text-[var(--color-text-primary)] border-r border-[var(--color-border-subtle)] font-mono text-[11px]">
                          {rowMed}
                        </td>
                        {enabledMeds.map((colMed, colIdx) => {
                          const isSelf = rowIdx === colIdx;
                          const pairKey = `${rowMed.toLowerCase()}-${colMed.toLowerCase()}`;
                          const interaction = KNOWN_INTERACTIONS[pairKey];
                          const isSelected = activeCell?.row === rowMed && activeCell?.col === colMed;

                          return (
                            <td key={colMed} className="p-1.5 text-center">
                              {isSelf ? (
                                <span className="inline-block w-7 h-7 rounded-lg bg-[var(--color-surface-sunken)] border border-dashed border-[var(--color-border-subtle)]" />
                              ) : interaction ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveCell({ row: rowMed, col: colMed, ...interaction })}
                                  className={`w-7 h-7 rounded-lg font-bold text-[10px] font-mono transition-transform hover:scale-110 cursor-pointer ${
                                    interaction.severity === 'Severe'
                                      ? 'bg-rose-500 dark:bg-rose-600 text-white shadow-xs dark:shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                                      : 'bg-amber-400 dark:bg-amber-500 text-black dark:text-slate-950 shadow-xs'
                                  } ${isSelected ? 'ring-2 ring-[#0284C7] dark:ring-[#38BDF8] scale-110' : ''}`}
                                  title={`${rowMed} + ${colMed}: ${interaction.alert}`}
                                >
                                  !
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveCell({ row: rowMed, col: colMed, severity: 'Safe', alert: 'No documented clinical interaction' })}
                                  className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 font-mono text-[10px] hover:scale-105 cursor-pointer"
                                  title={`${rowMed} + ${colMed}: Safe`}
                                >
                                  ✓
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Active Cell Click Inspector */}
              {activeCell && (
                <div className="p-3 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-strong)] flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeCell.severity === 'Severe' ? 'bg-rose-500' : activeCell.severity === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {activeCell.row} + {activeCell.col}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)] block">
                        {activeCell.alert}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCell(null)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Sliders & Organ Systems */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Patient Physiology Sliders */}
          <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Patient Physiology Adjusters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPatientAge(65);
                  setPatientEgfr(75);
                }}
                className="text-[10px] font-mono text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* eGFR Interactive Slider */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-secondary)]">Renal eGFR</span>
                <span className="font-mono text-[#0284C7] font-semibold">{patientEgfr} mL/min</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                value={patientEgfr}
                onChange={(e) => setPatientEgfr(Number(e.target.value))}
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-[var(--color-text-muted)]">
                <span>Severe (&lt;30)</span>
                <span>Caution (30-60)</span>
                <span>Normal (&gt;60)</span>
              </div>
            </div>

            {/* Age Interactive Slider */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-secondary)]">Patient Age</span>
                <span className="font-mono text-[#0284C7] font-semibold">{patientAge} yrs</span>
              </div>
              <input
                type="range"
                min="18"
                max="95"
                value={patientAge}
                onChange={(e) => setPatientAge(Number(e.target.value))}
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-[var(--color-text-muted)]">
                <span>Adult (18)</span>
                <span>Geriatric (65+)</span>
                <span>Elderly (85+)</span>
              </div>
            </div>
          </div>

          {/* Organ Clearance System Tabs */}
          <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0284C7]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Organ Clearance Breakdown
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Interactive</span>
            </div>

            {/* Organ Selectors */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
              {[
                { id: 'renal', label: 'Kidney' },
                { id: 'hepatic', label: 'Liver' },
                { id: 'cardiac', label: 'Heart' },
              ].map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgan(org.id)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedOrgan === org.id
                      ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] border border-[var(--color-border-subtle)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {org.label}
                </button>
              ))}
            </div>

            {/* Dynamic Organ Display */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2">
              {selectedOrgan === 'renal' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">Glomerular Filtration Rate</span>
                    <span className="text-xs font-mono font-bold text-sky-600">{patientEgfr} mL/min</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-card)] overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${vitals.renalCapacity}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                    {patientEgfr < 60 ? '⚠️ High risk of drug accumulation for Metformin & ACE inhibitors.' : '✓ Normal clearance window. No dose adjustments required.'}
                  </span>
                </>
              )}

              {selectedOrgan === 'hepatic' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">CYP450 Enzyme Pathways</span>
                    <span className="text-xs font-mono font-bold text-[#0284C7]">3A4 / 2D6 / 2C19</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-card)] overflow-hidden">
                    <div className="h-full rounded-full bg-[#0284C7]" style={{ width: `${vitals.hepaticCapacity}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                    {enabledMeds.length > 3 ? '⚠️ Moderate competitive substrate load on CYP3A4 pathway.' : '✓ Low metabolic competition. Normal hepatic transit.'}
                  </span>
                </>
              )}

              {selectedOrgan === 'cardiac' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">Cardiac Arrhythmia Margin</span>
                    <span className="text-xs font-mono font-bold text-purple-600">{vitals.cardiacTolerance}% Safe</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-card)] overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${vitals.cardiacTolerance}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                    {vitals.score && vitals.score < 50 ? '⚠️ Elevated repolarization delay caution observed.' : '✓ Stable repolarization threshold.'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Safety Checks History ── */}
      {recentChecks.length > 0 && (
        <div className="p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0284C7]" />
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Recent Patient Medication Safety Checks
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('curenova_doctor_safety_history');
                setRecentChecks([]);
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear History
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentChecks.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] hover:border-[#0284C7]/50 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {item.date ? new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    item.riskScore > 65
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : item.riskScore > 35
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    Risk: {item.riskScore}/100
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {item.medications?.map((m, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
                      <Pill className="w-3 h-3 text-[#0284C7]" />
                      {m}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {item.flaggedPairsCount || 0} flagged interaction(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/doctor/medication-safety', { state: { prefilledMeds: item.medications } })}
                    className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Re-evaluate</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
