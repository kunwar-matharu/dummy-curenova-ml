import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Microscope,
  Lock,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Share2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  Layers,
  BarChart2,
  GitFork,
  Dna,
  Clock,
  RotateCcw,
  Sliders,
  Filter,
  ShieldCheck,
  ChevronRight,
  Download,
  Info
} from 'lucide-react';
import { repurposingService, drugSimilarityService } from '../../services/api';
import DrugSimilarityDetailModal from '../../components/DrugSimilarityDetailModal';
import AnalysisProgress from '../../components/AnalysisProgress';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import RiskBadge from '../../components/RiskBadge';
import ReportModal from '../../components/ReportModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ClinicalHighlightBox } from '../../components/ui/ClinicalHighlightBox';

export const ResearcherDrugRepurposing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState(location.state?.prefilledQuery || '');
  const [minEvidence, setMinEvidence] = useState('all');
  const [searchMode, setSearchMode] = useState('disease-to-drug'); // 'disease-to-drug' | 'drug-to-disease'
  const [workflowStatus, setWorkflowStatus] = useState('idle'); // 'idle' | 'resolving' | 'analyzing' | 'enriching' | 'completed' | 'partial' | 'unsupported' | 'error'
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [similarityModalOpen, setSimilarityModalOpen] = useState(false);
  const [similarityCandidate, setSimilarityCandidate] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'history'

  // Request race-condition guard: tracks current in-flight query to prevent stale late responses
  const activeRequestId = useRef(null);

  // Persistent Research History
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('curenova_research_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const benchmarkDiseases = [
    "Pulmonary Arterial Hypertension",
    "Colorectal Cancer",
    "Alzheimer's disease"
  ];

  const benchmarkDrugs = [
    "Everolimus",
    "Aspirin",
    "Imatinib",
    "Metformin",
    "Tacrolimus",
    "Pyrotinib"
  ];

  const boundaryControls = [
    { label: "Niclosamide (Feature-Store Boundary)", query: "Niclosamide" },
    { label: "NonexistentDrugXYZ (Unsupported)", query: "NonexistentDrugXYZ" }
  ];

  const handleRunAnalysis = async (searchQuery = query) => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      setError('Please provide a research indication, target, or disease query.');
      setWorkflowStatus('error');
      return;
    }

    // Generate unique request id and immediately invalidate stale previous requests
    const currentRequestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    activeRequestId.current = currentRequestId;

    setError('');
    setExecuting(true);
    setResult(null);
    setSelectedCandidate(null);
    setWorkflowStatus('resolving');

    try {
      setWorkflowStatus('analyzing');
      let response;
      if (searchMode === 'drug-to-drug') {
        response = await drugSimilarityService.findSimilar(cleanQuery);
      } else {
        const backendSearchType = searchMode === 'drug-to-disease' ? 'drug_to_disease' : 'disease_to_drug';
        response = await repurposingService.analyze(cleanQuery, minEvidence, backendSearchType);
      }

      // Discard stale out-of-order response if user launched a newer query
      if (activeRequestId.current !== currentRequestId) {
        console.warn(`Discarding stale late response for request ${currentRequestId}`);
        return;
      }

      setExecuting(false);
      setResult(response);

      // Synchronize UI search mode with backend single source of truth
      if (response.workflow === 'drug_to_drug') {
        setSearchMode('drug-to-drug');
      } else if (response.is_drug_query) {
        setSearchMode('drug-to-disease');
      } else if (response.entity_type === 'Disease') {
        setSearchMode('disease-to-drug');
      }

      // Explicit workflow state model
      if (response.is_unsupported) {
        setWorkflowStatus('unsupported');
      } else if (!response.candidates || response.candidates.length === 0) {
        setWorkflowStatus('partial');
      } else {
        setWorkflowStatus('completed');
      }

      if (response.candidates?.length > 0) {
        setSelectedCandidate(response.candidates[0]);
      } else {
        setSelectedCandidate(null);
      }

      // Persist in history
      const historyItem = {
        id: response.analysis_id || `rep-${Date.now()}`,
        query: cleanQuery,
        disease_detected: response.query_entity || response.disease_detected || cleanQuery,
        entity_type: response.entity_type || 'Unknown',
        analysis_type: response.analysis_type || 'Discovery Analysis',
        candidate_count: response.candidates?.length || 0,
        top_candidate: response.candidates?.[0]?.candidate_title || response.candidates?.[0]?.drug_name || 'N/A',
        timestamp: new Date().toISOString(),
        result: response,
      };

      const updatedHistory = [historyItem, ...history.filter(h => h.id !== historyItem.id)].slice(0, 15);
      setHistory(updatedHistory);
      try {
        localStorage.setItem('curenova_research_history', JSON.stringify(updatedHistory));
      } catch {
        // ignore storage errors
      }
    } catch (err) {
      if (activeRequestId.current === currentRequestId) {
        setExecuting(false);
        setResult(null);

        const isAuthError =
          err.code === 'AUTH_TOKEN_EXPIRED' ||
          (err.message && (
            err.message.toLowerCase().includes('token has expired') ||
            err.message.toLowerCase().includes('refresh token has expired') ||
            err.message.toLowerCase().includes('session expired') ||
            err.message.toLowerCase().includes('authentication required') ||
            err.message.toLowerCase().includes('not authenticated') ||
            err.message.toLowerCase().includes('could not validate credentials')
          ));

        if (isAuthError) {
          setWorkflowStatus('session_expired');
          setError('Your research session has expired. Please sign in again to continue candidate discovery.');
        } else if (err.code === 'UNSUPPORTED_ENTITY' || err.message?.toLowerCase().includes('not supported')) {
          setWorkflowStatus('unsupported');
          setError(err.message || 'Entity not recognized in biomedical knowledge base.');
        } else if (err.code === 'EVIDENCE_TIMEOUT' || err.message?.toLowerCase().includes('timeout')) {
          setWorkflowStatus('timeout');
          setError('Biomedical evidence retrieval timed out. You may re-run the discovery analysis.');
        } else {
          setWorkflowStatus('error');
          setError(err.message || 'Repurposing discovery analysis failed. Check backend connection.');
        }
      }
    }
  };

  const handleLoadFromHistory = (item) => {
    setQuery(item.query);
    setResult(item.result);
    if (item.result?.candidates?.length > 0) {
      setSelectedCandidate(item.result.candidates[0]);
    } else {
      setSelectedCandidate(null);
    }
    setActiveTab('workspace');
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('curenova_research_history');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (location.state?.prefilledQuery) {
      handleRunAnalysis(location.state.prefilledQuery);
    } else {
      const params = new URLSearchParams(window.location.search);
      const wid = params.get('workflow_id') || params.get('id');
      if (wid && !result) {
        repurposingService
          .getInvestigation(wid)
          .then((res) => {
            if (res) {
              setResult(res);
              setQuery(res.query_entity || res.disease_detected || '');
              if (res.candidates?.length > 0) setSelectedCandidate(res.candidates[0]);
              try {
                sessionStorage.setItem('curenova_active_investigation', JSON.stringify(res));
              } catch {
                // ignore
              }
            }
          })
          .catch((err) => {
            console.warn('Failed to load investigation run from URL param:', err);
          });
      }
    }
  }, [location.state?.prefilledQuery]);

  const isSimilarityWorkflow = searchMode === 'drug-to-drug' || result?.workflow === 'drug_to_drug' || result?.workflow_type === 'drug_to_similar_drugs';
  const isDrugQuery = result?.is_drug_query && !isSimilarityWorkflow;

  return (
    <div className="space-y-6 text-left">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0369A1]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
              <Microscope className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
                Drug Repurposing Discovery Engine
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
                Evaluate small-molecule candidates and disease targets with production XGBoost and multi-source evidence grounding
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch between workspace and history */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Active Workspace
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Saved Runs ({history.length})</span>
            </button>
          </div>
          <SafetyDisclaimer variant="compact" />
        </div>
      </div>

      {/* ── Tab: History View ── */}
      {activeTab === 'history' && (
        <Card elevation="raised" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Previous Research Runs</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Reopen completed discovery dossiers or re-execute searches</p>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-rose-600 hover:text-rose-700">
                Clear History
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)] italic space-y-2">
              <Microscope className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
              <p>No previous research runs recorded yet.</p>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('workspace')}>
                Start a New Discovery Run
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {history.map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-surface-hover)] p-2 rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">{item.query}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20 dark:bg-[#0284C7]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
                        {item.entity_type} · {item.candidate_count} Candidates
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Top Hit: <strong className="text-[var(--color-text-primary)]">{item.top_candidate}</strong> · Run date: {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleLoadFromHistory(item)}
                      className="!bg-[#0284C7] hover:!bg-[#0369A1]"
                    >
                      Open Results
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setQuery(item.query);
                        handleRunAnalysis(item.query);
                        setActiveTab('workspace');
                      }}
                    >
                      Re-run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Active Workspace ── */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* Query Formulation Input Card */}
          <Card elevation="raised" className="p-6 space-y-4">
            {/* Search Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">Discovery Workflow:</span>
                <div className="flex gap-1.5 p-1 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSearchMode('disease-to-drug')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      searchMode === 'disease-to-drug'
                        ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] font-bold shadow-xs'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    Disease → Drug Candidates
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSearchMode('drug-to-disease'); setResult(null); }}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      searchMode === 'drug-to-disease'
                        ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] font-bold shadow-xs'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    Drug → Disease Repurposing
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSearchMode('drug-to-drug'); setResult(null); }}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      searchMode === 'drug-to-drug'
                        ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] font-bold shadow-xs'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    Drug → Similar / Alternative Drugs
                  </button>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                Feature Store: 6.7M Curated Pairs · Production XGBoost (39 Features)
              </span>
            </div>

            {/* Input Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis(query)}
                  placeholder={
                    searchMode === 'disease-to-drug'
                      ? "Enter disease or phenotype (e.g. Pulmonary Arterial Hypertension, Colorectal Cancer)..."
                      : searchMode === 'drug-to-disease'
                      ? "Enter small molecule drug for repurposing (e.g. Everolimus, Aspirin, Imatinib)..."
                      : "Enter small molecule drug to find similar/alternative drugs (e.g. Metformin, Everolimus, Aspirin)..."
                  }
                  className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0284C7] transition-all"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={minEvidence}
                  onChange={(e) => setMinEvidence(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0284C7] cursor-pointer"
                >
                  <option value="all">Evidence: All Levels</option>
                  <option value="high">High Confidence Only</option>
                  <option value="trials">Phase II / III Trials</option>
                </select>

                <Button
                  variant="primary"
                  size="md"
                  icon={Sparkles}
                  loading={executing}
                  onClick={() => handleRunAnalysis(query)}
                  className="shrink-0 !bg-[#0284C7] hover:!bg-[#0369A1] text-white"
                >
                  {searchMode === 'drug-to-drug' ? 'Find Similar Drugs' : 'Discover Candidates'}
                </Button>
              </div>
            </div>

            {/* Benchmark Queries */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[var(--color-text-muted)] font-semibold text-[11px]">Benchmark Diseases:</span>
                {benchmarkDiseases.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSearchMode('disease-to-drug');
                      setQuery(ex);
                      handleRunAnalysis(ex);
                    }}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[var(--color-text-muted)] font-semibold text-[11px]">Benchmark Drugs:</span>
                {benchmarkDrugs.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSearchMode('drug-to-disease');
                      setQuery(ex);
                      handleRunAnalysis(ex);
                    }}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono bg-[#E0F2FE]/50 hover:bg-[#BAE6FD] text-[#0369A1] dark:bg-[#0369A1]/20 dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#0284C7]/30 transition-colors cursor-pointer"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[var(--color-text-muted)] font-semibold text-[11px]">Boundary Controls:</span>
                {boundaryControls.map((ctrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(ctrl.query);
                      handleRunAnalysis(ctrl.query);
                    }}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 transition-colors cursor-pointer"
                  >
                    {ctrl.label}
                  </button>
                ))}
              </div>
            </div>

            {workflowStatus === 'session_expired' ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold">Authentication Session Expired</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200">
                          AUTH_TOKEN_EXPIRED
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        Your access credentials have expired. Your search query <strong>"{query}"</strong> is preserved. Please re-authenticate to continue candidate discovery.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/login?role=researcher')}
                      className="!bg-[#0284C7] hover:!bg-[#0369A1] text-white font-semibold"
                    >
                      Sign In Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                <span>{error}</span>
              </div>
            ) : null}
          </Card>

          {/* Execution Progress */}
          {executing && (
            <div className="py-8">
              <AnalysisProgress
                title="Executing CureNova Discovery Pipeline"
                subtitle="Resolving biomedical ontology, scoring feature store via XGBoost, evaluating Open Targets / ChEMBL evidence, and running perturbation stress tests"
              />
            </div>
          )}

          {/* Results Workspace */}
          {!executing && result && (
            <div className="space-y-6">
              
              {/* Result Overview Banner */}
              <Card elevation="raised" className="p-6 border-l-4 border-l-[#0284C7] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2">
                    {/* Process Alignment Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0369A1]/30 dark:text-[#38BDF8]">
                        Query: {result.query}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
                        Identified Entity: {result.query_entity} ({result.entity_type})
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">
                        Direction: {result.workflow === 'drug_to_drug' ? 'Drug → Similar / Alternative Drugs' : result.analysis_type}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
                        Engine: {result.workflow === 'drug_to_drug' ? 'Multi-Factor Similarity Engine' : 'Production XGBoost (39 Features)'}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)]">
                      {result.workflow === 'drug_to_drug'
                        ? `${result.query_entity} · Similar & Potential Alternative Drugs`
                        : result.entity_type === 'Drug'
                        ? `${result.query_entity} · Drug → Disease Repurposing Dossier`
                        : result.entity_type === 'Disease'
                        ? `${result.query_entity} · Disease → Drug Repurposing Dossier`
                        : `${result.query_entity} · Entity Not Supported`}
                    </h2>

                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-4xl leading-relaxed">
                      {result.synthesis_report || result.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FileText}
                      onClick={() => setReportModalOpen(true)}
                    >
                      Export Dossier
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Share2}
                      onClick={() => navigate('/knowledge-graph')}
                      className="!bg-[#0284C7] hover:!bg-[#0369A1] text-white"
                    >
                      Inspect Graph
                    </Button>
                  </div>
                </div>

                {/* Computational Boundary Disclaimer in Banner */}
                <div className="p-3 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-muted)] flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-[#0284C7] mt-0.5" />
                  <div>
                    <strong className="text-[var(--color-text-primary)]">Scientific Methodology Note: </strong>
                    {result.workflow === 'drug_to_drug'
                      ? "Drug Similarity Score represents computational and biomedical similarity across molecular structure, biochemical targets, mechanism of action, and therapeutic indications. Similarity does NOT establish clinical interchangeability, equivalent dosing, or prescription substitution."
                      : "ML Ranking Score reflects computational ranking strength within the 6.7M-pair feature store, not clinical efficacy probability. Predictions are preclinical research hypotheses requiring independent biomedical and experimental validation."}
                  </div>
                </div>
              </Card>

              {/* ── EMPTY / LIMITED COVERAGE / UNSUPPORTED STATES ── */}
              {(!result.candidates || result.candidates.length === 0) && (
                <Card elevation="raised" className="p-8 text-center space-y-4">
                  {result.is_unsupported ? (
                    <div className="max-w-xl mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        Entity Not Supported
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        CureNova could not resolve <strong>"{result.query}"</strong> to a supported drug compound or disease ontology identifier (MONDO/EFO/ChEMBL). No computational predictions or evidence records were generated.
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] italic">
                        Honest AI Guardrail: CureNova never hallucinates candidate predictions or invents citations for unrecognized inputs.
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setQuery("Everolimus");
                            handleRunAnalysis("Everolimus");
                          }}
                        >
                          Try Benchmark Drug (Everolimus)
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setQuery("Pulmonary Arterial Hypertension");
                            handleRunAnalysis("Pulmonary Arterial Hypertension");
                          }}
                        >
                          Try Benchmark Disease (PAH)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-xl mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-950/40 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center mx-auto">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        No Supported Computational Candidates Found
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        CureNova could not generate a supported computational ranking for {result.entity_type?.toLowerCase()} <strong>"{result.query_entity}"</strong> with the currently available feature store data.
                      </p>
                      <div className="p-3 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] text-left">
                        <strong className="text-[var(--color-text-primary)] block mb-1">Scientific Boundary:</strong>
                        This reflects computational coverage boundaries within the 6.7M-pair feature store, NOT an assertion that no biological activity or therapeutic utility exists. Preclinical exploration requires prospective experimental validation.
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ── CANDIDATE RESULTS (When candidates exist) ── */}
              {result.candidates?.length > 0 && (
                <>
                  {/* View Mode Toggle & Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)] text-sm">
                        Ranked Candidates ({result.candidates.length})
                      </span>
                      <span className="text-[var(--color-text-muted)]">• Ordered by ML Ranking Score (Production XGBoost)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex">
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                            viewMode === 'table' ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] shadow-xs' : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          Table View
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('cards')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                            viewMode === 'cards' ? 'bg-[var(--color-surface-card)] text-[#0284C7] dark:text-[#38BDF8] shadow-xs' : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          Card Grid
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Main Content Layout: Candidate List + Candidate Deep Dive Inspector Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left: Candidates Presentation (Table or Cards) */}
                    <div className="lg:col-span-7 space-y-4">
                      {viewMode === 'table' ? (
                        <Card elevation="raised" className="overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] uppercase text-[10px] font-mono tracking-wider">
                                <tr>
                                  <th className="py-3 px-4">Rank</th>
                                  <th className="py-3 px-4">
                                    {isSimilarityWorkflow
                                      ? "Similar / Alternative Drug Candidate"
                                      : isDrugQuery
                                        ? "Candidate Indication / Disease"
                                        : "Candidate Repurposing Drug"}
                                  </th>
                                  <th className="py-3 px-4">
                                    {isSimilarityWorkflow ? (
                                      <>
                                        <div>Similarity Score</div>
                                        <div className="text-[9px] text-[var(--color-text-muted)] font-normal lowercase">(multi-factor composite)</div>
                                      </>
                                    ) : (
                                      <>
                                        <div>ML Ranking Score</div>
                                        <div className="text-[9px] text-[var(--color-text-muted)] font-normal lowercase">(uncalibrated)</div>
                                      </>
                                    )}
                                  </th>
                                  <th className="py-3 px-4">Evidence Level</th>
                                  <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {result.candidates.map((cand, idx) => {
                                  const isSelected = selectedCandidate?.id === cand.id;
                                  return (
                                    <tr
                                      key={cand.id || idx}
                                      onClick={() => setSelectedCandidate(cand)}
                                      className={`cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-[#EFF6FF] dark:bg-[#0C243B]/40 font-semibold'
                                          : 'hover:bg-[var(--color-surface-hover)]'
                                      }`}
                                    >
                                      <td className="py-3 px-4 font-mono font-bold text-[#0A2540] dark:text-[#38BDF8]">
                                        #{idx + 1}
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-bold text-[var(--color-text-primary)]">
                                            {cand.candidate_title || (isSimilarityWorkflow ? cand.drug_name : isDrugQuery ? cand.disease_name : cand.drug_name)}
                                          </span>
                                          {isSimilarityWorkflow ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                                              {cand.alternative_status_label || cand.alternative_status}
                                            </span>
                                          ) : cand.indication_status === 'known_indication' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                              Known Indication · Not Novel
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                              Potential Repurposing
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                          {cand.candidate_subtitle || (isSimilarityWorkflow ? `ChEMBL: ${cand.chembl_id}` : isDrugQuery ? `Evaluated Drug: ${cand.drug_name}` : `Candidate Compound`)}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 font-mono font-bold text-[#0284C7] dark:text-[#38BDF8]">
                                        {isSimilarityWorkflow
                                          ? `${(cand.similarity_score * 100).toFixed(0)}% (${cand.similarity_score.toFixed(3)})`
                                          : cand.ml_ranking_score !== null ? cand.ml_ranking_score.toFixed(4) : (cand.curenova_ranking / 100).toFixed(4)}
                                      </td>
                                      <td className="py-3 px-4">
                                        {isSimilarityWorkflow ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                            {cand.evidence_level}
                                          </span>
                                        ) : (
                                          <RiskBadge severity={cand.evidence_strength} size="sm" />
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <button
                                          type="button"
                                          className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8] hover:underline cursor-pointer"
                                        >
                                          Inspect &rarr;
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {result.candidates.map((cand, idx) => {
                            const isSelected = selectedCandidate?.id === cand.id;
                            return (
                              <Card
                                key={cand.id || idx}
                                elevation={isSelected ? 'raised' : 'flat'}
                                interactive={true}
                                onClick={() => setSelectedCandidate(cand)}
                                className={`p-5 space-y-3.5 transition-all ${
                                  isSelected
                                    ? 'border-[#0284C7] ring-2 ring-[#0284C7]/20 bg-[var(--color-surface-card)]'
                                    : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0A2540] text-white">
                                      #{idx + 1}
                                    </span>
                                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                                      {cand.candidate_title || (isDrugQuery ? cand.disease_name : cand.drug_name)}
                                    </h3>
                                    {isSimilarityWorkflow ? (
                                      <>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                          {cand.alternative_status_label || cand.alternative_status}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                          Evidence: {cand.evidence_level}
                                        </span>
                                      </>
                                    ) : cand.indication_status === 'known_indication' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                        Known Indication · Not Novel
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                        Potential Repurposing
                                      </span>
                                    )}
                                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                      ({cand.candidate_subtitle || (isSimilarityWorkflow ? `ChEMBL: ${cand.chembl_id}` : '')})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-[#0284C7] dark:text-[#38BDF8]">
                                      {isSimilarityWorkflow
                                        ? `Similarity: ${(cand.similarity_score * 100).toFixed(0)}%`
                                        : `ML Score: ${cand.ml_ranking_score !== null ? cand.ml_ranking_score.toFixed(4) : (cand.curenova_ranking / 100).toFixed(4)}`}
                                    </span>
                                    {!isSimilarityWorkflow && <RiskBadge severity={cand.evidence_strength} size="sm" />}
                                    {isSimilarityWorkflow && (
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSimilarityCandidate(cand);
                                          setSimilarityModalOpen(true);
                                        }}
                                        className="!text-[10px] !py-0.5 !px-1.5"
                                      >
                                        Inspect
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{cand.mechanism}</p>

                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                                  <span className="text-[var(--color-text-muted)] font-semibold mr-1">Biological Targets:</span>
                                  {cand.targets?.map((t, tidx) => (
                                    <span
                                      key={tidx}
                                      className="px-2 py-0.5 rounded-md bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] font-mono font-medium"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: Candidate Deep Dive Inspector Panel (Explicit 4-Stage Architecture) */}
                    <div className="lg:col-span-5">
                      <div className="sticky top-20">
                        <Card elevation="raised" className="p-6 space-y-5 border-l-4 border-l-[#0284C7]">
                          {isSimilarityWorkflow && selectedCandidate ? (
                            <div className="space-y-5 text-left">
                              <div className="border-b border-[var(--color-border-subtle)] pb-3 space-y-1.5">
                                <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                                  Alternative Drug Candidate Inspector
                                </span>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                                      {selectedCandidate.drug_name}
                                    </h3>
                                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                      ChEMBL: {selectedCandidate.chembl_id} · Stage: {selectedCandidate.clinical_stage || selectedCandidate.approval_status}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-lg font-black font-mono text-[#0284C7] dark:text-[#38BDF8]">
                                      {(selectedCandidate.similarity_score * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-[9px] font-mono text-[var(--color-text-muted)] block">
                                      Similarity Score
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                                    {selectedCandidate.alternative_status_label}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Evidence: {selectedCandidate.evidence_level}
                                  </span>
                                </div>
                              </div>

                              {/* Multi-Factor Signal Breakdown */}
                              <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]">
                                  <span>Multi-Factor Signals</span>
                                  <span className="font-mono text-[#0284C7]">{selectedCandidate.similarity_score}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2 rounded-lg bg-[var(--color-surface-card)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Molecular (Tanimoto)</span>
                                    <span className="font-mono font-bold">{selectedCandidate.molecular_similarity !== null ? selectedCandidate.molecular_similarity : 'N/A'}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[var(--color-surface-card)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Target Overlap (Jaccard)</span>
                                    <span className="font-mono font-bold">{selectedCandidate.target_similarity !== null ? selectedCandidate.target_similarity : 'N/A'}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[var(--color-surface-card)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Mechanism of Action</span>
                                    <span className="font-mono font-bold">{selectedCandidate.mechanism_similarity !== null ? selectedCandidate.mechanism_similarity : 'N/A'}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[var(--color-surface-card)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Indication Overlap</span>
                                    <span className="font-mono font-bold">{selectedCandidate.indication_similarity !== null ? selectedCandidate.indication_similarity : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Shared Targets */}
                              {selectedCandidate.shared_targets?.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                  <span className="font-bold text-[var(--color-text-secondary)]">Shared Biochemical Targets:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {selectedCandidate.shared_targets.slice(0, 4).map((t, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                                        {t.target_name || t.target_id || t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Shared Indications */}
                              {selectedCandidate.shared_indications?.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                  <span className="font-bold text-[var(--color-text-secondary)]">Shared Established Indications:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {selectedCandidate.shared_indications.slice(0, 3).map((ind, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
                                        {ind}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Rationale */}
                              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                                <strong>Scientific Interpretation:</strong>
                                <p className="text-[11px] leading-relaxed">{selectedCandidate.scientific_rationale}</p>
                              </div>

                              {/* Regulatory boundary */}
                              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-900 dark:text-amber-300 leading-relaxed">
                                <strong>CLINICAL BOUNDARY: </strong>
                                Similarity does NOT establish clinical interchangeability, equivalent dosing, or prescription substitution.
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setSimilarityCandidate(selectedCandidate);
                                    setSimilarityModalOpen(true);
                                  }}
                                  className="flex-1 !bg-[#0284C7] hover:!bg-[#0369A1] text-white"
                                >
                                  Full Inspector (A-G)
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={Share2}
                                  onClick={() => navigate('/knowledge-graph', {
                                    state: {
                                      similarityContext: {
                                        drugA: result.query_entity,
                                        drugB: selectedCandidate.drug_name,
                                      }
                                    }
                                  })}
                                >
                                  Inspect Graph
                                </Button>
                              </div>
                            </div>
                          ) : selectedCandidate ? (
                            <div className="space-y-5">
                              
                              {/* Candidate Identity Header */}
                              <div className="border-b border-[var(--color-border-subtle)] pb-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                                      Candidate Inspector
                                    </span>
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                                      {selectedCandidate.candidate_title || selectedCandidate.drug_name}
                                    </h3>
                                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                      {selectedCandidate.candidate_subtitle || `Evaluated: ${selectedCandidate.drug_name}`}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] block uppercase font-bold">
                                      Rank #{selectedCandidate.rank || 1}
                                    </span>
                                    <span className="text-lg font-black font-mono text-[#0284C7] dark:text-[#38BDF8]">
                                      {selectedCandidate.ml_ranking_score !== null ? selectedCandidate.ml_ranking_score.toFixed(4) : (selectedCandidate.curenova_ranking / 100).toFixed(4)}
                                    </span>
                                  </div>
                                </div>

                                {/* Indication Classification Banner */}
                                {selectedCandidate.indication_status === 'known_indication' ? (
                                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Known indication — not a novel repurposing hypothesis.</span>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Potential repurposing candidate (investigational research hypothesis).</span>
                                  </div>
                                )}
                              </div>

                              {/* ── SECTION A: ML PREDICTION ENGINE ── */}
                              <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-[#0369A1] dark:text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Section A · ML Prediction Engine
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0284C7] text-white">
                                    XGBoost Final
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between pt-1">
                                  <span className="text-xs text-[var(--color-text-secondary)] font-medium">ML Ranking Score:</span>
                                  <span className="text-xl font-extrabold font-mono text-[#0A2540] dark:text-white">
                                    {selectedCandidate.ml_ranking_score !== null ? selectedCandidate.ml_ranking_score.toFixed(4) : (selectedCandidate.curenova_ranking / 100).toFixed(4)}
                                  </span>
                                </div>

                                <div className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                                  Derived from 39 biomedical and molecular features across 6.7M pairs (held-out disease AP: 0.9047, ROC-AUC: 0.9735).
                                </div>

                                <div className="p-2 rounded bg-[var(--color-surface-card)] border border-blue-200 dark:border-blue-900/60 text-[10px] text-[#0369A1] dark:text-[#38BDF8]">
                                  <strong>Scientific Distinction: </strong>Higher scores indicate stronger computational ranking strength. This is NOT a probability of clinical efficacy.
                                </div>
                              </div>

                              {/* ── SECTION B: BIOMEDICAL EVIDENCE GROUNDING ── */}
                              <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-[#0284C7]" />
                                    Section B · Biomedical Evidence
                                  </span>
                                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                    Open Targets & ChEMBL
                                  </span>
                                </div>

                                {/* ZERO-EVIDENCE RULE PROMINENT CALLOUT (Part 14 & 16) */}
                                {(selectedCandidate.biological_edges_count === 0 || (selectedCandidate.mechanism && selectedCandidate.mechanism.toLowerCase().includes("evidence limitation"))) && (
                                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                      Evidence Limitation (Zero Connected Biological Edges)
                                    </div>
                                    <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                                      No connected biological interaction edges were identified in the available knowledge graph.
                                      ML interpretation: This pair was computationally ranked highly by feature embeddings, but direct biological support was not established by retrieved evidence.
                                    </p>
                                  </div>
                                )}

                                {/* Open Targets Curated Mechanism */}
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                                    Open Targets Curated Mechanism of Action:
                                  </span>
                                  <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
                                    {selectedCandidate.mechanism}
                                  </p>
                                </div>

                                {/* ChEMBL Pharmacology Details */}
                                {selectedCandidate.chembl_evidence && Object.keys(selectedCandidate.chembl_evidence).length > 0 && (
                                  <div className="p-2.5 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-1 text-xs">
                                    <div className="font-semibold text-[var(--color-text-primary)] text-[11px]">
                                      ChEMBL Bioactivity & Pharmacology:
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[var(--color-text-secondary)]">
                                      {selectedCandidate.chembl_evidence.max_pchembl && (
                                        <span>Max pChEMBL: <strong>{Number(selectedCandidate.chembl_evidence.max_pchembl).toFixed(2)}</strong></span>
                                      )}
                                      {selectedCandidate.chembl_evidence.target_count && (
                                        <span>Bioactive Targets: <strong>{selectedCandidate.chembl_evidence.target_count}</strong></span>
                                      )}
                                      {selectedCandidate.chembl_id && (
                                        <span>ChEMBL ID: <strong>{selectedCandidate.chembl_id}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Targets */}
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                                    Annotated Molecular Targets:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedCandidate.targets?.length > 0 ? (
                                      selectedCandidate.targets.map((t, tidx) => (
                                        <span
                                          key={tidx}
                                          className="px-2 py-0.5 rounded bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] text-[10px] font-mono font-medium"
                                        >
                                          {t}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[11px] text-[var(--color-text-muted)] italic">
                                        Multi-target pathway modulation profile
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Supporting Literature */}
                                <div className="space-y-1.5 pt-1 border-t border-[var(--color-border-subtle)]">
                                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                                    Verified Literature Records:
                                  </span>
                                  {selectedCandidate.supporting_papers?.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {selectedCandidate.supporting_papers.slice(0, 2).map((p, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 rounded bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] text-[11px] space-y-0.5"
                                        >
                                          <div className="flex items-center justify-between text-[10px] font-mono">
                                            <span className="text-[var(--color-text-muted)] truncate max-w-[150px]">{p.journal}</span>
                                            {p.pmid && (
                                              <a
                                                href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#0284C7] dark:text-[#38BDF8] hover:underline flex items-center gap-0.5"
                                              >
                                                PMID:{p.pmid} <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>
                                          <div className="text-[var(--color-text-primary)] font-medium line-clamp-1">{p.title}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-[var(--color-text-muted)] italic">
                                      Pass-through evidence grounded via Open Targets platform annotations.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ── SECTION C: COMPUTATIONAL ROBUSTNESS / STRESS ASSESSMENT ── */}
                              <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-[#b45309] dark:text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" />
                                    Section C · Heuristic Robustness Assessment
                                  </span>
                                  {selectedCandidate.stress_score !== undefined && selectedCandidate.stress_score !== null && (
                                    <span className="font-mono font-extrabold text-xs text-[#b45309] dark:text-[#fbbf24]">
                                      {Number(selectedCandidate.stress_score).toFixed(2)} / 100
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                                  Assessment: {selectedCandidate.stress_interpretation || 'EVALUATED RESEARCH HYPOTHESIS'}
                                </div>

                                {/* Stress Flags */}
                                {selectedCandidate.stress_flags && selectedCandidate.stress_flags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {selectedCandidate.stress_flags.map((flag, fidx) => (
                                      <span
                                        key={fidx}
                                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                      >
                                        {flag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="p-2 rounded bg-[var(--color-surface-card)] border border-amber-200 dark:border-amber-900/60 text-[10px] text-[#b45309] dark:text-[#fbbf24]">
                                  <strong>Heuristic Distinction: </strong>Stress score is a computational perturbation stability heuristic measuring feature sensitivity. It does NOT measure clinical drug safety, patient toxicity, or clinical efficacy.
                                </div>
                              </div>

                              {/* ── SECTION D: CURENOVA PRECLINICAL SYNTHESIS ── */}
                              <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" />
                                    Section D · CureNova Preclinical Synthesis
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                    AI Synthesis
                                  </span>
                                </div>

                                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                                  {result.synthesis_report || 'Preclinical hypothesis formulated through multi-agentic evidence synthesis.'}
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1"
                                  icon={FileText}
                                  onClick={() => setReportModalOpen(true)}
                                >
                                  Generate Dossier
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="flex-1 !bg-[#0284C7] hover:!bg-[#0369A1]"
                                  icon={Share2}
                                  onClick={() => navigate('/knowledge-graph', {
                                    state: {
                                      drug: selectedCandidate.drug_name,
                                      disease: selectedCandidate.disease_name,
                                      chembl_id: selectedCandidate.chembl_id,
                                      indication_status: selectedCandidate.indication_status,
                                    }
                                  })}
                                >
                                  Inspect Network
                                </Button>
                              </div>

                            </div>
                          ) : (
                            <div className="py-12 text-center text-xs text-[var(--color-text-muted)] italic">
                              Select a candidate from the table to view the full biological and evidence profile.
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>

                  </div>
                </>
              )}

              {/* ── MANDATORY SCIENTIFIC LIMITATION DISCLAIMER FOOTER ── */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-[10px]">
                  <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                  Scientific Limitation & Research Regulatory Boundary
                </div>
                <p className="leading-relaxed">
                  ML Ranking Score reflects computational ranking strength, not clinical efficacy probability. Predictions are research hypotheses and require independent biomedical/experimental validation. CureNova is not a clinical diagnostic device, prescriber, or medical treatment guideline.
                </p>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType="researcher"
        data={result}
      />

      {/* Alternative Drug Similarity Detail Modal (Sections A-G) */}
      <DrugSimilarityDetailModal
        isOpen={similarityModalOpen}
        onClose={() => setSimilarityModalOpen(false)}
        candidate={similarityCandidate}
        queryDrug={result?.query_entity || query || ''}
        onInspectGraph={(drugA, drugB) => {
          setSimilarityModalOpen(false);
          navigate('/knowledge-graph', {
            state: {
              similarityContext: {
                drugA: drugA || result?.query_entity,
                drugB: drugB,
              }
            }
          });
        }}
      />
    </div>
  );
};

export default ResearcherDrugRepurposing;
