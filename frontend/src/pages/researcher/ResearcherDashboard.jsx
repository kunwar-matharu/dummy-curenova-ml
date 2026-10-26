import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Microscope,
  Search,
  Share2,
  Plus,
  ArrowRight,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { repurposingService } from '../../services/api';
import { ClinicalHighlightBox } from '../../components/ui/ClinicalHighlightBox';

export const ResearcherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load real diseases and examples from backend API
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [expandedInfo, setExpandedInfo] = useState(false);
  const [exampleQueries, setExampleQueries] = useState([]);
  const [quickQuery, setQuickQuery] = useState('');

  // Real stored user research runs from localStorage
  const [savedRuns, setSavedRuns] = useState([]);

  useEffect(() => {
    repurposingService
      .getDiseases()
      .then((res) => {
        const loadedDiseases = res.diseases || [];
        setDiseases(loadedDiseases);
        setExampleQueries(res.example_queries || []);
        if (loadedDiseases.length > 0) {
          setSelectedDisease(loadedDiseases[0]);
        }
      })
      .catch((err) => console.error('Failed to load supported diseases', err))
      .finally(() => setLoading(false));

    try {
      const stored = localStorage.getItem('curenova_research_history');
      if (stored) {
        setSavedRuns(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      navigate('/researcher/drug-repurposing', { state: { prefilledQuery: quickQuery.trim() } });
    }
  };

  const completedCount = savedRuns.filter((r) => r.status !== 'failed').length;

  return (
    <div className="space-y-6 w-full pb-8 text-left max-w-7xl mx-auto">
      {/* ── Page Heading ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17324D] dark:text-[#F1F5F9]">
            Research Overview
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Explore drug candidates and review the evidence.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => navigate('/researcher/drug-repurposing')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Research</span>
        </button>
      </div>

      {/* ── Search and Research Entry using ClinicalHighlightBox ── */}
      <ClinicalHighlightBox
        variant="primary"
        title="What would you like to investigate?"
        subtitle="Enter a disease to discover repurposing candidates, or a drug name to examine alternative indications."
        icon={Microscope}
      >
        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              id="research-search-input"
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Enter a disease or drug name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            />
          </div>
          <button
            type="submit"
            disabled={!quickQuery.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Research</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        {exampleQueries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)] mr-1">
              Suggestions:
            </span>
            {exampleQueries.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => navigate('/researcher/drug-repurposing', { state: { prefilledQuery: ex } })}
                className="px-2.5 py-1 text-xs rounded-lg bg-[var(--color-surface-card)] hover:bg-[#E0F2FE] dark:hover:bg-[#0284C7]/20 hover:text-[#0369A1] dark:hover:text-[#38BDF8] hover:border-[#BAE6FD] dark:hover:border-[#0284C7]/40 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
              >
                + {ex}
              </button>
            ))}
          </div>
        )}
      </ClinicalHighlightBox>

      {/* ── Genuine User Activity Statistics (No Fake Numbers) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-[var(--color-text-muted)] block">
            Research Runs
          </span>
          <div className="text-2xl font-extrabold text-[#17324D] dark:text-[#F1F5F9]">
            {savedRuns.length}
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Saved user inquiries
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-[var(--color-text-muted)] block">
            Completed Analyses
          </span>
          <div className="text-2xl font-extrabold text-[#0284C7] dark:text-[#38BDF8]">
            {completedCount}
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Evidence dossiers evaluated
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-[var(--color-text-muted)] block">
            Target Disease Models
          </span>
          <div className="text-2xl font-extrabold text-[#0A2540] dark:text-[#F1F5F9]">
            {diseases.length}
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Curated in reference catalog
          </span>
        </div>
      </div>

      {/* ── Main Workspace Grid (7 cols + 5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Target Profiles & Disease Models (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0A2540] dark:text-[#F1F5F9]">
                  Curated Target Profiles
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Select a disease model to inspect biological targets and small molecule candidates.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0369A1]/20 dark:text-[#38BDF8]">
                {diseases.length} Available
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                Loading supported disease profiles...
              </div>
            ) : diseases.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)] italic">
                No disease profiles loaded in database.
              </div>
            ) : (
              <div className="space-y-2.5">
                {diseases.map((dm) => {
                  const isSelected = selectedDisease?.id === dm.id;
                  return (
                    <div
                      key={dm.id}
                      onClick={() => {
                        setSelectedDisease(dm);
                        setExpandedInfo(false);
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between card-3d-hover ${
                        isSelected
                          ? 'bg-[#EFF6FF] dark:bg-[#0C243B]/40 border-[#0284C7] ring-1 ring-[#0284C7]'
                          : 'bg-[var(--color-surface-sunken)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                            {dm.name}
                          </span>
                          {dm.mesh_id && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                              MeSH: {dm.mesh_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                          {dm.summary || 'Complex pathology with small-molecule candidate screening.'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8] block">
                          {dm.candidate_count || 3} Candidates
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          Click to select
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Target Profile Inspector (Clean, Progressive Disclosure) */}
            {selectedDisease && (
              <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#38BDF8] block">
                      Selected Target
                    </span>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                      {selectedDisease.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedInfo(!expandedInfo)}
                    className="text-xs text-[var(--color-text-secondary)] hover:text-[#0284C7] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{expandedInfo ? 'Less info' : 'More information'}</span>
                    {expandedInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {expandedInfo && (
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pt-1 border-t border-[var(--color-border-subtle)]">
                    {selectedDisease.summary || 'Pathology model mapped with multi-relational evidence from PubMed citations, ChEMBL bioactive binding assays, and Reactome cascades.'}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/researcher/drug-repurposing', { state: { prefilledQuery: selectedDisease.name } })}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Investigate {selectedDisease.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Research & Tools (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Research Runs Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0A2540] dark:text-[#F1F5F9]">
                  Recent Research
                </h3>
              </div>
              {savedRuns.length > 0 && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {savedRuns.length} run{savedRuns.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {savedRuns.length > 0 ? (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {savedRuns.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate block">
                        {item.query}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {item.top_candidate ? `Top: ${item.top_candidate}` : 'Evaluated'}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">·</span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/researcher/drug-repurposing', { state: { prefilledQuery: item.query } })}
                      className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8] hover:underline shrink-0 cursor-pointer"
                    >
                      Re-open
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Clean Honest Empty State */
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] flex items-center justify-center mx-auto">
                  <Microscope className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                    No research yet
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                    Start your first query to see results here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/researcher/drug-repurposing')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Research</span>
                </button>
              </div>
            )}
          </div>

          {/* Supporting Evidence Exploration Tools */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#0A2540] dark:text-[#F1F5F9]">
              Biomedical Intelligence Tools
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Explore evidence references and network relationships across biological pathways.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/evidence"
                className="p-3 rounded-xl bg-[var(--color-surface-sunken)] hover:bg-[#EFF6FF] dark:hover:bg-[#0284C7]/20 hover:text-[#0369A1] dark:hover:text-[#38BDF8] border border-[var(--color-border-subtle)] transition-all text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Evidence</span>
              </Link>
              <Link
                to="/knowledge-graph"
                className="p-3 rounded-xl bg-[var(--color-surface-sunken)] hover:bg-[#EFF6FF] dark:hover:bg-[#0284C7]/20 hover:text-[#0369A1] dark:hover:text-[#38BDF8] border border-[var(--color-border-subtle)] transition-all text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-2"
              >
                <Share2 className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Graph Network</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearcherDashboard;
