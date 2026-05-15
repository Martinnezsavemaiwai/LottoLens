import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch frequency statistics for a specific prize type
 * @param {string} prizeType - 'first', 'front3', 'back3', 'back2'
 * @param {number} limit - Number of results to return
 */
export const fetchFrequencyStats = async (prizeType = 'back2', limit = 10) => {
  const response = await api.get('/stats/frequency', {
    params: { prize_type: prizeType, limit },
  });
  return response.data;
};

/**
 * Fetch positional statistics for a specific prize type
 * @param {string} prizeType - 'first', 'front3', 'back3', 'back2'
 */
export const fetchPositionalStats = async (prizeType = 'back2') => {
  const response = await api.get('/stats/positional', {
    params: { prize_type: prizeType },
  });
  return response.data;
};

/**
 * Sync latest draws from source
 */
export const syncDraws = async () => {
  const response = await api.post('/draws/sync');
  return response.data;
};

/**
 * Fetch all draws (history) with pagination
 */
export const fetchDraws = async (page = 1, limit = 50) => {
  const response = await api.get('/draws', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Fetch stats summary
 */
export const fetchStatsSummary = async () => {
  const response = await api.get('/stats/summary');
  return response.data;
};

/**
 * Fetch AI analysis context (Mathematical Context)
 * @param {string} prizeType - 'first', 'front3', 'back3', 'back2'
 */
export const fetchAIContext = async (prizeType = 'back2') => {
  const response = await api.get('/ai/context', {
    params: { prize_type: prizeType },
  });
  return response.data;
};

export default api;
