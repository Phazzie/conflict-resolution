import React from 'react'
import { Toaster } from '@/components/ui/sonner'
import { useSessionManagement } from '@/hooks/useSessionManagement'
import { useSessionValidation } from '@/hooks/useSessionValidation'
import { usePlayerManagement, useSessionOperations, useMultiplayerSession } from '@/hooks/useSessionOperations'
import ErrorBoundary from '@/components/ErrorBoundary'
import AppLayout from '@/components/AppLayout'
import LoadingScreen from '@/components/LoadingScreen'
import ValidationErrorScreen from '@/components/ValidationErrorScreen'
import WelcomeScreen from '@/components/WelcomeScreen'
import SessionScreen from '@/components/SessionScreen'

/**
 * Main application component - now simplified using custom hooks
 * Focuses on orchestration rather than implementation details
 */
function App() {
  // Extract all session management logic to custom hooks
  const {
    sessionData,
    updateSessionData,
    isLoading,
    setIsLoading,
    validationError,
    setValidationError,
    resetSession,
    startSession
  } = useSessionManagement()

  // Handle session validation
  useSessionValidation(sessionData, setValidationError, setIsLoading)

  // Player and session operations
  const { currentPlayer } = usePlayerManagement()
  const sessionOperations = useSessionOperations(sessionData, updateSessionData)
  const multiplayerOperations = useMultiplayerSession(currentPlayer, updateSessionData)

  // Check for session recovery
  const hasActiveSession = sessionData && sessionData.phase !== 'welcome' && 
    (sessionData.agreedIssue || sessionData.messages.length > 0)

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen />
      </ErrorBoundary>
    )
  }

  // Show validation error with recovery options
  if (validationError) {
    return (
      <ErrorBoundary>
        <ValidationErrorScreen 
          error={validationError}
          onReset={resetSession}
        />
      </ErrorBoundary>
    )
  }

  // Welcome screen
  if (!sessionData || sessionData.phase === 'welcome') {
    return (
      <ErrorBoundary>
        <WelcomeScreen
          currentPlayer={currentPlayer}
          onStartSession={startSession}
          updateSessionData={updateSessionData}
        />
      </ErrorBoundary>
    )
  }

  // Active session screen
  return (
    <ErrorBoundary>
      <AppLayout
        sessionData={sessionData}
        currentPlayer={currentPlayer}
        hasActiveSession={hasActiveSession}
        onReset={resetSession}
        operations={{
          ...sessionOperations,
          ...multiplayerOperations
        }}
      >
        <SessionScreen
          sessionData={sessionData}
          currentPlayer={currentPlayer}
          updateSessionData={updateSessionData}
          onReset={resetSession}
          operations={{
            ...sessionOperations,
            ...multiplayerOperations
          }}
        />
      </AppLayout>
      <Toaster />
    </ErrorBoundary>
  )
}

export default App