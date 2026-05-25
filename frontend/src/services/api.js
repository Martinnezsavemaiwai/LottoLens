import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// v2 client — separate base URL for the multi-lottery engine
const apiV2 = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace('/api/v1', '') + '/api/v2',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── v1 (Thai lottery — existing) ─────────────────────────────────────────────

/** Fetch frequency statistics for a specific prize type */
export const fetchFrequencyStats = async (prizeType = 'back2', limit = 10) => {
  const response = await api.get('/stats/frequency', {
    params: { prize_type: prizeType, limit },
  });
  return response.data;
};

/** Fetch positional statistics for a specific prize type */
export const fetchPositionalStats = async (prizeType = 'back2') => {
  const response = await api.get('/stats/positional', {
    params: { prize_type: prizeType },
  });
  return response.data;
};

/** Sync latest Thai draws from source */
export const syncDraws = async () => {
  const response = await api.post('/draws/sync');
  return response.data;
};

/** Fetch all Thai draws (history) with pagination */
export const fetchDraws = async (page = 1, limit = 50) => {
  const response = await api.get('/draws', {
    params: { page, limit },
  });
  return response.data;
};

/** Fetch Thai stats summary */
export const fetchStatsSummary = async () => {
  const response = await api.get('/stats/summary');
  return response.data;
};

/** Fetch AI analysis context */
export const fetchAIContext = async (prizeType = 'back2') => {
  const response = await api.get('/ai/context', {
    params: { prize_type: prizeType },
  });
  return response.data;
};

// ── v2 (Multi-Lottery Engine) ────────────────────────────────────────────────

/**
 * Fetch draw history for a given lottery type (lao | thai) with pagination.
 * @param {"lao"|"thai"} type
 * @param {number} page
 * @param {number} limit
 */
export const fetchLotteryHistory = async (type = 'lao', page = 1, limit = 50) => {
  const response = await apiV2.get('/lottery/history', {
    params: { type, page, limit },
  });
  return response.data;
};

/**
 * Fetch pre-computed stats for a given lottery type.
 * @param {"lao"|"thai"} type
 */
export const fetchLotteryStats = async (type = 'lao') => {
  const response = await apiV2.get('/lottery/stats', { params: { type } });
  return response.data;
};

/**
 * Post a new verified draw result.
 * @param {"lao"|"thai"} type
 * @param {{ date: string, full: string, verified?: boolean }} payload
 */
export const postLotteryResult = async (type, payload) => {
  const response = await apiV2.post('/lottery/result', { type, ...payload });
  return response.data;
};

export default api;

