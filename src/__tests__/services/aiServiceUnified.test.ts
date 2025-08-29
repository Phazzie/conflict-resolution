import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIServiceUnified } from '../services/aiServiceUnified'
import { ConversationContext } from '../services/aiServiceUnified'

// Mock spark global
const mockLlm = vi.fn()
const mockLlmPrompt = vi.fn((template, ...values) => `${template.join('')}${values.join('')}`)

global.spark = {
  llm: mockLlm,
  llmPrompt: mockLlmPrompt,
  user: vi.fn(),
  kv: {
    keys: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
} as any

// Mock AI sanitizer
vi.mock('../utils/aiSanitizer', () => ({
  aiSanitizer: {
    sanitize: vi.fn((input) => input)
  }
}))

describe('AIServiceUnified - Emotional Intelligence', () => {
  let aiService: AIServiceUnified
  
  beforeEach(() => {
    vi.clearAllMocks()
    aiService = new AIServiceUnified()
    mockLlm.mockResolvedValue(JSON.stringify({
      hasManipulation: false,
      detectedTactics: [],
      overallTone: 'constructive',
      emotionalState: {
        level: 'calm',
        indicators: ['polite language', 'solution-focused'],
        confidence: 0.8
      },
      suggestion: 'Keep up the constructive communication',
      deescalationNeeded: false
    }))
  })

  describe('Emotional State Detection', () => {
    it('detects escalating emotions from conversation history', async () => {
      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'You ALWAYS do this! You NEVER listen!',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [
          { author: 'player1', content: 'This is getting frustrating!', timestamp: Date.now() - 1000 },
          { author: 'player2', content: 'You\'re being unreasonable!', timestamp: Date.now() - 500 }
        ]
      }

      await aiService.analyzeMessage(context.currentMessage, context)

      // Should call AI with escalation context
      const promptCall = mockLlmPrompt.mock.calls[0]
      expect(promptCall).toBeDefined()
      
      const promptString = promptCall.join('')
      expect(promptString).toContain('CRITICAL: The conversation is escalating')
      expect(promptString).toContain('prioritize de-escalation')
    })

    it('uses supportive tone for high emotional states', async () => {
      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'I just feel so frustrated',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [],
        userPreferences: {
          aiSensitivity: 'supportive',
          allowHumor: false
        }
      }

      await aiService.analyzeMessage(context.currentMessage, context)

      const promptString = mockLlmPrompt.mock.calls[0].join('')
      expect(promptString).toContain('gentle, empathetic language')
      expect(promptString).toContain('emotional validation')
      expect(promptString).toContain('supportive')
    })

    it('adapts tone based on user preferences', async () => {
      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'This is pointless',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [],
        userPreferences: {
          aiSensitivity: 'direct',
          allowHumor: true
        }
      }

      await aiService.analyzeMessage(context.currentMessage, context)

      const promptString = mockLlmPrompt.mock.calls[0].join('')
      expect(promptString).toContain('straightforward language')
      expect(promptString).toContain('dry humor when appropriate')
      expect(promptString).toContain('direct')
    })
  })

  describe('Escalation Prevention', () => {
    it('identifies escalation indicators in messages', async () => {
      const escalatingMessages = [
        'You ALWAYS do this!',
        'You never listen to me',
        'This is YOUR fault',
        'Whatever, I give up'
      ]

      for (const message of escalatingMessages) {
        const context: ConversationContext = {
          agreedIssue: 'Test issue',
          playerOneStatement: 'My position',
          playerTwoStatement: 'Other position',
          currentMessage: message,
          messageAuthor: 'player1',
          conflictContext: 'relationship',
          previousMessages: []
        }

        await aiService.analyzeMessage(message, context)
        
        // Verify that AI is alerted to potential escalation
        const promptString = mockLlmPrompt.mock.calls[mockLlmPrompt.mock.calls.length - 1].join('')
        expect(promptString).toContain('ANALYSIS REQUIRED')
        expect(promptString).toContain('Detect any manipulation tactics')
      }
    })

    it('provides de-escalation suggestions when needed', async () => {
      mockLlm.mockResolvedValue(JSON.stringify({
        hasManipulation: true,
        detectedTactics: [{
          tactic: 'blame-shifting',
          confidence: 0.8,
          description: 'Message shifts blame to the other person',
          suggestion: 'Try using "I feel" statements instead'
        }],
        overallTone: 'aggressive',
        emotionalState: {
          level: 'escalating',
          indicators: ['blame language', 'absolute statements'],
          confidence: 0.9
        },
        suggestion: 'Let\'s take a step back and focus on the issue rather than blame',
        rephraseOption: 'I feel frustrated when this happens',
        deescalationNeeded: true
      }))

      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'This is all your fault!',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      const result = await aiService.analyzeMessage(context.currentMessage, context)

      expect(result.deescalationNeeded).toBe(true)
      expect(result.hasManipulation).toBe(true)
      expect(result.detectedTactics).toHaveLength(1)
      expect(result.detectedTactics[0].tactic).toBe('blame-shifting')
      expect(result.rephraseOption).toContain('I feel frustrated')
    })
  })

  describe('Fallback Handling', () => {
    it('provides safe fallback when AI service fails', async () => {
      mockLlm.mockRejectedValue(new Error('AI service unavailable'))

      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'Test message',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      const result = await aiService.analyzeMessage(context.currentMessage, context)

      expect(result).toBeDefined()
      expect(result.suggestion).toContain('continue sharing')
      expect(result.hasManipulation).toBe(false)
      expect(result.overallTone).toBe('constructive')
    })

    it('handles malformed AI responses gracefully', async () => {
      mockLlm.mockResolvedValue('invalid json response')

      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'Test message',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      const result = await aiService.analyzeMessage(context.currentMessage, context)

      expect(result).toBeDefined()
      expect(result.suggestion).toBeDefined()
      expect(typeof result.suggestion).toBe('string')
    })

    it('provides context-appropriate fallbacks based on user preferences', async () => {
      mockLlm.mockRejectedValue(new Error('Service down'))

      const supportiveContext: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'Test message',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [],
        userPreferences: {
          aiSensitivity: 'supportive',
          allowHumor: false
        }
      }

      const result = await aiService.analyzeMessage(supportiveContext.currentMessage, supportiveContext)

      expect(result.suggestion).toContain('sharing')
      expect(result.aiSensitivity).toBe('supportive')
    })
  })

  describe('Context Awareness', () => {
    it('adapts suggestions based on conflict context', async () => {
      const workplaceContext: ConversationContext = {
        agreedIssue: 'Project deadline disagreement',
        playerOneStatement: 'My work position',
        playerTwoStatement: 'Their work position',
        currentMessage: 'This project is doomed',
        messageAuthor: 'player1',
        conflictContext: 'workplace',
        previousMessages: []
      }

      await aiService.analyzeMessage(workplaceContext.currentMessage, workplaceContext)

      const promptString = mockLlmPrompt.mock.calls[0].join('')
      expect(promptString).toContain('workplace')
      expect(promptString).toContain('Project deadline disagreement')
    })

    it('considers locked statements for consistency checking', async () => {
      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'I value honesty above all',
        playerTwoStatement: 'I need more communication',
        currentMessage: 'I don\'t care about being honest',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      await aiService.analyzeMessage(context.currentMessage, context)

      const promptString = mockLlmPrompt.mock.calls[0].join('')
      expect(promptString).toContain('I value honesty above all')
      expect(promptString).toContain('I need more communication')
    })
  })

  describe('Manipulation Detection', () => {
    it('detects gaslighting attempts', async () => {
      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'That never happened, you\'re imagining things',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      await aiService.analyzeMessage(context.currentMessage, context)

      const promptString = mockLlmPrompt.mock.calls[0].join('')
      expect(promptString).toContain('gaslighting')
      expect(promptString).toContain('manipulation tactics')
    })

    it('provides educational feedback about detected tactics', async () => {
      mockLlm.mockResolvedValue(JSON.stringify({
        hasManipulation: true,
        detectedTactics: [{
          tactic: 'stonewalling',
          confidence: 0.7,
          description: 'Refusing to engage with the topic',
          suggestion: 'Try expressing your need for a break instead of shutting down'
        }],
        overallTone: 'defensive',
        emotionalState: {
          level: 'frustrated',
          indicators: ['withdrawal language'],
          confidence: 0.6
        },
        suggestion: 'It looks like you might need some space. Could you share what you need right now?',
        deescalationNeeded: true
      }))

      const context: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'My position',
        playerTwoStatement: 'Other position',
        currentMessage: 'I\'m done talking about this',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      const result = await aiService.analyzeMessage(context.currentMessage, context)

      expect(result.detectedTactics[0].tactic).toBe('stonewalling')
      expect(result.detectedTactics[0].description).toContain('Refusing to engage')
      expect(result.suggestion).toContain('space')
    })
  })
})