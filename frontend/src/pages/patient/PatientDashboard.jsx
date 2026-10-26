import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  ShieldCheck,
  Plus,
  ArrowRight,
  FileText,
  Pill,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { safetyService } from '../../services/api';
import { ClinicalHighlightBox } from '../../components/ui/ClinicalHighlightBox';

const SYMPTOM_CHECKER_ITEMS = [
  { id: 'dizziness', label: 'Dizziness', alert: 'Often linked to blood pressure medicines or dehydration. Avoid sudden standing.' },
  { id: 'stomach', label: 'Stomach Upset', alert: 'Common with metformin or painkillers. Taking doses with food can help protect your stomach.' },
  { id: 'bruising', label: 'Easy Bruising', alert: 'Important alert when blood thinners or NSAIDs are taken together.' },
  { id: 'cough', label: 'Dry Tickly Cough', alert: 'Common mild side effect of ACE inhibitors. Consult your physician for an alternative.' },
  { id: 'muscle', label: 'Muscle Aches', alert: 'Tell your doctor if taking cholesterol statins with unexplained cramping.' },
];

export const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Real user medicine list from localStorage (starts empty if user hasn't added anything)
  const [savedMeds, setSavedMeds] = useState(() => {
    try {
      const stored = localStorage.getItem('curenova_patient_meds');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [quickMedInput, setQuickMedInput] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [catalog, setCatalog] = useState([]);

  // Fetch real catalog for autocomplete suggestions
  useEffect(() => {
    safetyService
      .getCatalog()
      .then((res) => setCatalog(res.catalog || []))
      .catch((err) => console.error('Failed to load catalog', err));
  }, []);

  // Real dynamic daily schedule generated from actual medicines
  const [pillSchedule, setPillSchedule] = useState(() => {
    return savedMeds.map((med, idx) => ({
      id: idx + 1,
      time: idx % 2 === 0 ? 'Morning (8:00 AM)' : 'Evening (7:00 PM)',
      med: `${med}`,
      taken: false,
    }));
  });

  // Sync schedule whenever savedMeds change
  useEffect(() => {
    setPillSchedule(
      savedMeds.map((med, idx) => ({
        id: idx + 1,
        time: idx % 2 === 0 ? 'Morning (8:00 AM)' : 'Evening (7:00 PM)',
        med: `${med}`,
        taken: false,
      }))
    );
  }, [savedMeds]);

  const toggleDose = (id) => {
    setPillSchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, taken: !item.taken } : item))
    );
  };

  const takenCount = pillSchedule.filter((p) => p.taken).length;
  const progressPercent = pillSchedule.length > 0 ? Math.round((takenCount / pillSchedule.length) * 100) : 0;

  const handleAddMed = (drugName) => {
    const clean = (drugName || quickMedInput).trim();
    if (!clean) return;
    if (!savedMeds.includes(clean)) {
      const updated = [...savedMeds, clean];
      setSavedMeds(updated);
      try {
        localStorage.setItem('curenova_patient_meds', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setQuickMedInput('');
  };

  const handleRemoveMed = (idx) => {
    const updated = savedMeds.filter((_, i) => i !== idx);
    setSavedMeds(updated);
    try {
      localStorage.setItem('curenova_patient_meds', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 w-full pb-8">
      {/* ── Header Row ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              My Medication Home
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Personal Health Guide
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Welcome, <strong>{user?.name || 'Friend'}</strong>. Manage your prescription medicines and check their safety in plain language.
          </p>
        </div>

        {/* Live Dose Progress Chip */}
        <div className="flex items-center gap-3 bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] px-3.5 py-2 rounded-2xl shadow-2xs shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs">
            {progressPercent}%
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-muted)] block leading-none">
              Daily Doses
            </span>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {takenCount} of {pillSchedule.length} Taken
            </span>
          </div>
        </div>
      </div>

      {/* ── 2-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Medicine Cabinet & Schedule */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Medicine Input & Cabinet */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  My Prescription & Vitamin Cabinet
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Add medicines to build your daily schedule and check for interactions.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {savedMeds.length} in List
              </span>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddMed(); }} className="flex gap-2">
              <input
                type="text"
                value={quickMedInput}
                onChange={(e) => setQuickMedInput(e.target.value)}
                placeholder="Type a medicine name (e.g. Aspirin, Metformin, Vitamin D)..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Recognized Common Medicines from Backend Catalog */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-muted)]">
                Common Clinical Medicines:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {catalog.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleAddMed(c.canonical_name)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    + {c.canonical_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Highlight Box for My Prescriptions & Over-The-Counter Medicines */}
            <ClinicalHighlightBox
              variant="primary"
              title={`My Saved Medicines (${savedMeds.length})`}
              subtitle="All medicines you take regularly. Click check safety below to see if they mix safely."
              badge={savedMeds.length > 0 ? `${savedMeds.length} added` : undefined}
              icon={Pill}
              className="mt-2"
            >
              <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
                {savedMeds.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)] italic px-1">
                    Your medicine cabinet is currently empty. Add your medicines above or pick from common medicines.
                  </span>
                ) : (
                  savedMeds.map((med, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-card)] border border-[#0284C7]/30 text-xs font-bold text-[#0A2540] dark:text-[#E0F2FE] shadow-2xs"
                    >
                      <Pill className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
                      <span>{med}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(idx)}
                        className="text-[var(--color-text-muted)] hover:text-rose-600 cursor-pointer ml-1 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </ClinicalHighlightBox>

            <button
              type="button"
              disabled={savedMeds.length === 0}
              onClick={() => navigate('/patient/medication-safety', { state: { prefilledMeds: savedMeds } })}
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Check Medicine Safety & Interactions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Daily Schedule Organizer */}
          {pillSchedule.length > 0 && (
            <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Daily Dose Tracker</span>
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Tap a dose to mark as <strong>Taken</strong> or <strong>Pending</strong>.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  {progressPercent}% Complete
                </span>
              </div>

              <div className="space-y-2">
                {pillSchedule.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleDose(item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      item.taken
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-[var(--color-surface-sunken)] border-[var(--color-border-subtle)] hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs ${
                        item.taken ? 'bg-emerald-600 text-white' : 'border border-[var(--color-border-strong)] bg-white dark:bg-black/20'
                      }`}>
                        {item.taken ? <Check className="w-3 h-3" /> : null}
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${item.taken ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                          {item.med}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          {item.time}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      item.taken ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-800 text-[var(--color-text-muted)]'
                    }`}>
                      {item.taken ? 'Taken' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Symptom Checker & Doctor Sheet */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Instant Symptom Checker */}
          <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Instant Symptom Checker
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Tap to inspect</span>
            </div>

            {/* Clickable Symptom Pills */}
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_CHECKER_ITEMS.map((item) => {
                const isSelected = selectedSymptom?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSymptom(isSelected ? null : item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:border-emerald-500'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Live Symptom Result Box */}
            {selectedSymptom ? (
              <ClinicalHighlightBox
                variant="warning"
                title={`${selectedSymptom.label} Medicine Guidance`}
                icon={AlertTriangle}
                subtitle="Review before taking new medications"
              >
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  {selectedSymptom.alert}
                </p>
              </ClinicalHighlightBox>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface-sunken)] border border-dashed border-[var(--color-border-subtle)] text-center text-xs text-[var(--color-text-muted)]">
                Tap any symptom above to see medication safety guidance.
              </div>
            )}
          </div>

          {/* Doctor Visit Checklist */}
          <div className="p-5 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Doctor Visit Checklist
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Generate a clean, single-page summary of your current medicines and safety questions to bring to your next appointment.
            </p>
            <button
              type="button"
              onClick={() => navigate('/patient/results')}
              className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Printable Summary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
