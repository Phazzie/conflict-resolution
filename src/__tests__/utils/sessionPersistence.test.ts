import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSession, loadSession, clearSession } from '../sessionPersistence'
import type { SessionData } from '../../types/session'

// Mock the secureStorage
vi.mock('../secureStorage', () => ({
  secureStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
}))

// Mock validation
vi.mock('../validation', () => ({
  validateSessionData: vi.fn(() => ({ isValid: true })),
  sanitizeObject: vi.fn((data) => data)
}))

const mockSecureStorage = vi.mocked(await import('../secureStorage')).secureStorage

describe('sessionPersistence with secure storage', () => {
  let validSessionData: SessionData

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    validSessionData = {
      phase: 'discussion',
      conflictContext: 'relationship',
      agreedIssue: 'Test issue',
      playerOneSteelMan: 'Player 1 steel man',
      playerTwoSteelMan: 'Player 2 steel man', 
      playerOneStatement: 'Player 1 statement',
      playerTwoStatement: 'Player 2 statement',
      messages: [{
        id: 'test-msg',
        content: 'Test message',
        sender: 'player1',
        timestamp: Date.now()
      }],
      proposedResolution: '',
      finalResolution: '',
      sessionStarted: Date.now()
    }
  })

  it('saves session data securely', () => {
    const result = saveSession(validSessionData)
    
    expect(result.success).toBe(true)
    expect(mockSecureStorage.setItem).toHaveBeenCalledTimes(2) // Session + checksum
    
    const sessionCall = mockSecureStorage.setItem.mock.calls[0]
    const checksumCall = mockSecureStorage.setItem.mock.calls[1]
    
    expect(sessionCall[0]).toBe('mixitfixit-session')
    expect(checksumCall[0]).toBe('mixitfixit-session-checksum')
  })

  it('loads session data securely', () => {
    // Mock stored session data
    const mockStoredSession = {
      version: '1.0',
      timestamp: Date.now(),
      data: validSessionData,
      checksum: 'test-checksum'
    }
    
    mockSecureStorage.getItem
      .mockReturnValueOnce(mockStoredSession) // Session data
      .mockReturnValueOnce('test-checksum')   // Checksum

    const result = loadSession()
    
    expect(result.success).toBe(true)
    expect(result.sessionData).toEqual(validSessionData)
  })

  it('handles missing session data gracefully', () => {
    mockSecureStorage.getItem.mockReturnValue(null)
    
    const result = loadSession()
    
    expect(result.success).toBe(true)
    expect(result.sessionData).toBeUndefined()
  })

  it('verifies data integrity with checksums', () => {
    const { validateSessionData } = vi.mocked(await import('../validation'))
    validateSessionData.mockReturnValue({ isValid: false, error: 'Invalid data' })

    const result = saveSession(validSessionData)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot save invalid session')
  })

  it('handles checksum mismatches', () => {
    const mockStoredSession = {
      version: '1.0', 
      timestamp: Date.now(),
      data: validSessionData,
      checksum: 'correct-checksum'
    }
    
    mockSecureStorage.getItem
      .mockReturnValueOnce(mockStoredSession)
      .mockReturnValueOnce('wrong-checksum') // Mismatched checksum
    
    const result = loadSession()
    
    // Should attempt data recovery
    expect(result.success).toBe(true)
    expect(result.warnings).toBeDefined()
  })

  it('clears session data from secure storage', () => {
    clearSession()
    
    expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('mixitfixit-session')
    expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('mixitfixit-session-checksum')
  })

  it('attempts data recovery on corruption', () => {
    // Mock corrupted session data
    mockSecureStorage.getItem.mockReturnValueOnce({
      version: '1.0',
      timestamp: Date.now(),
      data: { ...validSessionData, agreedIssue: 'Recovered issue' },
      checksum: 'wrong-checksum'
    })

    const result = loadSession()
    
    expect(result.success).toBe(true)
    expect(result.wasCorrupted).toBe(true)
    expect(result.warnings).toContain('Session checksum mismatch - data may be corrupted')
  })

  it('validates session integrity after save', () => {
    // Mock the verification load to fail
    mockSecureStorage.getItem
      .mockReturnValueOnce(null) // First call during save verification fails
      .mockReturnValue(null)     // Subsequent calls
    
    const result = saveSession(validSessionData)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Session save verification failed')
    // Should have attempted rollback
    expect(mockSecureStorage.removeItem).toHaveBeenCalled()
  })

  it('handles encryption failures gracefully', () => {
    mockSecureStorage.setItem.mockImplementation(() => {
      throw new Error('Encryption failed')
    })
    
    const result = saveSession(validSessionData)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Session save failed')
  })

  it('provides detailed error information', () => {
    const { validateSessionData } = vi.mocked(await import('../validation'))
    validateSessionData.mockReturnValue({ 
      isValid: false, 
      error: 'Missing required field: phase' 
    })
    
    const result = saveSession(validSessionData)
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot save invalid session: Missing required field: phase')
  })
})