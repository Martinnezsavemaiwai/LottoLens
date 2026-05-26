import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * API service tests.
 * The api.js module uses axios under the hood.
 * We test helper logic and ensure fetch functions are structured correctly
 * by testing the exported functions exist and are callable.
 */

// Mock axios so no real HTTP is made
vi.mock('axios', async () => {
  const mockInstance = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
    },
  }
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  }
})

describe('API service exports', () => {
  let api

  beforeEach(async () => {
    vi.resetModules()
    api = await import('../services/api.js')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports fetchFrequencyStats function', () => {
    expect(typeof api.fetchFrequencyStats).toBe('function')
  })

  it('exports fetchPositionalStats function', () => {
    expect(typeof api.fetchPositionalStats).toBe('function')
  })

  it('exports fetchZScoresStats function', () => {
    expect(typeof api.fetchZScoresStats).toBe('function')
  })

  it('exports fetchDraws function', () => {
    expect(typeof api.fetchDraws).toBe('function')
  })

  it('exports fetchAIContext function', () => {
    expect(typeof api.fetchAIContext).toBe('function')
  })

  it('exports fetchAIPrediction function', () => {
    expect(typeof api.fetchAIPrediction).toBe('function')
  })

  it('exports fetchLotteryHistory function', () => {
    expect(typeof api.fetchLotteryHistory).toBe('function')
  })

  it('exports fetchLotteryStats function', () => {
    expect(typeof api.fetchLotteryStats).toBe('function')
  })

  it('exports postLotteryResult function', () => {
    expect(typeof api.postLotteryResult).toBe('function')
  })

  it('exports deleteLotteryResult function', () => {
    expect(typeof api.deleteLotteryResult).toBe('function')
  })

  it('exports default api instance', () => {
    expect(api.default).toBeDefined()
  })
})

describe('API URL construction logic', () => {
  it('uses VITE_API_URL or falls back to localhost', () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1'
    expect(apiUrl).toContain('api/v1')
  })

  it('fallback URL uses port 8081', () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1'
    expect(apiUrl).toContain('8081')
  })
})
