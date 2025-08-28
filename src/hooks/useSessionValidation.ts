import { useEffect } from 'react'
import { SessionData } from '@/types/session'
import { validateSessionData } from '@/utils/validation'

/**
 * Custom hook for session validation logic
 * Handles validation on session changes and loading states
 */
export function useSessionValidation(
  sessionData: SessionData | null,
  setValidationError: (error: string) => void,
  setIsLoading: (loading: boolean) => void
) {
  // Initialize loading state and validate session
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessionData) {
        const validation = validateSessionData(sessionData)
        if (!validation.isValid) {
          setValidationError(validation.error || 'Session validation failed')
          console.warn('Session validation failed:', validation.error)
        } else {
          // Clear any previous validation errors
          setValidationError('')
        }
      }
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [sessionData, setValidationError, setIsLoading])

  return {
    // Could add validation utilities here if needed
  }
}