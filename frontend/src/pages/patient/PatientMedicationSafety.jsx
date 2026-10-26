import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HeartHandshake,
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Info,
  Pill,
  X
} from 'lucide-react';
import { safetyService } from '../../services/api';
import AnalysisProgress from '../../components/AnalysisProgress';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ClinicalHighlightBox } from '../../components/ui/ClinicalHighlightBox';

export const PatientMedicationSafety = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [medications, setMedications] = useState(
    location.state?.prefilledMeds || []
  );
  const [newMed, setNewMed] = useState('');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  const commonMeds = [
    'Aspirin',
    'Warfarin',
    'Metformin',
    'Omeprazole (Prilosec)',
    'Lisinopril',
    'Ibuprofen (Advil)',
    'Atorvastatin (Lipitor)'
  ];

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newMed.trim()) return;
    if (!medications.includes(newMed.trim())) {
      setMedications([...medications, newMed.trim()]);
    }
    setNewMed('');
  };

  const handleAddPreset = (medName) => {
    const cleanName = medName.split('(')[0].trim();
    if (!medications.includes(cleanName)) {
      setMedications([...medications, cleanName]);
    }
  };

  const handleRemove = (idx) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const handleCheckSafety = async () => {
    if (medications.length === 0) {
      setError('Please enter at least one medicine to check.');
      return;
    }
    setError('');
    setExecuting(true);

    try {
      localStorage.setItem('curenova_patient_meds', JSON.stringify(medications));
      const response = await safetyService.analyze(medications, null, 'patient');
      setExecuting(false);
      navigate('/patient/results', { state: { patientData: response } });
    } catch (err) {
      setExecuting(false);
      setError(err.message || 'Safety check failed. Please check backend connectivity.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[#0284C7]">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Check Your Medicine Safety
          </h1>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Type or select the medicines and supplements you take to learn how they interact in everyday plain language.
        </p>
      </div>

      <SafetyDisclaimer variant="compact" />

      {executing && (
        <div className="py-8">
          <AnalysisProgress
            title="Checking Your Medicine Safety"
            subtitle="Reviewing Published Medical Guides and Safety Guidelines"
          />
        </div>
      )}

      {!executing && (
        <div className="space-y-6">
          {/* Main Input Card */}
          <Card elevation="raised" className="p-6 sm:p-7 space-y-5">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">Your Current Medicines</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Add prescription tablets, eye drops, injections, or over-the-counter vitamins you take regularly
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} className="flex gap-2.5">
              <input
                type="text"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                placeholder="Type medicine name (e.g. Aspirin, Metformin, Vitamin D)..."
                className="flex-1 px-4 py-3 text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Plus}
                className="!bg-[#0284C7] hover:!bg-[#0369A1] text-white shadow-xs"
              >
                Add Medicine
              </Button>
            </form>

            {/* Quick-Add Popular Medicines */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] block">
                Quick Select Common Medicines:
              </span>
              <div className="flex flex-wrap gap-2">
                {commonMeds.map((med) => (
                  <button
                    key={med}
                    type="button"
                    onClick={() => handleAddPreset(med)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] hover:border-[#0284C7]/40 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
                  >
                    + {med}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Medicine Highlight Box */}
            <div className="pt-2">
              <ClinicalHighlightBox
                variant="primary"
                title="Medicines Ready to Check"
                subtitle="Review your list before starting the safety check"
                badge={`${medications.length} Added`}
                icon={Pill}
              >
                {medications.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] dark:border-[#0284C7]/30 text-[var(--color-text-primary)] text-sm font-semibold shadow-2xs"
                      >
                        <Pill className="w-4 h-4 text-[#0284C7]" />
                        <span>{med}</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="text-[var(--color-text-muted)] hover:text-[#DC2626] transition-colors cursor-pointer ml-1"
                          title={`Remove ${med}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] text-center text-xs text-[var(--color-text-muted)]">
                    No medicines added yet. Type a medicine above or click one of the quick suggestions.
                  </div>
                )}
              </ClinicalHighlightBox>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[var(--color-status-critical-bg)] border border-[var(--color-status-critical-border)] text-[var(--color-status-critical-text)] text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[var(--color-text-muted)]">
                Plain language safety guidance grounded in peer-reviewed medical evidence
              </span>
              <Button
                variant="primary"
                size="lg"
                icon={ShieldCheck}
                disabled={medications.length === 0}
                onClick={handleCheckSafety}
                className="w-full sm:w-auto !bg-[#0284C7] hover:!bg-[#0369A1] text-white shadow-sm"
              >
                Check My Medicine Safety
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PatientMedicationSafety;
