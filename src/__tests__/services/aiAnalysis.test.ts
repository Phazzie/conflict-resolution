import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIAnalysisService } from '../../services/aiAnalysis'

// Mock the spark global object
const mockSpark = {
  llmPrompt: vi.fn((strings, ...values) => {
    return strings.join('') + values.join('')
  }),
  llm: vi.fn(() => Promise.resolve(JSON.stringify({
    manipulationTactics: [],
    emotionalTone: { tone: 'neutral', intensity: 0.3 },
    toxicityScore: 0.2,
    suggestions: [{ type: 'rephrasing', content: 'Try being more specific' }],
    overallTone: 'constructive'
  })))
}

Object.defineProperty(window, 'spark', {
  value: mockSpark,
  writable: true
})

// Mock the AI sanitizer
vi.mock('../../utils/aiSanitizer', () => ({
  aiSanitizer: {
    sanitizeResponse: vi.fn((input) => input),
    validateJSONResponse: vi.fn((input) => ({ 
      valid: true, 
      parsed: JSON.parse(input) 
    })),
    sanitizeAIAnalysis: vi.fn((analysis) => analysis)
  }
}))

const aiAnalysisService = AIAnalysisService.getInstance()

describe('AIAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeMessage', () => {
    const mockContext = {
      previousMessages: ['Hello', 'How are you?'],
      agreedIssue: 'We need to discuss household chores',
      playerStatements: {
        player1: 'I feel overwhelmed by the mess',
        player2: 'I feel criticized about cleaning'
      },
      messageAuthor: 'player1' as const
    }

    it('analyzes message and returns structured response', async () => {
      const message = 'I think we should divide chores more fairly'

      const result = await aiAnalysisService.analyzeMessage(message, mockContext)

      expect(result).toBeDefined()
      expect(result.toxicityScore).toBeGreaterThanOrEqual(0)
      expect(result.toxicityScore).toBeLessThanOrEqual(1)
      expect(Array.isArray(result.manipulationTactics)).toBe(true)
      expect(Array.isArray(result.suggestions)).toBe(true)
      expect(result.emotionalTone).toBeDefined()
      expect(result.overallTone).toBeDefined()
    })

    it('handles AI service failures gracefully with fallback', async () => {
      mockSpark.llm.mockRejectedValueOnce(new Error('AI service failed'))

      const message = 'You never help with anything'
      const result = await aiAnalysisService.analyzeMessage(message, mockContext)

      // Should return fallback response
      expect(result).toBeDefined()
      expect(result.toxicityScore).toBeGreaterThan(0) // Fallback detects problematic content
      expect(result.manipulationTactics.length).toBeGreaterThan(0) // Should detect manipulation
      expect(result.suggestions.length).toBeGreaterThan(0) // Should provide suggestions
    })

    it('validates and handles invalid AI response structure', async () => {
      // Mock invalid JSON response
      const { aiSanitizer } = await import('../../utils/aiSanitizer')
      vi.mocked(aiSanitizer.validateJSONResponse).mockReturnValueOnce({ 
        valid: false, 
        error: 'Invalid JSON structure' 
      })

      const message = 'This should trigger fallback'
      const result = await aiAnalysisService.analyzeMessage(message, mockContext)

      // Should return fallback response for invalid JSON
      expect(result).toBeDefined()
      expect(result.toxicityScore).toBeGreaterThanOrEqual(0)
      expect(result.manipulationTactics).toBeDefined()
      expect(result.suggestions).toBeDefined()
    })

    it('detects manipulation tactics in problematic messages', async () => {
      mockSpark.llm.mockResolvedValueOnce(JSON.stringify({
        manipulationTactics: [
          { type: 'gaslighting', confidence: 0.8, description: 'Denying reality' }
        ],
        emotionalTone: { tone: 'hostile', intensity: 0.9 },
        toxicityScore: 0.7,
        suggestions: [{ type: 'rephrasing', content: 'Try using I statements' }],
        overallTone: 'destructive'
      }))

      const message = 'You are imagining things, that never happened'
      const result = await aiAnalysisService.analyzeMessage(message, mockContext)

      expect(result.manipulationTactics.length).toBeGreaterThan(0)
      expect(result.toxicityScore).toBeGreaterThan(0.5)
      expect(result.emotionalTone.intensity).toBeGreaterThan(0.7)
    })

    it('provides appropriate suggestions for different message types', async () => {
      mockSpark.llm.mockResolvedValueOnce(JSON.stringify({
        manipulationTactics: [],
        emotionalTone: { tone: 'frustrated', intensity: 0.6 },
        toxicityScore: 0.4,
        suggestions: [
          { type: 'empathy', content: 'Try acknowledging their feelings first' },
          { type: 'specificity', content: 'Be more specific about what you need' }
        ],
        overallTone: 'frustrated'
      }))

      const message = 'I am frustrated because things never get better'
      const result = await aiAnalysisService.analyzeMessage(message, mockContext)

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.type === 'empathy')).toBe(true)
      expect(result.emotionalTone.tone).toBe('frustrated')
    })
  })

  describe('generateIntervention', () => {
    it('generates contextual interventions based on analysis', async () => {
      mockSpark.llm.mockResolvedValueOnce('Here is a more constructive way to express that concern')

      const mockManipulation = [
        { type: 'blame-shifting', confidence: 0.7, description: 'Avoiding responsibility' }
      ]
      const mockTone = { tone: 'defensive', intensity: 0.8 }

      const intervention = await aiAnalysisService.generateIntervention(
        mockManipulation,
        mockTone,
        'This is all your fault for not listening'
      )

      expect(typeof intervention).toBe('string')
      expect(intervention.length).toBeGreaterThan(0)
      expect(mockSpark.llm).toHaveBeenCalledWith(
        expect.stringContaining('intervention'),
        'gpt-4o',
        false
      )
    })

    it('provides fallback interventions when AI fails', async () => {
      mockSpark.llm.mockRejectedValueOnce(new Error('AI failed'))

      const mockManipulation = [
        { type: 'gaslighting', confidence: 0.9, description: 'Reality denial' }
      ]
      const mockTone = { tone: 'hostile', intensity: 0.5 }

      const intervention = await aiAnalysisService.generateIntervention(
        mockManipulation,
        mockTone,
        'You are completely wrong about everything'
      )

      expect(intervention).toContain('problematic undertones')
    })

    it('selects appropriate fallback based on manipulation type', async () => {
      mockSpark.llm.mockRejectedValueOnce(new Error('AI failed'))

      const mockEmotionalEscalation = []
      const mockHighIntensityTone = { tone: 'angry', intensity: 0.9 }

      const intervention = await aiAnalysisService.generateIntervention(
        mockEmotionalEscalation,
        mockHighIntensityTone,
        'I HATE THIS SITUATION'
      )

      expect(intervention).toContain('Take a breath')
    })
  })

  describe('singleton pattern', () => {
    it('maintains singleton instance', () => {
      const instance1 = AIAnalysisService.getInstance()
      const instance2 = AIAnalysisService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('fallback analysis', () => {
    it('generates appropriate fallback for manipulation patterns', async () => {
      // Force fallback by making AI fail
      mockSpark.llm.mockRejectedValueOnce(new Error('AI service unavailable'))

      const message = 'You always do this and you never listen'
      const result = await aiAnalysisService.analyzeMessage(message, {
        previousMessages: [],
        agreedIssue: 'Communication issues',
        playerStatements: { player1: 'I need respect', player2: 'I need patience' },
        messageAuthor: 'player1'
      })

      // Fallback should detect basic patterns
      expect(result.toxicityScore).toBeGreaterThan(0)
      expect(result.manipulationTactics.length).toBeGreaterThan(0)
      expect(result.manipulationTactics.some(t => t.type === 'always-never-statements')).toBe(true)
    })

    it('handles emotional escalation in fallback mode', async () => {
      mockSpark.llm.mockRejectedValueOnce(new Error('Service down'))

      const message = 'I AM SO SICK OF THIS BULLSHIT'
      const result = await aiAnalysisService.analyzeMessage(message, {
        previousMessages: [],
        agreedIssue: 'Ongoing conflict',
        playerStatements: { player1: 'I am angry', player2: 'I am defensive' },
        messageAuthor: 'player2'
      })

      expect(result.emotionalTone.intensity).toBeGreaterThan(0.7)
      expect(result.toxicityScore).toBeGreaterThan(0.5)
    })
  })
})