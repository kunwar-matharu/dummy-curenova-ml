import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Search,
  Share2,
  Database,
  Cpu,
  Sparkles,
  Layers,
  HeartHandshake,
  Stethoscope,
  Microscope,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Server,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AGENTS = [
  {
    id: 'retrieval',
    step: 'Agent 01',
    name: 'Retrieval Agent',
    icon: Database,
    color: '#0284C7',
    role: 'Multi-Source Harvester',
    sources: ['PubMed', 'openFDA FAERS', 'ChEMBL 34', 'ClinicalTrials.gov'],
    output: 'Structured citation records & pharmacokinetics tables',
    latency: '180ms',
  },
  {
    id: 'reasoning',
    step: 'Agent 02',
    name: 'Reasoning Agent',
    icon: Share2,
    color: '#8b5cf6',
    role: 'Graph Topology Mapper',
    sources: ['Reactome Pathways', 'Drug-Target Associations'],
    output: 'Congruence scores & biological mechanism trees',
    latency: '320ms',
  },
  {
    id: 'safety',
    step: 'Agent 03',
    name: 'Safety Agent',
    icon: ShieldAlert,
    color: '#f59e0b',
    role: 'Polypharmacy Guardian',
    sources: ['FDA Safety Signals', 'Pairwise Matrices', 'Organ Clearance'],
    output: 'Hazard severity levels & Digital Twin delta calculations',
    latency: '210ms',
  },
  {
    id: 'recommendation',
    step: 'Agent 04',
    name: 'Synthesis Agent',
    icon: FileCheck,
    color: '#10b981',
    role: 'Clinical Communication',
    sources: ['Evidence Ranking Algorithm', 'Guidance Protocols'],
    output: 'Persona-specific actionable discussion points (Doctor/Researcher/Patient)',
    latency: '140ms',
  },
];

const SOURCES_GRID = [
  { name: 'National Library of Medicine', db: 'PubMed', count: '36.8M+ Citations', status: 'Synchronized', color: '#0284C7' },
  { name: 'US Food & Drug Admin', db: 'openFDA FAERS', count: '18.2M+ Safety Reports', status: 'Synchronized', color: '#f59e0b' },
  { name: 'EMBL-EBI European Labs', db: 'ChEMBL 34', count: '2.4M+ Bioactive Compounds', status: 'Synchronized', color: '#10b981' },
  { name: 'Human Pathway Knowledgebase', db: 'Reactome', count: '2,640+ Biological Pathways', status: 'Synchronized', color: '#8b5cf6' },
];

export const About = () => {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [activePersonaTab, setActivePersonaTab] = useState('doctor');

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Architecture & System Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Interactive multi-agent pipeline, live database nodes, and clinical guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            4 Agents Operational
          </span>
        </div>
      </div>

      {/* ── Component 1: Interactive Multi-Agent Pipeline Visualizer ── */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Multi-Agent Orchestration Flow
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Tap any agent node to inspect its data sources, algorithmic role, and real-time throughput.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
            LangGraph Multi-Agent Stack
          </span>
        </div>

        {/* 4 Agent Clickable Nodes in Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const isSelected = selectedAgent.id === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-[var(--color-surface-card)] shadow-md'
                    : 'bg-[var(--color-surface-sunken)] hover:border-[var(--color-border-strong)]'
                }`}
                style={{
                  borderColor: isSelected ? agent.color : undefined,
                  boxShadow: isSelected ? `0 4px 14px ${agent.color}25` : undefined
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)]">
                    {agent.step}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                    {agent.name}
                  </h3>
                  <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                    {agent.role}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)] text-[10px] font-mono">
                  <span className="text-[var(--color-text-muted)]">Avg Latency</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{agent.latency}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Agent Inspector Card */}
        <div
          className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in"
          style={{
            backgroundColor: `${selectedAgent.color}08`,
            borderColor: `${selectedAgent.color}35`
          }}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: selectedAgent.color }}>
                Active Inspector: {selectedAgent.name}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">• {selectedAgent.role}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">Harvested Sources:</span>
              {selectedAgent.sources.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)]"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              Output Delivery: <strong>{selectedAgent.output}</strong>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              to="/evidence"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs"
              style={{ backgroundColor: selectedAgent.color }}
            >
              Explore Source Data →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Component 2: Interactive Source Grounding Grid ── */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0284c7]" />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Verified Biomedical Knowledge Grounding
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-bold">100% Peer-Reviewed & Regulatory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SOURCES_GRID.map((item) => (
            <div
              key={item.db}
              className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                  {item.db}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div>
                <span className="text-lg font-black text-[var(--color-text-primary)] block tabular-nums">
                  {item.count}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
                  {item.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Component 3: Interactive Role Matrix Comparison ── */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Role-Adapted Decision Support Capabilities
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              CureNova automatically calibrates vocabulary and decision models for each persona.
            </p>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
            {[
              { id: 'doctor', label: 'Doctor (MD)', color: '#0284c7' },
              { id: 'researcher', label: 'Researcher (PhD)', color: '#0d9488' },
              { id: 'patient', label: 'Patient', color: '#059669' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePersonaTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePersonaTab === tab.id
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Detail Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {activePersonaTab === 'doctor' && (
            <>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0284c7] block">N×N Interaction Matrix</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Calculates reporting odds ratios (ROR) and pairwise contraindication severity.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0284c7] block">Digital Twin Simulation</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Simulates adding or pausing medications with organ clearance delta scoring.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0284c7] block">Organ Clearance Protocols</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Surveillance for creatinine clearance &lt;60 mL/min and CYP450 isoform saturation.
                </p>
              </div>
            </>
          )}

          {activePersonaTab === 'researcher' && (
            <>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0d9488] block">Drug Repurposing Engine</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Maps characterized small molecules to new disease targets with pathway congruence scores.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0d9488] block">Biomedical Knowledge Graph</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Multi-relational visualization of compounds, proteins, and Reactome reaction cascades.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#0d9488] block">Evidence Dossier Export</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Automated compilation of PubMed PMIDs, ChEMBL IC50 assays, and clinical trial phases.
                </p>
              </div>
            </>
          )}

          {activePersonaTab === 'patient' && (
            <>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#059669] block">Plain-Language Guidance</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Replaces clinical jargon and Latin terminology with simple, everyday safety advice.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#059669] block">Interactive Daily Pill Box</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Visual Morning, Noon, and Evening dose tracker with 1-tap adherence completion.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
                <span className="text-xs font-bold text-[#059669] block">Doctor Discussion Sheet</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Prepares a 1-page question checklist to discuss at your next appointment.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Clinical Notice Pill ── */}
      <div className="p-3.5 rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0284c7]" />
          <span>CureNova operates strictly as an assistive clinical & research decision-support prototype.</span>
        </div>
        <Link to="/login" className="font-bold text-[#0284c7] hover:underline shrink-0">
          Open Workspace →
        </Link>
      </div>
    </div>
  );
};

export default About;
