import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Stethoscope,
  Microscope,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Moon,
  Sun,
  Menu,
  X,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Cpu,
  Zap,
  FlaskConical,
  Dna,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HeroCapsuleFusion } from '../components/HeroCapsuleFusion';

export const LandingPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleNotice, setRoleNotice] = useState('');

  const handleRoleLaunch = (targetRole) => {
    if (user) {
      if (user.role === targetRole) {
        navigate(`/${targetRole}/dashboard`);
      } else {
        setRoleNotice(
          `You are currently signed in as a ${user.role.toUpperCase()}. Sign out or switch roles to enter the ${targetRole.toUpperCase()} workspace.`
        );
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
    <div className="relative min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors selection:bg-blue-500 selection:text-white">

      {/* ── STICKY GLASS NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                Cure<span className="text-blue-600 dark:text-blue-400">Nova</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80">
                Biomedical AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <button
              type="button"
              onClick={() => scrollToSection('portals')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Clinical Portals
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('methodology')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Methodology
            </button>
            <Link
              to="/evidence"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <span>Evidence Explorer</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
            <Link
              to="/knowledge-graph"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <span>Knowledge Graph</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-800/80 transition-colors cursor-pointer shadow-2xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/${user.role}/dashboard`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm"
                >
                  Dashboard ({user.role.toUpperCase()})
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800/80 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-3 pb-6 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => scrollToSection('portals')}
                  className="p-2.5 rounded-lg text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Clinical Portals
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('capabilities')}
                  className="p-2.5 rounded-lg text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Platform Capabilities
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('methodology')}
                  className="p-2.5 rounded-lg text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Methodology
                </button>
                <Link
                  to="/evidence"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Evidence Explorer
                </Link>
              </div>
              {!user && (
                <div className="pt-2 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl text-white bg-blue-600"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Role Notice Toast */}
      {roleNotice && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between z-50">
          <span>{roleNotice}</span>
          <button type="button" onClick={() => setRoleNotice('')} className="p-1 hover:bg-black/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 1. HERO SECTION (2-COLUMN SPLIT: TEXT LEFT, CAPSULE RIGHT) ── */}
      <section className="relative z-10 pt-10 pb-16 sm:pt-14 sm:pb-24 overflow-hidden bg-gradient-to-b from-blue-50/20 via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-900/60 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Authoritative Clean Typography (Unobstructed, crisp readability) */}
            <div className="lg:col-span-7 text-left space-y-6">
              
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Grounded Across PubMed · openFDA FAERS · ChEMBL 34</span>
              </div>

              {/* Primary Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-[1.09]">
                AI-Powered Drug Repurposing &amp; <br />
                <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
                  Precision Medication Safety
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
                Accelerate translational candidate discovery, simulate patient digital twin clearance, and eliminate adverse drug interactions with explainable biomedical intelligence.
              </p>

              {/* Action CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => scrollToSection('portals')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>Explore Clinical Portals</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/evidence"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold text-sm transition-all shadow-2xs"
                >
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Browse Evidence Base</span>
                </Link>
              </div>

              {/* 4 Key Metric Cards (Clean 2x2 grid on left) */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                {[
                  { label: 'Evidence Dossiers', value: '38,000+', desc: 'PubMed citations', icon: BookOpen, accent: 'border-blue-500', iconColor: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Validated Targets', value: '14,200+', desc: 'Binding profiles', icon: Dna, accent: 'border-teal-500', iconColor: 'text-teal-600 dark:text-teal-400' },
                  { label: 'Hazard Delta', value: '< 180 ms', desc: 'Real-time twin', icon: Zap, accent: 'border-amber-500', iconColor: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Explainable AI', value: '100%', desc: 'Traceability', icon: ShieldCheck, accent: 'border-emerald-500', iconColor: 'text-emerald-600 dark:text-emerald-400' },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border border-gray-200/80 dark:border-gray-800/80 border-t-2 ${stat.accent} bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-2xs`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <stat.icon className={`w-3 h-3 ${stat.iconColor}`} />
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">{stat.label}</span>
                    </div>
                    <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{stat.value}</div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{stat.desc}</div>
                  </div>
                ))}
              </div>

            </div>

            {/* Right Column: Dedicated 3D Capsule Fusion Stage (Completely Unobstructed!) */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
              <HeroCapsuleFusion />
            </div>

          </div>

        </div>
      </section>

      {/* ── 2. CLINICAL ROLE PORTALS ── */}
      <section id="portals" className="relative z-10 py-20 bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl border-y border-gray-200/80 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clinical Stakeholders</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Dedicated Workspaces for Healthcare Teams
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Purpose-built environments designed around the daily workflows of clinicians, researchers, and patients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* 1. Clinician / Doctor Portal Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 border-t-4 border-t-blue-600 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-blue-500/60 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    ROR 3.84 Bleed Shield
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400">
                    Clinical Intelligence
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    Clinician Workspace
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Evaluate drug-drug interaction safety, simulate patient-specific digital twin clearance across eGFR and age, and export clinical consultation notes.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Polypharmacy interaction hazard matrices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Renal &amp; hepatic clearance digital twin</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Defensible clinical consultation reports</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleRoleLaunch('doctor')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Launch Clinician Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Researcher Portal Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 border-t-4 border-t-teal-500 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-teal-500/60 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
                    <Microscope className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                    Ki 14.2 nM Pocket
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-teal-600 dark:text-teal-400">
                    Translational AI
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    Researcher Portal
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Screen FDA-approved small molecule libraries for novel therapeutic indications, compute binding affinities, and trace PubMed evidence graphs.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Ligand-receptor docking score ranking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Novel indication repurposing predictions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Knowledge graph citation traceability</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleRoleLaunch('researcher')}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Launch Researcher Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Patient Companion Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 border-t-4 border-t-emerald-500 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-emerald-500/60 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    Plain-Language Guide
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Health Companion
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    Patient Portal
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Understand your medications in plain language, track daily schedules, review potential side-effects, and prepare informed questions for your doctor.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Jargon-free medicine explanations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Interactive symptom safety check</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Downloadable medication wallet cards</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleRoleLaunch('patient')}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Launch Patient Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 3. CORE ARCHITECTURE CAPABILITIES ── */}
      <section id="capabilities" className="relative z-10 py-20 bg-gray-50/90 dark:bg-gray-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Precision Intelligence Stack
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Three interconnected clinical engines delivering high-defensibility pharmacology intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3.5 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Polypharmacy Safety Shield
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Flags CYP450 metabolic competition, cumulative QT prolongation, and synergistic bleeding hazards before prescription finalization.
              </p>
            </div>

            <div className="p-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3.5 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Target-Ligand Binding Engine
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Evaluates pharmacological repurposing potential across 14,000+ human target structures using graph neural network bioactivity projections.
              </p>
            </div>

            <div className="p-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3.5 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Patient Digital Twin
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Dynamically adjusts drug accumulation and clearance risk models based on patient renal eGFR and chronological age parameters.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. METHODOLOGY WORKFLOW ── */}
      <section id="methodology" className="relative z-10 py-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pipeline Verification
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              4-Stage Evidence Workflow
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              From verified bioactivity datasets to defensible clinical insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Data Ingestion', desc: 'Synthesizes 38,000+ PubMed articles, openFDA FAERS safety reports, and ChEMBL assays into a unified ontology.' },
              { step: '02', title: 'Target Docking', desc: 'Predicts candidate binding affinities across 14,000+ receptor profiles with calibrated confidence margins.' },
              { step: '03', title: 'Twin Simulation', desc: 'Calculates patient-specific renal and hepatic clearance curves adjusted for age and active co-medications.' },
              { step: '04', title: 'Evidence Dossier', desc: 'Outputs human-readable clinical summaries with clickable literature source citations.' },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/70 space-y-2.5 shadow-xs"
              >
                <span className="font-mono text-xl font-black text-blue-600 dark:text-blue-400">
                  {item.step}
                </span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{item.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5. VERIFIED EVIDENCE REPOSITORIES ── */}
      <section className="relative z-10 py-12 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Validated Grounding Data Sources
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <Link to="/evidence" className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors shadow-2xs">
              PubMed Central · 38,000+ Articles
            </Link>
            <Link to="/evidence" className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors shadow-2xs">
              openFDA FAERS · Adverse Surveillance
            </Link>
            <Link to="/evidence" className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors shadow-2xs">
              ChEMBL 34 · Bioactivity Assays
            </Link>
            <Link to="/knowledge-graph" className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors shadow-2xs">
              UniProt · 14,200+ Protein Structures
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER & CLINICAL DISCLAIMER ── */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                Cure<span className="text-blue-600 dark:text-blue-400">Nova</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">v2.4 Biomedical AI</span>
            </div>

            <div className="flex items-center gap-6 text-xs font-medium">
              <Link to="/evidence" className="hover:text-blue-600 transition-colors">
                Evidence Explorer
              </Link>
              <Link to="/knowledge-graph" className="hover:text-blue-600 transition-colors">
                Knowledge Graph
              </Link>
              <Link to="/about" className="hover:text-blue-600 transition-colors">
                About &amp; Ethics
              </Link>
              <Link to="/login" className="hover:text-blue-600 transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="font-bold text-gray-700 dark:text-gray-300">Regulatory Disclaimer: </span>
            CureNova is an artificial intelligence-assisted clinical decision-support and translational research platform. The predictions, interaction analyses, and repurposing scores presented are for research and professional decision-support purposes only and do not constitute independent medical advice. Always consult licensed medical professionals and verified clinical pharmacology compendia for therapeutic interventions.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>© 2026 CureNova Biomedical AI Technologies. All rights reserved.</div>
            <div className="font-mono">Grounding: PubMed · openFDA · ChEMBL · UniProt</div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
