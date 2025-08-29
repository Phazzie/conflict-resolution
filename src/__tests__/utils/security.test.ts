import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  sanitizeHtml,
  sanitizeText,
  sanitizeUserMessage,
  sanitizeAIResponse,
  sanitizeSessionData,
  rateLimiter,
  validateInput
} from '@/utils/security'

// Mock DOMPurify for testing
vi.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: vi.fn((content: string) => {
      // Mock basic XSS removal
      return content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    })
  }
}))

describe('Security Utilities', () => {
  describe('sanitizeText', () => {
    it('should escape HTML entities', () => {
      const malicious = '<script>alert("xss")</script>'
      const result = sanitizeText(malicious)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should handle null/undefined input', () => {
      expect(sanitizeText('')).toBe('')
      expect(sanitizeText(null as any)).toBe('')
      expect(sanitizeText(undefined as any)).toBe('')
    })

    it('should escape common XSS vectors', () => {
      const vectors = [
        { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
        { input: 'javascript:alert(1)', expected: 'javascript:alert(1)' },
        { input: '"onclick="alert(1)"', expected: '&quot;onclick=&quot;alert(1)&quot;' }
      ]
      
      vectors.forEach(({ input, expected }) => {
        expect(sanitizeText(input)).toBe(expected)
      })
    })
  })

  describe('sanitizeUserMessage', () => {
    it('should apply length limits', () => {
      const longMessage = 'a'.repeat(6000)
      const result = sanitizeUserMessage(longMessage)
      expect(result.length).toBeLessThanOrEqual(5000)
    })

    it('should remove dangerous patterns', () => {
      const dangerous = '<script>alert("xss")</script>Some message'
      const result = sanitizeUserMessage(dangerous)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('javascript:')
    })

    it('should trim whitespace', () => {
      const message = '  hello world  '
      const result = sanitizeUserMessage(message)
      expect(result).toBe('hello world')
    })
  })

  describe('sanitizeSessionData', () => {
    const validSessionData = {
      phase: 'discussion',
      agreedIssue: 'Test issue',
      playerOneSteelMan: 'Player 1 steelman',
      playerTwoSteelMan: 'Player 2 steelman',
      playerOneStatement: 'Player 1 statement',
      playerTwoStatement: 'Player 2 statement',
      messages: [
        {
          id: '1',
          playerId: 'player1',
          content: 'Test message',
          timestamp: Date.now(),
          isAI: false
        }
      ],
      proposedResolution: 'Test resolution',
      finalResolution: '',
      sessionStarted: Date.now()
    }

    it('should sanitize all string fields', () => {
      const maliciousData = {
        ...validSessionData,
        agreedIssue: '<script>alert("xss")</script>Real issue',
        playerOneStatement: 'Statement with <img src=x onerror=alert(1)>'
      }

      const result = sanitizeSessionData(maliciousData)
      expect(result.agreedIssue).not.toContain('<script>')
      expect(result.playerOneStatement).not.toContain('onerror')
    })

    it('should sanitize messages array', () => {
      const maliciousData = {
        ...validSessionData,
        messages: [
          {
            id: '1',
            playerId: 'player1',
            content: '<script>alert("hack")</script>',
            timestamp: Date.now(),
            isAI: false
          },
          {
            id: '2',
            playerId: 'ai',
            content: 'AI response with <b>formatting</b>',
            timestamp: Date.now(),
            isAI: true
          }
        ]
      }

      const result = sanitizeSessionData(maliciousData)
      expect(result.messages[0].content).not.toContain('<script>')
      expect(result.messages[1].content).toContain('<b>formatting</b>') // AI responses allow some HTML
    })

    it('should throw error for invalid structure', () => {
      const invalidData = {
        phase: 'invalid',
        messages: 'not an array' // Invalid type
      }

      expect(() => sanitizeSessionData(invalidData)).toThrow('Invalid session data structure')
    })
  })

  describe('rateLimiter', () => {
    beforeEach(() => {
      // Reset rate limiter before each test
      rateLimiter.reset('test-key')
    })

    it('should allow requests within limit', () => {
      const key = 'test-key'
      
      // Should allow first few requests
      expect(rateLimiter.isAllowed(key, 3, 60000)).toBe(true)
      expect(rateLimiter.isAllowed(key, 3, 60000)).toBe(true)
      expect(rateLimiter.isAllowed(key, 3, 60000)).toBe(true)
    })

    it('should block requests over limit', () => {
      const key = 'test-key'
      
      // Fill up the limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.isAllowed(key, 3, 60000)
      }
      
      // Next request should be blocked
      expect(rateLimiter.isAllowed(key, 3, 60000)).toBe(false)
    })

    it('should reset after window expires', async () => {
      const key = 'test-key'
      const windowMs = 100 // Short window for testing
      
      // Fill up the limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.isAllowed(key, 3, windowMs)
      }
      
      // Should be blocked
      expect(rateLimiter.isAllowed(key, 3, windowMs)).toBe(false)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 10))
      
      // Should be allowed again
      expect(rateLimiter.isAllowed(key, 3, windowMs)).toBe(true)
    })
  })

  describe('validateInput', () => {
    it('should accept valid input', () => {
      const result = validateInput('Valid message', 100, 'test field')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('Valid message')
      expect(result.error).toBeUndefined()
    })

    it('should reject empty input', () => {
      const result = validateInput('', 100, 'test field')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('test field cannot be empty')
    })

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(200)
      const result = validateInput(longInput, 100, 'test field')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('test field cannot exceed 100 characters')
      expect(result.sanitized.length).toBe(100)
    })

    it('should detect suspicious patterns', () => {
      const suspiciousInputs = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '<img onerror=alert(1)>'
      ]

      suspiciousInputs.forEach(input => {
        const result = validateInput(input, 1000, 'test field')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('potentially dangerous content')
      })
    })

    it('should sanitize output even for invalid input', () => {
      const malicious = '<script>alert("xss")</script>'
      const result = validateInput(malicious, 1000, 'test field')
      expect(result.sanitized).not.toContain('<script>')
    })
  })
})