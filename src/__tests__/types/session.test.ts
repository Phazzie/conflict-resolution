import { describe, it, expect } from 'vitest'
import { 
  PHASE_PROGRESS, 
  PHASE_NAMES, 
  SessionPhase, 
  PlayerRole, 
  ConflictContext,
  SessionData,
  Message 
} from '../../types/session'

describe('Session Types', () => {
  describe('PHASE_PROGRESS', () => {
    it('has correct progress values for all phases', () => {
      expect(PHASE_PROGRESS.welcome).toBe(0)
      expect(PHASE_PROGRESS['ai-preferences']).toBe(5)
      expect(PHASE_PROGRESS['context-selection']).toBe(10)
      expect(PHASE_PROGRESS['issue-agreement']).toBe(20)
      expect(PHASE_PROGRESS['steel-manning']).toBe(40)
      expect(PHASE_PROGRESS['statement-locking']).toBe(60)
      expect(PHASE_PROGRESS.discussion).toBe(80)
      expect(PHASE_PROGRESS.resolution).toBe(90)
      expect(PHASE_PROGRESS.summary).toBe(100)
    })

    it('has progress values between 0 and 100', () => {
      Object.values(PHASE_PROGRESS).forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0)
        expect(progress).toBeLessThanOrEqual(100)
      })
    })

    it('has monotonically increasing progress through main phases', () => {
      const mainPhases: SessionPhase[] = [
        'welcome', 'ai-preferences', 'context-selection', 
        'issue-agreement', 'steel-manning', 'statement-locking', 
        'discussion', 'resolution', 'summary'
      ]
      
      for (let i = 1; i < mainPhases.length; i++) {
        expect(PHASE_PROGRESS[mainPhases[i]]).toBeGreaterThan(
          PHASE_PROGRESS[mainPhases[i - 1]]
        )
      }
    })
  })

  describe('PHASE_NAMES', () => {
    it('has descriptive names for all phases', () => {
      expect(PHASE_NAMES.welcome).toBe('Digital Thunderdome Entry')
      expect(PHASE_NAMES['ai-preferences']).toBe('AI Personality Setup')
      expect(PHASE_NAMES['issue-agreement']).toBe('Issue Agreement')
      expect(PHASE_NAMES['steel-manning']).toBe('Steel-Manning Phase')
    })

    it('has names for all phases in PHASE_PROGRESS', () => {
      Object.keys(PHASE_PROGRESS).forEach(phase => {
        expect(PHASE_NAMES[phase as SessionPhase]).toBeDefined()
        expect(typeof PHASE_NAMES[phase as SessionPhase]).toBe('string')
        expect(PHASE_NAMES[phase as SessionPhase].length).toBeGreaterThan(0)
      })
    })
  })

  describe('Type Definitions', () => {
    it('PlayerRole has correct values', () => {
      const validRoles: PlayerRole[] = ['player1', 'player2']
      validRoles.forEach(role => {
        expect(['player1', 'player2']).toContain(role)
      })
    })

    it('ConflictContext has correct values', () => {
      const validContexts: ConflictContext[] = ['relationship', 'workplace', 'family']
      validContexts.forEach(context => {
        expect(['relationship', 'workplace', 'family']).toContain(context)
      })
    })

    describe('SessionData interface', () => {
      it('creates valid SessionData object', () => {
        const sessionData: SessionData = {
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

        expect(sessionData.phase).toBe('welcome')
        expect(sessionData.conflictContext).toBe('relationship')
        expect(sessionData.sessionStarted).toBeTypeOf('number')
        expect(Array.isArray(sessionData.messages)).toBe(true)
      })

      it('accepts optional properties', () => {
        const sessionData: SessionData = {
          phase: 'discussion',
          conflictContext: 'workplace',
          agreedIssue: 'Test issue',
          playerOneSteelMan: '',
          playerTwoSteelMan: '',
          playerOneStatement: '',
          playerTwoStatement: '',
          messages: [],
          proposedResolution: '',
          finalResolution: '',
          sessionStarted: Date.now(),
          isMultiplayer: true,
          sessionId: 'test-session-123',
          participants: [{
            playerId: 'player1',
            isOnline: true,
            lastSeen: Date.now(),
            isTyping: false
          }]
        }

        expect(sessionData.isMultiplayer).toBe(true)
        expect(sessionData.sessionId).toBe('test-session-123')
        expect(sessionData.participants).toHaveLength(1)
      })
    })

    describe('Message interface', () => {
      it('creates valid Message object', () => {
        const message: Message = {
          id: 'msg-123',
          author: 'player1',
          content: 'Test message',
          timestamp: Date.now()
        }

        expect(message.id).toBe('msg-123')
        expect(message.author).toBe('player1')
        expect(message.content).toBe('Test message')
        expect(message.timestamp).toBeTypeOf('number')
      })

      it('accepts all valid authors', () => {
        const authors: Message['author'][] = ['player1', 'player2', 'ai']
        
        authors.forEach(author => {
          const message: Message = {
            id: 'msg-test',
            author,
            content: 'Test',
            timestamp: Date.now()
          }
          expect(['player1', 'player2', 'ai']).toContain(message.author)
        })
      })

      it('accepts optional analysis properties', () => {
        const message: Message = {
          id: 'msg-123',
          author: 'player1',
          content: 'Test message',
          timestamp: Date.now(),
          detectedPatterns: ['blame-shifting', 'deflection'],
          mlConfidence: 0.85,
          mlEnhanced: true
        }

        expect(message.detectedPatterns).toContain('blame-shifting')
        expect(message.mlConfidence).toBe(0.85)
        expect(message.mlEnhanced).toBe(true)
      })
    })
  })
})