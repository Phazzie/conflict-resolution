import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { validateSessionData, sanitizeInput, sanitizeObject } from '../utils/validation'
import { SessionData } from '../types/session'

describe('Validation Utils - Error Handling', () => {
  const createValidSessionData = (overrides: Partial<SessionData> = {}): SessionData => ({
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
    sessionStarted: Date.now(),
    ...overrides
  })

  describe('validateSessionData', () => {
    it('validates correct session data', () => {
      const sessionData = createValidSessionData()
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('provides user-friendly error messages for missing data', () => {
      const result = validateSessionData(null)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('session data got scrambled')
      expect(result.error).toContain('browser storage got corrupted')
    })

    it('provides user-friendly error messages for invalid phase', () => {
      const sessionData = createValidSessionData({ phase: 'invalid-phase' as any })
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('session phase is corrupted')
    })

    it('provides user-friendly error messages for invalid conflict context', () => {
      const sessionData = createValidSessionData({ conflictContext: 'invalid-context' as any })
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('conflict context setting is invalid')
    })

    it('warns about old sessions without failing validation', () => {
      const oldSessionData = createValidSessionData({ 
        sessionStarted: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      })
      const result = validateSessionData(oldSessionData)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Session is older than 24 hours')
    })

    it('warns about suspicious message patterns', () => {
      const sessionData = createValidSessionData({
        messages: Array.from({ length: 25 }, (_, i) => ({
          id: `msg-${i}`,
          author: 'player1' as const,
          content: 'test message',
          timestamp: Date.now()
        }))
      })
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Session has unusually high message count (25)')
    })

    it('detects malformed message structures', () => {
      const sessionData = createValidSessionData({
        messages: [
          { id: 'valid', author: 'player1', content: 'test', timestamp: Date.now() },
          { id: '', author: 'player1', content: '', timestamp: 0 } as any // Invalid message
        ]
      })
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('message data is corrupted')
    })

    it('handles missing required fields gracefully', () => {
      const incompleteData = {
        phase: 'welcome',
        // Missing other required fields
      }
      const result = validateSessionData(incompleteData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('session structure is incomplete')
    })

    it('validates array fields properly', () => {
      const sessionData = createValidSessionData({
        messages: 'not-an-array' as any
      })
      const result = validateSessionData(sessionData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('message history is corrupted')
    })
  })

  describe('sanitizeInput', () => {
    it('removes XSS attack vectors', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello <img src="x" onerror="alert(1)">'
      const sanitized = sanitizeInput(maliciousInput)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).toContain('Hello')
    })

    it('handles HTML entities correctly', () => {
      const input = 'Quote: "Hello" & \'world\''
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).toContain('&quot;')
      expect(sanitized).toContain('&#x27;')
      expect(sanitized).toContain('&amp;')
    })

    it('preserves existing HTML entities', () => {
      const input = 'Already encoded: &lt;script&gt; &amp; more'
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).toContain('&lt;script&gt;')
      expect(sanitized).toContain('&amp;')
    })

    it('handles non-string input gracefully', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
      expect(sanitizeInput(123 as any)).toBe('')
    })

    it('trims whitespace', () => {
      const input = '  spaced content  '
      const sanitized = sanitizeInput(input)
      
      expect(sanitized).toBe('spaced content')
    })
  })

  describe('sanitizeObject', () => {
    it('sanitizes string values in objects', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>John',
        message: 'Hello "world"',
        number: 42,
        nested: {
          value: 'safe'
        }
      }
      
      const sanitized = sanitizeObject(maliciousObject)
      
      expect(sanitized.name).not.toContain('<script>')
      expect(sanitized.name).toContain('John')
      expect(sanitized.message).toContain('&quot;')
      expect(sanitized.number).toBe(42)
      expect(sanitized.nested.value).toBe('safe')
    })

    it('sanitizes arrays of strings', () => {
      const objectWithArray = {
        tags: ['<script>bad</script>', 'good tag', '"quoted"'],
        count: 3
      }
      
      const sanitized = sanitizeObject(objectWithArray)
      
      expect(sanitized.tags[0]).not.toContain('<script>')
      expect(sanitized.tags[1]).toBe('good tag')
      expect(sanitized.tags[2]).toContain('&quot;')
    })

    it('preserves non-string values', () => {
      const mixedObject = {
        string: 'hello',
        number: 42,
        boolean: true,
        date: new Date(),
        null: null,
        undefined: undefined
      }
      
      const sanitized = sanitizeObject(mixedObject)
      
      expect(sanitized.number).toBe(42)
      expect(sanitized.boolean).toBe(true)
      expect(sanitized.date).toBeInstanceOf(Date)
      expect(sanitized.null).toBeNull()
      expect(sanitized.undefined).toBeUndefined()
    })

    it('does not modify the original object', () => {
      const original = {
        message: '<script>alert(1)</script>hello'
      }
      
      const sanitized = sanitizeObject(original)
      
      expect(original.message).toContain('<script>')
      expect(sanitized.message).not.toContain('<script>')
    })
  })

  describe('Edge Cases', () => {
    it('handles deeply nested corruption gracefully', () => {
      const corruptedData = {
        phase: 'discussion',
        messages: [
          {
            id: null,
            author: undefined,
            content: '<script>alert(1)</script>',
            timestamp: 'invalid'
          }
        ]
      }
      
      const result = validateSessionData(corruptedData)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).not.toContain('<script>')
    })

    it('validates session data with all phases', () => {
      const phases = ['welcome', 'ai-preferences', 'context-selection', 'issue-agreement', 'steel-manning', 'statement-locking', 'discussion', 'resolution', 'summary']
      
      phases.forEach(phase => {
        const sessionData = createValidSessionData({ phase: phase as any })
        const result = validateSessionData(sessionData)
        
        expect(result.isValid).toBe(true)
      })
    })

    it('handles very large session data', () => {
      const largeSession = createValidSessionData({
        agreedIssue: 'x'.repeat(10000),
        messages: Array.from({ length: 1000 }, (_, i) => ({
          id: `msg-${i}`,
          author: 'player1' as const,
          content: 'test message',
          timestamp: Date.now()
        }))
      })
      
      const result = validateSessionData(largeSession)
      
      // Should warn about size but still be valid
      expect(result.isValid).toBe(true)
      expect(result.warnings).toBeDefined()
    })
  })
})