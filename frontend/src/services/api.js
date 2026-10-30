import axios from 'axios';

// Resolve central backend API base URL
const rawUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000'
).trim().replace(/\/+$/, '');

const API_BASE_URL = rawUrl === '' || rawUrl === '/api'
  ? '/api'
  : (rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000,
});

// Dedicated unintercepted axios instance for auth token refresh calls
const plainAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Concurrency queue management to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept requests to attach JWT access token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('curenova_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for consistent error formatting and automatic token refresh/retry
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    let message =
      (typeof detail === 'string' ? detail : null) ||
      error.response?.data?.message ||
      error.message ||
      'Biomedical intelligence service temporarily unavailable.';

    if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      message = 'Backend service is currently unreachable (http://127.0.0.1:8000). Please ensure the CureNova backend is running.';
      error.message = message;
    } else if (status === 404) {
      message = 'Requested API endpoint was not found on backend (404).';
      error.message = message;
    } else if (status === 403) {
      message = 'Researcher permissions required for this action (403).';
      error.message = message;
    }

    // Check if error is 401 Unauthorized and not already retried
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/signup') ||
        url.includes('/auth/refresh');

      if (!isAuthEndpoint) {
        const storedRefreshToken = localStorage.getItem('curenova_refresh_token');

        if (storedRefreshToken) {
          if (isRefreshing) {
            // Queue this request until ongoing refresh completes
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Refresh access token via plainAxios to avoid circular interceptors
            const refreshRes = await plainAxios.post('/auth/refresh', {
              refresh_token: storedRefreshToken,
            });

            const newAccessToken = refreshRes.data?.access_token;
            const newRefreshToken = refreshRes.data?.refresh_token;

            if (!newAccessToken) {
              throw new Error('Refresh response missing access token');
            }

            // Persist new token pair
            localStorage.setItem('curenova_token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('curenova_refresh_token', newRefreshToken);
            }

            // Update default Authorization header for future requests
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            // Notify application in memory of updated token
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('curenova:token_refreshed', {
                  detail: { access_token: newAccessToken, refresh_token: newRefreshToken },
                })
              );
            }

            // Flush all pending queued requests with new token
            processQueue(null, newAccessToken);

            // Retry the original request with new token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            // Token refresh failed (expired, revoked, collision, or deactivated user)
            localStorage.removeItem('curenova_token');
            localStorage.removeItem('curenova_refresh_token');
            localStorage.removeItem('curenova_user');
            delete api.defaults.headers.common['Authorization'];

            const authExpiredError = new Error('Your session has expired. Please sign in again.');
            authExpiredError.code = 'AUTH_TOKEN_EXPIRED';
            authExpiredError.status = 401;

            processQueue(authExpiredError, null);

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('curenova:session_expired', {
                  detail: { reason: refreshErr.message || 'refresh_failed' },
                })
              );
            }

            return Promise.reject(authExpiredError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // No refresh token available in storage
          localStorage.removeItem('curenova_token');
          localStorage.removeItem('curenova_user');
          delete api.defaults.headers.common['Authorization'];

          const authExpiredError = new Error('Authentication required or session expired.');
          authExpiredError.code = 'AUTH_TOKEN_EXPIRED';
          authExpiredError.status = 401;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('curenova:session_expired', {
                detail: { reason: 'no_refresh_token' },
              })
            );
          }

          return Promise.reject(authExpiredError);
        }
      }
    }

    // Default error formatting for non-401 or requests that already retried
    const formattedError = new Error(message);
    if (status === 401) {
      formattedError.code = 'AUTH_TOKEN_EXPIRED';
    }
    formattedError.status = status;
    return Promise.reject(formattedError);
  }
);

export const authService = {
  login: async (email, password) => {
    return api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
  },
  register: async (userData) => {
    const payload = {
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      full_name: (userData.full_name || userData.name || '').trim(),
      role: (userData.role || 'patient').trim().toLowerCase(),
    };
    return api.post('/auth/signup', payload);
  },
  getMe: () => api.get('/auth/me'),
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) =>
    api.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {}),
  getUsers: () => api.get('/auth/users'),
  approveUser: (userId, approvalStatus) =>
    api.post(`/auth/users/${userId}/approve`, { approval_status: approvalStatus }),
};

export const adminService = {
  getUsers: () => api.get('/auth/users'),
  approveUser: (userId, approvalStatus) =>
    api.post(`/auth/users/${userId}/approve`, { approval_status: approvalStatus }),
};

export const drugSimilarityService = {
  findSimilar: async (drugName, topK = 10) => {
    const cleanDrug = drugName.trim();
    const raw = await api.post('/drugs/similar', {
      drug: cleanDrug,
      top_k: topK,
    });

    const isUnsupported = raw.is_unsupported || raw.status === 'unsupported';
    return {
      query: drugName,
      query_entity: raw.query_entity || raw.query_drug || cleanDrug,
      entity_type: raw.entity_type || (isUnsupported ? 'Unsupported Entity' : 'Drug'),
      workflow: 'drug_to_drug',
      workflow_type: 'drug_to_similar_drugs',
      analysis_type: 'Drug → Similar / Alternative Drugs',
      analysis_direction: 'drug_to_similar_drugs',
      status: raw.status || 'completed',
      is_drug_query: true,
      is_unsupported: isUnsupported,
      message: raw.message,
      safety_disclaimer: raw.safety_disclaimer,
      clinical_safety_boundary: raw.clinical_safety_boundary,
      synthesis_report: raw.synthesis_report,
      methodology_note: raw.methodology_note,
      resolved_entity: raw.resolved_entity,
      candidates: (raw.candidates || []).map((c, idx) => ({
        id: c.chembl_id || c.drug_id || `sim-${idx}`,
        drug_id: c.drug_id,
        drug_name: c.drug_name,
        chembl_id: c.chembl_id,
        candidate_title: c.drug_name,
        candidate_subtitle: `ChEMBL: ${c.chembl_id} · Stage: ${c.clinical_stage || c.approval_status}`,
        approval_status: c.approval_status,
        clinical_stage: c.clinical_stage,
        similarity_score: c.similarity_score,
        ml_ranking_score: c.similarity_score,
        curenova_ranking: Math.round((c.similarity_score || 0) * 100),
        evidence_level: c.evidence_level,
        evidence_strength: (c.evidence_level || 'moderate').toLowerCase(),
        alternative_status: c.alternative_status,
        alternative_status_label: c.alternative_status_label,
        molecular_similarity: c.molecular_similarity,
        target_similarity: c.target_similarity,
        mechanism_similarity: c.mechanism_similarity,
        indication_similarity: c.indication_similarity,
        bioactivity_similarity: c.bioactivity_similarity,
        shared_targets: c.shared_targets || [],
        shared_indications: c.shared_indications || [],
        scientific_rationale: c.scientific_rationale,
        safety_disclaimer: c.safety_disclaimer,
        weights_used: c.weights_used || {},
      })),
      structured_synthesis: {
        narrative_synthesis: raw.synthesis_report,
        methodology_summary: raw.methodology_note,
      }
    };
  },
};

export const repurposingService = {
  listInvestigations: (limit = 20) => api.get('/candidates/investigations', { params: { limit } }),
  getInvestigation: (workflowId) => api.get(`/candidates/investigation/${workflowId}`),

  getDiseases: () => api.get('/candidates/diseases'),
  analyze: async (query, minEvidence = 'all', searchType = 'drug_to_disease') => {
    const cleanQuery = encodeURIComponent(query.trim());
    const raw = await api.post(`/candidates/investigate?query=${cleanQuery}&search_type=${encodeURIComponent(searchType)}`);
    const synthesis = raw.structured_synthesis || {};
    const entityType = raw.entity_type || 'Disease';
    const isDrug = entityType === 'Drug';
    const isUnsupported = entityType === 'Unsupported Entity';
    const analysisType = isDrug
      ? 'Drug → Disease Repurposing'
      : (isUnsupported ? 'Entity Resolution Failed' : 'Disease → Drug Repurposing');

    return {
      analysis_id: raw.analysis_id || raw.workflow_id,
      workflow_id: raw.workflow_id,
      query: query,
      disease_detected: raw.query_entity,
      query_entity: raw.query_entity,
      entity_type: entityType,
      analysis_type: analysisType,
      analysis_direction: raw.analysis_direction || (isDrug ? 'drug_to_disease' : (entityType === 'Disease' ? 'disease_to_drug' : null)),
      status: raw.status || (isUnsupported ? 'unsupported' : (raw.candidate_hypotheses?.length ? 'completed' : 'partial')),
      resolved_entity: raw.resolved_entity,
      model_info: raw.model_info,
      is_drug_query: isDrug,
      is_unsupported: isUnsupported,
      candidates: (raw.candidate_hypotheses || []).map((c, idx) => ({
        id: c.id,
        drug_name: c.drug_name,
        chembl_id: c.chembl_id,
        disease: c.disease_name || raw.query_entity,
        disease_name: c.disease_name || raw.query_entity,
        candidate_title: isDrug ? c.disease_name : c.drug_name,
        candidate_subtitle: isDrug ? `Evaluated Drug: ${c.drug_name}` : `Candidate Repurposing Compound`,
        original_indication: c.approval_status || 'Preclinical Repurposing Hypothesis',
        curenova_ranking: Math.round((c.prediction_score || 0.85) * 100),
        prediction_score: c.prediction_score,
        ml_ranking_score: c.prediction_score != null ? Number(c.prediction_score.toFixed(4)) : null,
        score_type: c.score_type || 'ranking_score',
        stress_score: c.stress_score,
        stress_interpretation: c.stress_interpretation,
        stress_flags: c.stress_flags || [],
        indication_status: c.indication_status || 'potential_repurposing',
        indication_label: c.indication_label || 'Potential repurposing candidate',
        evidence_refs: c.evidence_refs || [],
        chembl_evidence: c.chembl_evidence || {},
        biological_edges_count: c.biological_edges_count ?? 0,
        ontology_id: c.ontology_id,
        confidence_interval: `[${(c.confidence_interval_low ?? 0.70).toFixed(2)}, ${(c.confidence_interval_high ?? 0.95).toFixed(2)}]`,
        confidence_interval_low: c.confidence_interval_low,
        confidence_interval_high: c.confidence_interval_high,
        evidence_strength: c.evidence_strength || (c.evidence_count >= 3 ? 'high' : c.evidence_count >= 1 ? 'moderate' : 'low'),
        evidence_count: c.evidence_count,
        mechanism: c.rationale || c.biological_mechanism || synthesis.proposed_mechanism || 'Target kinase signaling modulation',
        mechanism_summary: c.rationale || c.biological_mechanism || synthesis.proposed_mechanism || 'Target kinase signaling modulation',
        evidence_passages: synthesis.validated_citations || [],
        safety_signals: synthesis.safety_concerns || [],
        missing_data: synthesis.missing_information || [],
        epistemic_uncertainty: c.epistemic_uncertainty,
        aleatoric_uncertainty: c.aleatoric_uncertainty,
        calibration_status: c.calibration_status,
        is_bookmarked: c.is_bookmarked,
        rank: c.rank || idx + 1,
        status: c.status,
        status_label: c.status || 'Research Hypothesis',
        targets: c.targets || [],
        pathways: c.pathways || [],
        supporting_papers: (synthesis.validated_citations || []).map(cit => ({
          title: cit.title || `Biomedical Evidence Record #${cit.id}`,
          journal: cit.journal || 'PubMed Citation',
          year: cit.year || 2024,
          pmid: cit.pmid,
          citation: cit.citation || (cit.pmid ? `PMID:${cit.pmid}` : 'Internal Study')
        })),
      })),
      synthesis_report: raw.synthesis_report,
      summary: raw.synthesis_report,
      completed_steps: raw.completed_steps || [],
      provenance_mode: raw.provenance_mode,
      llm_provider: raw.llm_provider,
      limitations_and_boundary_warning: raw.limitations_and_boundary_warning,
      structured_synthesis: synthesis,
    };
  },
  getResult: (id) => api.get(`/candidates/${id}`),
  toggleBookmark: (id) => api.post(`/candidates/${id}/bookmark`),
  addNote: (candidateId, content) => api.post(`/candidates/${candidateId}/notes`, { content }),
  deleteNote: (noteId) => api.delete(`/candidates/notes/${noteId}`),
};

export const safetyService = {
  getCatalog: async () => {
    const res = await api.get('/patient/medicines');
    return Array.isArray(res) ? { catalog: res } : res;
  },
  analyzeBackend: (medications, patientContext = null, roleView = 'doctor') =>
    api.post(
      '/doctor/safety/analyze-regimen',
      { medications: Array.isArray(medications) ? medications : [medications], patient_context: patientContext },
      { params: { role_view: roleView } }
    ),
  getAdverseEvents: (drug, limit = 5) => api.get('/doctor/adverse-events', { params: { drug, limit } }),
  analyze: async (medications, patientContext = null, roleView = 'doctor') => {
    const medList = Array.isArray(medications) ? medications : [medications];
    const medNames = medList
      .map((m) => (typeof m === 'string' ? m : m.name || m.drug_name || ''))
      .filter(Boolean);

    // Try real backend polypharmacy engine first
    try {
      if (medNames.length >= 1) {
        const realRes = await api.post(
          '/doctor/safety/analyze-regimen',
          { medications: medNames, patient_context: patientContext },
          { params: { role_view: roleView } }
        );
        if (realRes && realRes.pairwise_interactions !== undefined) {
          return realRes;
        }
      }
    } catch (backendErr) {
      console.warn('Backend regimen analysis endpoint fallback to curated monographs:', backendErr);
    }
    const names = medList
      .map((m) => (typeof m === 'string' ? m : m.name || m.drug_name || ''))
      .filter(Boolean)
      .join(',');

    const ddis = await api.get('/doctor/interactions', {
      params: names ? { drug_names: names } : {},
    });

    const ddiArray = Array.isArray(ddis) ? ddis : [];
    const hasMajor = ddiArray.some(
      (d) => d.severity?.toLowerCase() === 'contraindicated' || d.severity?.toLowerCase() === 'major'
    );

    return {
      analysis_id: `safe-${Date.now()}`,
      overall_risk_category: hasMajor ? 'High Risk' : (ddiArray.length > 0 ? 'Moderate Risk' : 'No Documented Signal'),
      overall_risk_score: hasMajor ? 82 : (ddiArray.length > 0 ? 50 : 0),
      summary_headline: ddiArray.length > 0
        ? `Identified ${ddiArray.length} potential interaction signal(s) among evaluated medications.`
        : 'No verified drug-drug interaction found in available curated pharmacovigilance sources (absence of data does not guarantee safety).',
      pairwise_interactions: ddiArray.map((d) => ({
        drug_a: d.drug_a,
        drug_b: d.drug_b,
        severity: d.severity,
        mechanism: d.mechanism,
        clinical_recommendation: d.recommendation,
        source: d.verified_source,
        url: d.source_url,
      })),
      patient_friendly_summary: ddiArray.map((d) => ({
        medications_involved: `${d.drug_a} + ${d.drug_b}`,
        what_was_detected: `${d.severity || 'Known'} interaction signal: ${d.mechanism || 'Pharmacokinetic or pharmacodynamic interaction reported.'}`,
        why_it_matters: 'Co-administration may alter effectiveness or increase the risk of adverse reactions.',
        recommended_action: d.recommendation || 'Discuss this combination with your physician or pharmacist at your next appointment.',
      })),
      patient_questions_for_doctor: ddiArray.length > 0
        ? [
            ...ddiArray.map((d) => `Is it safe for me to take ${d.drug_a} together with ${d.drug_b}?`),
            'Are there any symptoms I should monitor that might indicate a medication interaction?',
            'Should my dose or administration timing be adjusted to minimize any risk?'
          ]
        : [
            'Are there any over-the-counter medicines or vitamins I should avoid taking with my current prescriptions?',
            'What is the best time of day to take each of my medications?',
            'Do any of my medications require regular blood or kidney function tests?'
          ],
      has_potential_interaction: ddiArray.length > 0,
      medications: medList,
      patient_context: patientContext,
      role_view: roleView,
    };
  },
  getResult: (id) => api.get('/doctor/overview'),
  getTrials: (params) => api.get('/doctor/clinical-trials', { params }),
  getLiveTrials: (params) => api.get('/doctor/clinical-trials/live', { params }),
  simulateTwin: async (baselineMedications, addedDrugs = [], removedDrugs = [], patientContext = null) => {
    const combined = [
      ...baselineMedications.filter((m) => !removedDrugs.includes(m)),
      ...addedDrugs,
    ];
    return safetyService.analyze(combined, patientContext, 'doctor');
  },
};

export const evidenceService = {
  search: (params) => {
    const cleanParams = {};
    if (params) {
      if (params.q) cleanParams.search = params.q;
      if (params.evidence_type && params.evidence_type !== 'all') cleanParams.study_type = params.evidence_type;
      if (params.source && params.source !== 'all') cleanParams.search = params.source;
    }
    return api.get('/evidence', { params: cleanParams });
  },
  synthesize: (evidenceIds) => api.post('/evidence/synthesize', evidenceIds),
  searchLivePubmed: (query, maxResults = 5) =>
    api.get('/evidence/pubmed-live', { params: { query, max_results: maxResults } }),
};

export const graphService = {
  getOverview: (entityType = null, maxNodes = 60) =>
    api.get('/graph', { params: { node_type: entityType } }),
  getNodeSubgraph: (entityId) => api.get(`/graph/neighbors/${entityId}`),
  getSimilaritySubgraph: (drugA, drugB) =>
    api.get('/graph/similarity-subgraph', { params: { drug_a: drugA, drug_b: drugB } }),
};

export const feedbackService = {
  submit: (feedbackData) => api.post('/feedback', feedbackData),
  list: (params) => api.get('/feedback', { params }),
  evaluate: (params) => api.post('/feedback/evaluate', null, { params }),
};

export const metaService = {
  getHealth: () => api.get('/system/health'),
  getReady: () => api.get('/system/ready'),
  getSystemStatus: () => api.get('/system/status'),
  getDrug: (id) => api.get(`/candidates/${id}`),
  searchDrugs: (q) => api.get('/candidates', { params: { drug: q } }),
};

export default api;
export const patientService = {
  getMedicines: (search) => api.get('/patient/medicines', { params: { q: search } }),
  getMedicineGuide: (name) => api.get(`/patient/medicines/${name}`),
  explainResearch: (data) => api.post('/patient/explain-research', data),
  getOverview: () => api.get('/patient/overview'),
  getRegimen: () => api.get('/patient/regimen'),
  addMedication: (data) => api.post('/patient/regimen', data),
  removeMedication: (id) => api.delete(`/patient/regimen/${id}`),
  toggleDose: (id) => api.post(`/patient/regimen/${id}/toggle`),
  checkRegimenSafety: () => api.post('/patient/regimen/safety-check'),
};

export const doctorService = {
  getOverview: () => api.get('/doctor/overview'),
  getInteractions: (drugs) => api.get('/doctor/interactions', { params: { drugs: Array.isArray(drugs) ? drugs.join(',') : drugs } }),
  getClinicalTrials: (disease, drug = null) => api.get('/doctor/clinical-trials', { params: { disease, drug } }),
  getLiveTrials: (params) => api.get('/doctor/clinical-trials/live', { params }),
  getAdverseEvents: (drug, limit = 5) => api.get('/doctor/adverse-events', { params: { drug, limit } }),
  analyzeRegimen: (medications, patientContext = null) => safetyService.analyze(medications, patientContext, 'doctor'),
};

export const reportsService = {
  downloadCandidateReport: (candidateId) => api.get(`/reports/candidate/${candidateId}/markdown`, { responseType: 'blob' }),
  downloadInvestigationReport: (workflowId) => api.get(`/reports/investigation/${workflowId}/markdown`, { responseType: 'blob' }),
};
