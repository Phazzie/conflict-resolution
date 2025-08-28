import { describe, it, expect, beforeEach, vi } from 'vitest'
import { aiAnalysisService } from '../aiAnalysis'

// Mock the spark global object
const mockSpark = {
  llmPrompt: vi.fn((strings, ...values) => {
    return strings.join('') + values.join('')
  }),
  llm: vi.fn(() => Promise.resolve('{"toxicityScore": 0.2, "manipulationTactics": [], "suggestions": []}'))
}

Object.defineProperty(window, 'spark', {
  value: mockSpark,
  writable: true
})

describe('aiAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('analyzes message and returns structured response', async () => {
    const message = 'This is a test message'
    const context = {
      agreedIssue: 'Test issue',
      conflictContext: 'relationship' as const,
      previousMessages: []
    }

    const result = await aiAnalysisService.analyzeMessage(message, context)

    expect(result).toBeDefined()
    expect(result.toxicityScore).toBeGreaterThanOrEqual(0)
    expect(result.toxicityScore).toBeLessThanOrEqual(1)
    expect(Array.isArray(result.manipulationTactics)).toBe(true)
    expect(Array.isArray(result.suggestions)).toBe(true)
  })

  it('handles AI service failures gracefully', async () => {
    mockSpark.llm.mockRejectedValueOnce(new Error('AI service failed'))

    const message = 'Test message'
    const context = {
      agreedIssue: 'Test issue',
      conflictContext: 'relationship' as const,
      previousMessages: []
    }

    const result = await aiAnalysisService.analyzeMessage(message, context)

    // Should return fallback response
    expect(result).toBeDefined()
    expect(result.toxicityScore).toBe(0)
    expect(result.manipulationTactics).toEqual([])
  })

  it('validates AI response structure', async () => {
    mockSpark.llm.mockResolvedValueOnce('invalid json')

    const message = 'Test message'
    const context = {
      agreedIssue: 'Test issue',
      conflictContext: 'relationship' as const,
      previousMessages: []
    }

    const result = await aiAnalysisService.analyzeMessage(message, context)

    // Should return fallback response for invalid JSON
    expect(result).toBeDefined()
    expect(result.toxicityScore).toBe(0)
  })
})