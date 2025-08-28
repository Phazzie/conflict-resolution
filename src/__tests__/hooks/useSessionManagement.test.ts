import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionManagement } from '../useSessionManagement'

// Mock the useKV hook
vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn(() => [
    {
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
    },
    vi.fn(),
    vi.fn()
  ])
}))

vi.mock('../../utils/validation', () => ({
  validateSessionData: vi.fn(() => ({ isValid: true }))
}))

vi.mock('../../utils/sessionPersistence', () => ({
  clearSession: vi.fn()
}))

describe('useSessionManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes with default session data', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    expect(result.current.sessionData.phase).toBe('welcome')
    expect(result.current.sessionData.conflictContext).toBe('relationship')
    expect(result.current.isLoading).toBe(true)
  })

  it('provides updateSessionData function', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    expect(typeof result.current.updateSessionData).toBe('function')
  })

  it('provides resetSession function', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    expect(typeof result.current.resetSession).toBe('function')
  })

  it('provides startSession function', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    act(() => {
      result.current.startSession()
    })
    
    // The function should be callable without errors
    expect(typeof result.current.startSession).toBe('function')
  })

  it('handles validation errors', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    act(() => {
      result.current.setValidationError('Test error')
    })
    
    expect(result.current.validationError).toBe('Test error')
  })

  it('manages loading state', () => {
    const { result } = renderHook(() => useSessionManagement())
    
    act(() => {
      result.current.setIsLoading(false)
    })
    
    expect(result.current.isLoading).toBe(false)
  })
})