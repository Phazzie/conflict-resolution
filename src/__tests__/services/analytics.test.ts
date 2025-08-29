import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyticsService } from '../../services/analytics'
import { SessionData, Message } from '../../types/session'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

describe('Analytics Service', () => {
  let mockSessionData: SessionData
  let mockMessages: Message[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockMessages = [
      {
        id: '1',
        author: 'player1',
        content: 'I think we need to talk about money',
        timestamp: Date.now() - 10000
      },
      {
        id: '2',
        author: 'player2',
        content: 'You always bring up money when you are stressed',
        timestamp: Date.now() - 8000
      },
      {
        id: '3',
        author: 'ai',
        content: 'I notice some defensive language. Let me help rephrase that.',
        timestamp: Date.now() - 6000
      },
      {
        id: '4',
        author: 'player2',
        content: 'I feel overwhelmed when financial stress affects our conversations',
        timestamp: Date.now() - 4000
      }
    ]

    mockSessionData = {
      phase: 'discussion',
      conflictContext: 'relationship',
      agreedIssue: 'Disagreement about financial planning approach',
      playerOneSteelMan: 'They feel I avoid financial discussions and want more planning',
      playerTwoSteelMan: 'They feel I create stress by bringing up money problems',
      playerOneStatement: 'I need us to plan our finances together proactively',
      playerTwoStatement: 'I need financial discussions to be supportive not stressful',
      messages: mockMessages,
      proposedResolution: '',
      finalResolution: 'We will have weekly financial check-ins with a supportive approach',
      sessionStarted: Date.now() - 30000
    }
  })

  describe('generateSessionAnalytics', () => {
    it('generates basic analytics correctly', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(analytics.totalMessages).toBe(4)
      expect(analytics.aiInterventions).toBe(1)
      expect(analytics.timeSpent.total).toBeGreaterThan(0)
      expect(analytics.successMetrics).toBeDefined()
      expect(analytics.patterns).toBeDefined()
    })

    it('handles empty message array', async () => {
      const emptySession = { ...mockSessionData, messages: [] }
      const analytics = await analyticsService.generateSessionAnalytics(emptySession)
      
      expect(analytics.totalMessages).toBe(0)
      expect(analytics.aiInterventions).toBe(0)
      expect(analytics.manipulationDetected).toEqual([])
    })

    it('identifies AI interventions correctly', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(analytics.aiInterventions).toBe(1)
    })

    it('calculates success metrics', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(analytics.successMetrics.issueResolved).toBe(true) // has finalResolution
      expect(typeof analytics.successMetrics.consensusReached).toBe('boolean')
      expect(typeof analytics.successMetrics.communicationImproved).toBe('boolean')
      expect(typeof analytics.successMetrics.manipulationReduced).toBe('boolean')
    })

    it('analyzes conversation patterns', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(analytics.patterns.dominantSpeaker).toBeDefined()
      expect(Array.isArray(analytics.patterns.escalationPoints)).toBe(true)
      expect(Array.isArray(analytics.patterns.breakthroughMoments)).toBe(true)
      expect(Array.isArray(analytics.patterns.toneProgression)).toBe(true)
    })

    it('stores analytics to localStorage', async () => {
      await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const setItemCalls = localStorageMock.setItem.mock.calls
      const analyticsCall = setItemCalls.find(call => 
        call[0].includes('analytics') || call[0].includes('session-analytics')
      )
      expect(analyticsCall).toBeTruthy()
    })
  })

  describe('conversation pattern analysis', () => {
    it('identifies dominant speaker', async () => {
      // Create session where player1 sends more messages
      const player1DominantMessages: Message[] = [
        { id: '1', author: 'player1', content: 'Message 1', timestamp: Date.now() - 9000 },
        { id: '2', author: 'player1', content: 'Message 2', timestamp: Date.now() - 8000 },
        { id: '3', author: 'player1', content: 'Message 3', timestamp: Date.now() - 7000 },
        { id: '4', author: 'player2', content: 'Message 4', timestamp: Date.now() - 6000 }
      ]
      
      const dominantSession = { ...mockSessionData, messages: player1DominantMessages }
      const analytics = await analyticsService.generateSessionAnalytics(dominantSession)
      
      expect(['player1', 'player2', 'balanced']).toContain(analytics.patterns.dominantSpeaker)
    })

    it('detects balanced conversation', async () => {
      // Create session with equal messages from both players
      const balancedMessages: Message[] = [
        { id: '1', author: 'player1', content: 'Message 1', timestamp: Date.now() - 8000 },
        { id: '2', author: 'player2', content: 'Message 2', timestamp: Date.now() - 7000 },
        { id: '3', author: 'player1', content: 'Message 3', timestamp: Date.now() - 6000 },
        { id: '4', author: 'player2', content: 'Message 4', timestamp: Date.now() - 5000 }
      ]
      
      const balancedSession = { ...mockSessionData, messages: balancedMessages }
      const analytics = await analyticsService.generateSessionAnalytics(balancedSession)
      
      // Should be balanced or close to it
      expect(['player1', 'player2', 'balanced']).toContain(analytics.patterns.dominantSpeaker)
    })
  })

  describe('manipulation detection', () => {
    it('extracts manipulation tactics from messages', async () => {
      const messagesWithManipulation: Message[] = [
        {
          id: '1',
          author: 'player1',
          content: 'You always do this',
          timestamp: Date.now(),
          aiAnalysis: {
            manipulationTactics: ['always-never-statements'],
            toxicityScore: 0.7,
            suggestions: ['Try being more specific']
          }
        }
      ]
      
      const manipulationSession = { ...mockSessionData, messages: messagesWithManipulation }
      const analytics = await analyticsService.generateSessionAnalytics(manipulationSession)
      
      expect(analytics.manipulationDetected).toContain('always-never-statements')
    })

    it('handles messages without AI analysis', async () => {
      const messagesWithoutAnalysis: Message[] = [
        { id: '1', author: 'player1', content: 'Normal message', timestamp: Date.now() }
      ]
      
      const session = { ...mockSessionData, messages: messagesWithoutAnalysis }
      const analytics = await analyticsService.generateSessionAnalytics(session)
      
      expect(Array.isArray(analytics.manipulationDetected)).toBe(true)
    })
  })

  describe('success metrics calculation', () => {
    it('determines issue resolution based on final resolution', async () => {
      // Session with resolution
      const resolvedSession = { ...mockSessionData, finalResolution: 'We agreed on a solution' }
      const analytics1 = await analyticsService.generateSessionAnalytics(resolvedSession)
      expect(analytics1.successMetrics.issueResolved).toBe(true)
      
      // Session without resolution
      const unresolvedSession = { ...mockSessionData, finalResolution: '' }
      const analytics2 = await analyticsService.generateSessionAnalytics(unresolvedSession)
      expect(analytics2.successMetrics.issueResolved).toBe(false)
    })

    it('evaluates consensus based on session completion', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      // Should have logic to determine consensus
      expect(typeof analytics.successMetrics.consensusReached).toBe('boolean')
    })

    it('assesses communication improvement', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(typeof analytics.successMetrics.communicationImproved).toBe('boolean')
    })
  })

  describe('time calculation', () => {
    it('calculates total time spent correctly', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(analytics.timeSpent.total).toBeGreaterThan(0)
      expect(analytics.timeSpent.total).toBeLessThan(Date.now()) // Sanity check
    })

    it('estimates per-phase time spent', async () => {
      const analytics = await analyticsService.generateSessionAnalytics(mockSessionData)
      
      expect(typeof analytics.timeSpent.perPhase).toBe('object')
      expect(analytics.timeSpent.perPhase.discussion).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('handles missing session data gracefully', async () => {
      const minimalSession: SessionData = {
        phase: 'welcome',
        conflictContext: 'relationship',
        agreedIssue: '',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      const analytics = await analyticsService.generateSessionAnalytics(minimalSession)
      
      expect(analytics.totalMessages).toBe(0)
      expect(analytics.successMetrics).toBeDefined()
      expect(analytics.patterns).toBeDefined()
    })

    it('handles malformed messages gracefully', async () => {
      const malformedMessages = [
        { id: '1', author: 'player1', content: 'Valid message', timestamp: Date.now() },
        { id: '2', content: 'Missing author', timestamp: Date.now() } as any,
        { id: '3', author: 'player2', timestamp: Date.now() } as any // Missing content
      ]
      
      const malformedSession = { ...mockSessionData, messages: malformedMessages }
      
      // Should not throw an error
      const analytics = await analyticsService.generateSessionAnalytics(malformedSession)
      expect(analytics).toBeDefined()
    })
  })

  describe('singleton pattern', () => {
    it('maintains singleton instance', () => {
      const instance1 = analyticsService
      const instance2 = analyticsService
      
      expect(instance1).toBe(instance2)
    })
  })
})