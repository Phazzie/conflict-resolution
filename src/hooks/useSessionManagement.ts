import { useState, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { SessionData, PlayerRole } from '@/types/session'
import { validateSessionData } from '@/utils/validation'
import { clearSession } from '@/utils/sessionPersistence'

/**
 * Custom hook to manage session state and operations
 * Extracted from App.tsx to reduce complexity and improve testability
 */
export function useSessionManagement() {
  const [sessionData, setSessionData] = useKV<SessionData>('mixitfixit-session', {
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
  })

  const [isLoading, setIsLoading] = useState(true)
  const [validationError, setValidationError] = useState<string>('')
  
  // Ensure sessionData is always defined
  const safeSessionData = sessionData || {
    phase: 'welcome' as const,
    conflictContext: 'relationship' as const,
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

  const updateSessionData = useCallback((updates: Partial<SessionData>) => {
    const newSessionData = { ...safeSessionData, ...updates } as SessionData
    setSessionData(newSessionData)
  }, [safeSessionData, setSessionData])

  const resetSession = useCallback(() => {
    localStorage.removeItem('mixitfixit-player-role')
    setValidationError('')
    clearSession()
    setSessionData({
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
    })
  }, [setValidationError, setSessionData])

  const startSession = useCallback(() => {
    updateSessionData({ 
      phase: 'context-selection',
      sessionStarted: Date.now() 
    })
  }, [updateSessionData])

  return {
    sessionData: safeSessionData,
    setSessionData,
    updateSessionData,
    isLoading,
    setIsLoading,
    validationError,
    setValidationError,
    resetSession,
    startSession
  }
}