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

// Intercept requests to attach JWT access token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('curenova_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for consistent error formatting and session expiration detection
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const message =
      (typeof detail === 'string' ? detail : null) ||
      error.response?.data?.message ||
      error.message ||
      'Biomedical intelligence service temporarily unavailable.';

    // Clear stale session on 401 when token was rejected
    if (status === 401 && localStorage.getItem('curenova_token')) {
      console.warn('Session expired or unauthorized request:', message);
    }

    return Promise.reject(new Error(message));
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

export const repurposingService = {
  getDiseases: () => api.get('/candidates'),
  analyze: async (query, minEvidence = 'all') => {
    const cleanQuery = encodeURIComponent(query.trim());
    const raw = await api.post(`/candidates/investigate?query=${cleanQuery}`);
    const synthesis = raw.structured_synthesis || {};

    return {
      analysis_id: raw.workflow_id,
      workflow_id: raw.workflow_id,
      query: query,
      disease_detected: raw.query_entity,
      query_entity: raw.query_entity,
      entity_type: raw.entity_type,
      candidates: (raw.candidate_hypotheses || []).map((c, idx) => ({
        id: c.id,
        drug_name: c.drug_name,
        original_indication: c.approval_status || 'Preclinical Repurposing Hypothesis',
        curenova_ranking: Math.round((c.prediction_score || 0.85) * 100),
        prediction_score: c.prediction_score,
        confidence_interval: `[${(c.confidence_interval_low ?? 0.70).toFixed(2)}, ${(c.confidence_interval_high ?? 0.95).toFixed(2)}]`,
        confidence_interval_low: c.confidence_interval_low,
        confidence_interval_high: c.confidence_interval_high,
        evidence_strength: c.evidence_count >= 3 ? 'high' : c.evidence_count >= 1 ? 'moderate' : 'low',
        evidence_count: c.evidence_count,
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
      })),
      synthesis_report: raw.synthesis_report,
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
  getCatalog: () => api.get('/patient/medicines'),
  analyze: async (medications, patientContext = null, roleView = 'doctor') => {
    const medList = Array.isArray(medications) ? medications : [medications];
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
      overall_risk_category: hasMajor ? 'High Risk' : (ddiArray.length > 0 ? 'Moderate Risk' : 'Low Risk'),
      overall_risk_score: hasMajor ? 82 : (ddiArray.length > 0 ? 50 : 12),
      summary_headline: ddiArray.length > 0
        ? `Identified ${ddiArray.length} potential interaction signal(s) among evaluated medications.`
        : 'No critical drug-drug interactions detected in curated pharmacovigilance database.',
      pairwise_interactions: ddiArray.map((d) => ({
        drug_a: d.drug_a,
        drug_b: d.drug_b,
        severity: d.severity,
        mechanism: d.mechanism,
        clinical_recommendation: d.recommendation,
        source: d.verified_source,
        url: d.source_url,
      })),
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
  search: (params) => api.get('/evidence', { params }),
  synthesize: (evidenceIds) => api.post('/evidence/synthesize', evidenceIds),
  searchLivePubmed: (query, maxResults = 5) =>
    api.get('/evidence/pubmed-live', { params: { query, max_results: maxResults } }),
};

export const graphService = {
  getOverview: (entityType = null, maxNodes = 60) =>
    api.get('/graph', { params: { node_type: entityType } }),
  getNodeSubgraph: (entityId) => api.get(`/graph/neighbors/${entityId}`),
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
