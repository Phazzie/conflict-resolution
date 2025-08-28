import { describe, it, expect, beforeEach } from 'vitest'
import { validateSessionData } from '../validation'
import { SessionData } from '../../types/session'

describe('validateSessionData', () => {
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

  it('validates correct session data', () => {
    const result = validateSessionData(validSessionData)
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects null or undefined data', () => {
    const result = validateSessionData(null)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Session data is null or undefined')
  })

  it('rejects invalid phase', () => {
    const invalidData = { ...validSessionData, phase: 'invalid-phase' as any }
    const result = validateSessionData(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid phase')
  })

  it('rejects missing required fields', () => {
    const invalidData = { ...validSessionData }
    delete (invalidData as any).conflictContext
    const result = validateSessionData(invalidData)
    expect(result.isValid).toBe(false)
  })

  it('validates complex session with messages', () => {
    const complexSession = {
      ...validSessionData,
      phase: 'discussion' as const,
      messages: [{
        id: 'test-1',
        content: 'Test message',
        sender: 'player1' as const,
        timestamp: Date.now(),
        aiAnalysis: {
          toxicityScore: 0.1,
          manipulationTactics: [],
          suggestions: []
        }
      }]
    }
    const result = validateSessionData(complexSession)
    expect(result.isValid).toBe(true)
  })
})