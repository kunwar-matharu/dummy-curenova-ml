import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Stethoscope,
  Microscope,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Search,
  Database,
  Moon,
  Sun,
  Menu,
  X,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Share2,
  Cpu,
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LandingPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleNotice, setRoleNotice] = useState('');
  const [previewTab, setPreviewTab] = useState('ranking'); // 'ranking' | 'evidence' | 'safety'

  const handleRoleLaunch = (targetRole) => {
    if (user) {
      if (user.role === targetRole) {
        navigate(`/${targetRole}/dashboard`);
      } else {
        setRoleNotice(`You are currently signed in as a ${user.role.toUpperCase()}. Sign out to access the ${targetRole.toUpperCase()} portal.`);
      }
    } else {
      navigate(`/login?role=${targetRole}`);
    }
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-ground)] text-[var(--color-text-primary)] transition-colors">
      
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]/95 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-sm shadow-[#0284C7]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
                Cure<span className="text-[#0284C7] dark:text-[#38BDF8]">Nova</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
                Biomedical AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[var(--color-text-secondary)]">
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('researcher-role')}
              className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              For Researchers
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('doctor-role')}
              className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              For Doctors
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('patient-role')}
              className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              For Patients
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <Link
              to="/evidence"
              className="hover:text-[var(--color-text-primary)] transition-colors"
            >
              Evidence Explorer
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FBBF24]" /> : <Moon className="w-4 h-4 text-[#64748B]" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/${user.role}/dashboard`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-sm"
                >
                  Go to Dashboard ({user.role.toUpperCase()})
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-6 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Platform Capabilities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('researcher-role')}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                For Researchers
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('doctor-role')}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                For Doctors
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('patient-role')}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                For Patients
              </button>
              <Link
                to="/evidence"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg text-left bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Evidence Explorer
              </Link>
            </div>
            {!user && (
              <div className="pt-2 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl text-white bg-[#0284C7]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Role Restriction Banner if switched while signed in */}
      {roleNotice && (
        <div className="w-full bg-[#FFFBEB] dark:bg-amber-950/40 border-b border-[#FDE68A] dark:border-amber-800/40 px-4 py-2 text-center text-xs text-[#92400E] dark:text-amber-200 font-medium flex items-center justify-center gap-3">
          <span>{roleNotice}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              setRoleNotice('');
              navigate('/login');
            }}
            className="px-2.5 py-0.5 rounded-md bg-[#B45309] text-white font-bold hover:bg-[#92400E] transition-colors cursor-pointer text-[11px]"
          >
            Sign Out Now
          </button>
        </div>
      )}

      {/* ── B. Hero Section (Two-Column Desktop Layout) ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Clear, concise message and actionable CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Evidence-Grounded Drug Repurposing & Polypharmacy Intelligence</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9] leading-[1.15]">
                Explore Drug Repurposing. Examine the Evidence. <br className="hidden sm:inline" />
                <span className="text-[#0284C7] dark:text-[#38BDF8]">Make Research More Transparent.</span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                CureNova brings drug discovery signals, biomedical literature, evidence verification, and medication interaction information into one structured workspace.
              </p>
            </div>

            {/* Primary & Secondary Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRoleLaunch('researcher')}
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Start Research</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="px-5 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-[#17324D] dark:text-[#F1F5F9] bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-all cursor-pointer shadow-xs"
              >
                Explore the Platform
              </button>
            </div>

            {/* Small trust statement explaining evidence traceability */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#15803D] shrink-0" />
              <span>
                Evidence traceable to National Library of Medicine (PubMed), openFDA FAERS, and ChEMBL 34 databases.
              </span>
            </div>
          </div>

          {/* Right Column: Realistic Live Product Preview Composition */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-xl overflow-hidden text-left">
              
              {/* Product Preview Topbar */}
              <div className="px-4 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-[var(--color-text-muted)] ml-2">
                    curenova://repurposing-pipeline/alzheimers
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
                  Illustrative Live Model
                </span>
              </div>

              {/* Product Preview Tabs */}
              <div className="flex border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('ranking')}
                  className={`flex-1 py-2.5 px-3 text-center font-bold transition-colors cursor-pointer border-b-2 ${
                    previewTab === 'ranking'
                      ? 'border-[#0284C7] text-[#0284C7] bg-[var(--color-surface-hover)]'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Candidate Ranking
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('evidence')}
                  className={`flex-1 py-2.5 px-3 text-center font-bold transition-colors cursor-pointer border-b-2 ${
                    previewTab === 'evidence'
                      ? 'border-[#0284C7] text-[#0284C7] bg-[var(--color-surface-hover)]'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Evidence Dossier
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('safety')}
                  className={`flex-1 py-2.5 px-3 text-center font-bold transition-colors cursor-pointer border-b-2 ${
                    previewTab === 'safety'
                      ? 'border-[#0284C7] text-[#0284C7] bg-[var(--color-surface-hover)]'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Interaction Check
                </button>
              </div>

              {/* Preview Body Content */}
              <div className="p-5 space-y-4 text-xs">
                {previewTab === 'ranking' && (
                  <div className="space-y-3">
                    {/* Active Query Pill */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span className="font-semibold text-[var(--color-text-primary)]">Query: Alzheimer's Disease</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">MeSH: D000544</span>
                    </div>

                    {/* Candidate Row 1: Metformin */}
                    <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] hover:border-[#0284C7]/50 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0A2540] text-white">#1</span>
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">Metformin</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Approved: Type 2 Diabetes</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[#0284C7]">
                          <span className="text-sm">92.4</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">/ 100</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                        AMPK activation enhances cerebral glucose uptake, reduces tau hyperphosphorylation via GSK3β inhibition.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                          3 Clinical Trials
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] text-[10px] font-mono">
                          48 PubMed Records
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px]">
                          Renal Threshold: eGFR &gt; 30
                        </span>
                      </div>
                    </div>

                    {/* Candidate Row 2: Fasudil */}
                    <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0A2540] text-white">#2</span>
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">Fasudil</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Approved: Vasospasm</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[#0284C7]">
                          <span className="text-sm">84.1</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">/ 100</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                        Selective Rho-kinase (ROCK1/2) inhibition stimulates microglial amyloid-beta clearance in preclinical models.
                      </p>
                    </div>
                  </div>
                )}

                {previewTab === 'evidence' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#0284C7] font-bold">PMID: 33188177</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Lancet Healthy Longev (2021)</span>
                      </div>
                      <h4 className="font-bold text-xs text-[var(--color-text-primary)]">
                        Metformin treatment is associated with reduced dementia incidence in large electronic health records cohort
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                        Longitudinal study of 115,845 patients followed for 8.2 years demonstrated 24% reduced hazard of incident dementia (aHR 0.76).
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#2563EB] font-bold">NCT04098666</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Phase II/III Trial</span>
                      </div>
                      <h4 className="font-bold text-xs text-[var(--color-text-primary)]">
                        Metformin in Preventing Cognitive Decline in Older Adults (MAP4AD)
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        Active multi-center trial evaluating memory executive scores across 370 participants.
                      </p>
                    </div>
                  </div>
                )}

                {previewTab === 'safety' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] dark:bg-red-950/30 text-left space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#991B1B] dark:text-red-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C]" />
                          Warfarin + Aspirin Interaction
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B91C1C] text-white">
                          High Hazard
                        </span>
                      </div>
                      <p className="text-[11px] text-[#991B1B] dark:text-red-200 leading-relaxed">
                        Dual antiplatelet and anticoagulant synergism produces severe hemorrhagic risk (ROR 3.84). Requires clinical surveillance.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] dark:bg-emerald-950/30 text-left space-y-1">
                      <span className="font-bold text-xs text-[#166534] dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                        Documented Safe: Atorvastatin + Amlodipine
                      </span>
                      <p className="text-[11px] text-[#166534] dark:text-emerald-200">
                        Compatible cardiovascular co-prescription with no major pharmacokinetic metabolic conflict.
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Pipeline Steps Bar */}
                <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                  <span>Workflow: Evidence Traceable</span>
                  <span className="text-[#0284C7] font-bold">4 Verified Agents Complete</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── C. Trust and Capability Strip ── */}
      <section className="w-full border-y border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            
            <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-[#0284C7]">
                <Database className="w-4 h-4" />
                <span className="font-bold text-xs uppercase font-mono tracking-wider">Traceable</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Evidence-Linked Research</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Every candidate links directly to PubMed and FDA records.</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-[#17324D] dark:text-[#38BDF8]">
                <Cpu className="w-4 h-4" />
                <span className="font-bold text-xs uppercase font-mono tracking-wider">Scoring</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Transparent Ranking</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Breakdown of biological congruence and literature support.</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-[#B45309]">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-xs uppercase font-mono tracking-wider">Unbiased</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Supporting & Conflicting</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Contradictory findings and safety signals preserved.</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-[#15803D]">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold text-xs uppercase font-mono tracking-wider">Safety</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Medication Analysis</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Pairwise interaction checks and digital twin modeling.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── D. Product Capabilities Section (3-Column Grid) ── */}
      <section id="capabilities" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-left space-y-10">
        
        <div className="space-y-3 max-w-2xl">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0284C7]">
            Platform Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
            Three Interconnected Clinical Intelligence Modules
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            Explore dedicated workflows engineered specifically for translation research, polypharmacy checking, and patient clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Drug Repurposing Research */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#0284C7] transition-all shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold">
                <Microscope className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Drug Repurposing Research
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Search a disease or small molecule to identify alternative indications supported by ChEMBL bioassays and molecular targets.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                  <span>Disease-to-drug & target association queries</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                  <span>Multi-factor candidate congruence ranking</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                  <span>Full PubMed & clinical trial evidence linking</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleRoleLaunch('researcher')}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Explore Repurposing Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Evidence Verification */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#17324D] transition-all shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#17324D]/10 text-[#17324D] dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Evidence Verification
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Inspect primary literature sources, evaluate retrospective trials, and distinguish direct biochemical evidence from indirect inferences.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#17324D] dark:bg-[#38BDF8]" />
                  <span>Inspect study design, cohorts, and DOIs</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#17324D] dark:bg-[#38BDF8]" />
                  <span>Cross-check contradictory findings and limits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#17324D] dark:bg-[#38BDF8]" />
                  <span>Export comprehensive research dossiers</span>
                </li>
              </ul>
            </div>
            <Link
              to="/evidence"
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-[#17324D] dark:text-white bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open Evidence Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Medication Safety */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#15803D] transition-all shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Medication Safety & Polypharmacy
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Evaluate complex polypharmacy regimens, test pairwise drug interactions, and simulate therapeutic changes before adjusting regimens.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  <span>Pairwise interaction matrix & mechanism alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  <span>Digital twin simulation for regimen changes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  <span>Organ clearance monitoring (eGFR & hepatic)</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleRoleLaunch('doctor')}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-[#166534] bg-[#F0FDF4] hover:bg-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Check Medication Safety</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* ── E. How the Platform Works (Numbered 5-Step Workflow) ── */}
      <section id="how-it-works" className="w-full bg-[var(--color-surface-card)] border-y border-[var(--color-border-subtle)] py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
          
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0284C7]">
              Workflow Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
              How CureNova Works
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              An evidence-grounded sequence engineered to deliver transparent, accountable scientific insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2 relative">
              <span className="text-2xl font-black text-[#0284C7] font-mono block">01</span>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Enter Query</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Provide a disease phenotype, target gene, or small molecule to initiate evaluation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2 relative">
              <span className="text-2xl font-black text-[#0284C7] font-mono block">02</span>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Retrieve Evidence</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Extract peer-reviewed trials, ChEMBL bioassays, and openFDA safety records.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2 relative">
              <span className="text-2xl font-black text-[#0284C7] font-mono block">03</span>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Rank Candidates</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Compute biological plausibility, target congruence, and volume of evidence.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2 relative">
              <span className="text-2xl font-black text-[#0284C7] font-mono block">04</span>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Verify & Challenge</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Compare supporting findings against conflicting trials and adverse signals.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2 relative">
              <span className="text-2xl font-black text-[#0284C7] font-mono block">05</span>
              <h3 className="font-bold text-xs text-[var(--color-text-primary)]">Synthesize Report</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Review structured findings, safety limitations, and next experimental steps.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── F. Role-Specific Entry Points (3 Clearly Differentiated Cards) ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-left space-y-10">
        
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0284C7]">
            Specialized Portals
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
            Select Your Workspace
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            Tailored interfaces matching your professional workflows and clinical objectives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Researcher Portal */}
          <div id="researcher-role" className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#0284C7] transition-all shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold">
                  <Microscope className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                  Biomedical (PhD)
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Researcher Portal
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                "Investigate drug–disease relationships and review the evidence."
              </p>
              <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1.5 text-xs">
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-bold uppercase block">
                  Included Features:
                </span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Repurposing Candidate Explorer</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Knowledge Graph Network</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Research Dossier PDF Generator</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRoleLaunch('researcher')}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Enter Researcher Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Doctor Portal */}
          <div id="doctor-role" className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#17324D] transition-all shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#17324D]/10 text-[#17324D] dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#17324D]/10 text-[#17324D] dark:bg-sky-950/40 dark:text-sky-300">
                  Clinician (MD)
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Doctor Portal
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                "Review medication information and supported interaction findings."
              </p>
              <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1.5 text-xs">
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-bold uppercase block">
                  Included Features:
                </span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Multi-Drug Interaction Matrix</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Patient Digital Twin Simulation</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Pharmacovigilance Risk Alerts</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRoleLaunch('doctor')}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-[#17324D] hover:bg-[#10263A] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Enter Doctor Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Patient Portal */}
          <div id="patient-role" className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[#15803D] transition-all shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-bold">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534]">
                  Personal Health
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Patient Portal
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                "Explore understandable medicine information and established warnings."
              </p>
              <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1.5 text-xs">
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-bold uppercase block">
                  Included Features:
                </span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Everyday Plain-Language Summaries</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Doctor Discussion Question Sheet</span>
                <span className="block text-[var(--color-text-primary)] font-medium">• Medicine Education & Warnings</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRoleLaunch('patient')}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-[#15803D] hover:bg-[#166534] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Enter Patient Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* ── G. Scientific Limitations Section ── */}
      <section className="w-full bg-[var(--color-surface-card)] border-t border-[var(--color-border-subtle)] py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-[#B45309]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Scientific & Clinical Boundaries</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Transparent Decision-Support, Not Autonomous Prescribing
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
            CureNova supports research and medication-information workflows. It does not diagnose, prescribe, or establish treatment efficacy from AI predictions. Missing evidence does not imply safety, and repurposing candidates represent investigational research hypotheses derived from published literature that require prospective clinical trial validation.
          </p>
        </div>
      </section>

      {/* ── H. Professional Footer ── */}
      <footer className="w-full border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-10 text-xs text-[var(--color-text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-left">
            
            <div className="col-span-2 space-y-3">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-base font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
                  Cure<span className="text-[#0284C7] dark:text-[#38BDF8]">Nova</span>
                </span>
              </Link>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-sm leading-relaxed">
                Agentic AI Platform for Evidence-Grounded Drug Repurposing and Polypharmacy Risk Analysis.
              </p>
              <span className="text-[11px] font-mono block">
                Version 1.0.0 · Evidence Grounded
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block">
                Platform
              </span>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/evidence" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Evidence Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/knowledge-graph" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Knowledge Graph
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('capabilities')} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                    Capabilities
                  </button>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Methodology & About
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block">
                Portals
              </span>
              <ul className="space-y-1.5">
                <li>
                  <button type="button" onClick={() => handleRoleLaunch('researcher')} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                    Researcher Portal
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleRoleLaunch('doctor')} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                    Doctor Workspace
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleRoleLaunch('patient')} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                    Patient Home
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block">
                Access
              </span>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/login" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Account Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link to="/forgot-password" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Password Recovery
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>
              © {new Date().getFullYear()} CureNova Platform. All rights reserved. For biomedical research and educational purposes only.
            </p>
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-[var(--color-text-primary)] transition-colors">Methodology</Link>
              <Link to="/evidence" className="hover:text-[var(--color-text-primary)] transition-colors">Indexed Sources</Link>
              <Link to="/login" className="hover:text-[var(--color-text-primary)] transition-colors">Sign In</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
