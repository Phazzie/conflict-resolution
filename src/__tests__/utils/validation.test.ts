import { describe, it, expect, beforeEach } from 'vitest'
import { 
  validateSessionData, 
  sanitizeInput, 
  sanitizeObject,
  validateIssueInput,
  validateSteelManInput,
  validateStatementInput,
  validateMessageInput,
  createAtomicUpdate,
  attemptSessionRecovery
} from '../../utils/validation'
import { SessionData } from '../../types/session'

describe('Input Sanitization', () => {
  describe('sanitizeInput', () => {
    it('sanitizes HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
      expect(sanitizeInput('Hello & goodbye')).toBe('Hello &amp; goodbye')
      expect(sanitizeInput("It's a 'test'")).toBe('It&#x27;s a &#x27;test&#x27;')
    })

    it('trims whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world')
    })

    it('handles non-string input gracefully', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(123 as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
    })

    it('preserves safe content', () => {
      expect(sanitizeInput('Hello world')).toBe('Hello world')
      expect(sanitizeInput('123-456-789')).toBe('123-456-789')
    })
  })

  describe('sanitizeObject', () => {
    it('sanitizes string properties', () => {
      const obj = {
        name: '<script>alert("xss")</script>',
        count: 42,
        active: true
      }
      const sanitized = sanitizeObject(obj)
      
      expect(sanitized.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
      expect(sanitized.count).toBe(42)
      expect(sanitized.active).toBe(true)
    })

    it('sanitizes array items', () => {
      const obj = {
        tags: ['<script>', 'safe tag', '<img>'],
        numbers: [1, 2, 3]
      }
      const sanitized = sanitizeObject(obj)
      
      expect(sanitized.tags[0]).toBe('&lt;script&gt;')
      expect(sanitized.tags[1]).toBe('safe tag')
      expect(sanitized.tags[2]).toBe('&lt;img&gt;')
      expect(sanitized.numbers).toEqual([1, 2, 3])
    })
  })
})

describe('Session Data Validation', () => {
  let validSessionData: SessionData

  beforeEach(() => {
    validSessionData = {
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
  })

  describe('validateSessionData', () => {
    it('validates correct session data', () => {
      const result = validateSessionData(validSessionData)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects null or undefined data', () => {
      const result1 = validateSessionData(null)
      expect(result1.isValid).toBe(false)
      expect(result1.error).toContain('session data got scrambled')

      const result2 = validateSessionData(undefined)
      expect(result2.isValid).toBe(false)
      expect(result2.error).toContain('session data got scrambled')
    })

    it('rejects invalid phase', () => {
      const invalidData = { ...validSessionData, phase: 'invalid-phase' as any }
      const result = validateSessionData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('confused about where you are')
    })

    it('validates phase-specific requirements', () => {
      // Steel-manning phase requires agreed issue
      const steelManningPhase = { ...validSessionData, phase: 'steel-manning' as const }
      const result1 = validateSessionData(steelManningPhase)
      expect(result1.isValid).toBe(false)
      expect(result1.error).toContain('agree on what you\'re actually fighting about')

      // Statement-locking requires steel-manning
      const statementPhase = { 
        ...validSessionData, 
        phase: 'statement-locking' as const,
        agreedIssue: 'Test issue that is long enough'
      }
      const result2 = validateSessionData(statementPhase)
      expect(result2.isValid).toBe(false)
      expect(result2.error).toContain('prove they understand each other')
    })

    it('provides warnings for data issues', () => {
      const dataWithIssues = {
        ...validSessionData,
        conflictContext: 'unknown' as any,
        sessionStarted: -1
      }
      const result = validateSessionData(dataWithIssues)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings?.length).toBeGreaterThan(0)
    })

    it('validates message format', () => {
      const invalidMessages = {
        ...validSessionData,
        phase: 'discussion' as const,
        agreedIssue: 'Valid agreed issue that is long enough',
        playerOneSteelMan: 'Valid steel man that is long enough to pass validation',
        playerTwoSteelMan: 'Valid steel man that is long enough to pass validation',
        playerOneStatement: 'Valid statement',
        playerTwoStatement: 'Valid statement',
        messages: [
          { invalid: 'message' } // Missing required fields
        ]
      }
      const result = validateSessionData(invalidMessages)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid message format')
    })
  })
})

describe('Input Validation Functions', () => {
  describe('validateIssueInput', () => {
    it('accepts valid issue input', () => {
      const result = validateIssueInput('We have different approaches to managing finances')
      expect(result.isValid).toBe(true)
    })

    it('rejects short input', () => {
      const result = validateIssueInput('short')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least 10 characters')
      expect(result.suggestions).toBeDefined()
    })

    it('rejects very long input', () => {
      const longText = 'a'.repeat(501)
      const result = validateIssueInput(longText)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('under 500 characters')
    })

    it('detects problematic patterns', () => {
      const result = validateIssueInput("You're always wrong about everything")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Absolute statements')
      expect(result.suggestions).toBeDefined()
    })

    it('detects personal attacks', () => {
      const result = validateIssueInput('You are so stupid about money')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Personal attacks')
    })
  })

  describe('validateSteelManInput', () => {
    it('accepts valid steel-man input', () => {
      const result = validateSteelManInput('From their perspective, they might feel overwhelmed by financial decisions and want more structure')
      expect(result.isValid).toBe(true)
    })

    it('rejects short input', () => {
      const result = validateSteelManInput('too short')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least 20 characters')
    })

    it('rejects overly long input', () => {
      const longText = 'a'.repeat(1001)
      const result = validateSteelManInput(longText)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('under 1000 characters')
    })

    it('detects bad faith patterns', () => {
      const result = validateSteelManInput('Obviously they think they know everything about money')
      expect(result.isValid).toBe(true)
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions).toContain("Use 'from their perspective' language")
    })
  })

  describe('validateStatementInput', () => {
    it('accepts valid statement input', () => {
      const result = validateStatementInput('I feel frustrated when financial decisions are made without discussing them first')
      expect(result.isValid).toBe(true)
    })

    it('rejects short input', () => {
      const result = validateStatementInput('short')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least 15 characters')
    })

    it('rejects overly long input', () => {
      const longText = 'a'.repeat(801)
      const result = validateStatementInput(longText)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('under 800 characters')
    })
  })

  describe('validateMessageInput', () => {
    it('accepts valid message input', () => {
      const result = validateMessageInput('I understand your point about budgeting')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('I understand your point about budgeting')
    })

    it('rejects empty input', () => {
      const result = validateMessageInput('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('rejects overly long input', () => {
      const longText = 'a'.repeat(1001)
      const result = validateMessageInput(longText)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('under 1000 characters')
    })

    it('sanitizes input', () => {
      const result = validateMessageInput('<script>alert("xss")</script>')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })
  })
})

describe('Advanced Session Management', () => {
  describe('createAtomicUpdate', () => {
    it('applies valid updates', () => {
      const currentData: SessionData = {
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

      const updates = { agreedIssue: 'We disagree about household chores' }
      const result = createAtomicUpdate(currentData, updates)
      
      expect(result.success).toBe(true)
      expect(result.newData?.agreedIssue).toBe('We disagree about household chores')
    })

    it('rejects updates that would corrupt session', () => {
      const currentData: SessionData = {
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

      const badUpdates = { phase: 'invalid-phase' as any }
      const result = createAtomicUpdate(currentData, badUpdates)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Update would corrupt session')
    })

    it('sanitizes string updates', () => {
      const currentData: SessionData = {
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

      const updates = { agreedIssue: '<script>alert("xss")</script>' }
      const result = createAtomicUpdate(currentData, updates)
      
      expect(result.success).toBe(true)
      expect(result.newData?.agreedIssue).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })
  })

  describe('attemptSessionRecovery', () => {
    it('recovers valid data from corrupted session', () => {
      const corruptedData = {
        agreedIssue: 'Valid agreed issue content',
        playerOneSteelMan: 'Valid steel man content from player one',
        phase: 'invalid-phase',
        invalidField: 'should be ignored'
      }

      const result = attemptSessionRecovery(corruptedData)
      
      expect(result.recovered).toBe(true)
      expect(result.sessionData?.agreedIssue).toBe('Valid agreed issue content')
      expect(result.sessionData?.playerOneSteelMan).toBe('Valid steel man content from player one')
      expect(result.sessionData?.phase).toBe('steel-manning')
      expect(result.warnings).toBeDefined()
    })

    it('fails to recover from completely invalid data', () => {
      const result1 = attemptSessionRecovery(null)
      expect(result1.recovered).toBe(false)

      const result2 = attemptSessionRecovery('invalid')
      expect(result2.recovered).toBe(false)
    })

    it('resets to appropriate phase based on recovered data', () => {
      const partialData = { agreedIssue: 'Some issue' }
      const result = attemptSessionRecovery(partialData)
      
      expect(result.recovered).toBe(true)
      expect(result.sessionData?.phase).toBe('steel-manning')

      const noData = { someOtherField: 'value' }
      const result2 = attemptSessionRecovery(noData)
      
      expect(result2.recovered).toBe(true)
      expect(result2.sessionData?.phase).toBe('issue-agreement')
    })

    it('sanitizes recovered content', () => {
      const corruptedData = {
        agreedIssue: '<script>alert("xss")</script>',
        playerOneSteelMan: 'Valid content but with <img> tag'
      }

      const result = attemptSessionRecovery(corruptedData)
      
      expect(result.recovered).toBe(true)
      expect(result.sessionData?.agreedIssue).not.toContain('<script>')
      expect(result.sessionData?.playerOneSteelMan).not.toContain('<img>')
    })
  })
})