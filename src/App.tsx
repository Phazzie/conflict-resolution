import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { CircleNotch, Lock } from '@phosphor-icons/react'
import { useUnifiedSession, migrateLegacySessionData } from './hooks/useUnifiedSession'
import { analyticsService } from './services/analytics'
import { sessionHistoryService } from './services/sessionHistory'
import { machineLearningService } from './services/mlServiceOptimized'
import { useSkipLinks, useScreenReaderAnnouncements } from './hooks/useAccessibility'
import { safeAsync, safeEventHandler, requireData } from './utils/errorPrevention'
import { performanceMonitor } from './utils/performanceMonitor'
import { appConfig } from './config/env'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomeScreen from './components/WelcomeScreen'
import SessionHeader from './components/SessionHeader'
import PhaseRenderer from './components/PhaseRenderer'

function App() {
  const {
    sessionData,
    playerRole,
    hasActiveSession,
    updateSession,
    resetSession,
    enableMultiplayer,
    joinSession,
    validateAndRecoverSession
  } = useUnifiedSession()

  const [isLoading, setIsLoading] = useState(true)
  const [validationError, setValidationError] = useState<string>('')
  const [sessionWarnings, setSessionWarnings] = useState<string[]>([])
  
  // Accessibility hooks
  const { announce, announcementRef, announcementProps } = useScreenReaderAnnouncements()
  useSkipLinks()
  
  // Initialize session with validation and recovery
  useEffect(() => {
    const initializeSession = safeEventHandler(async () => {
      const endSessionInit = performanceMonitor.startTiming('session-init')
      
      try {
        setIsLoading(true)
        performanceMonitor.mark('session-init-start')
        
        // Clean up any legacy localStorage data
        const migrationResult = await safeAsync(
          () => Promise.resolve(migrateLegacySessionData()),
          undefined,
          'session migration'
        )
        
        if (!migrationResult.success && appConfig.VITE_DEV_SHOW_WARNINGS) {
          console.warn('Session migration had issues:', migrationResult.error)
        }

        performanceMonitor.mark('migration-complete')

        // Validate current session
        const validation = validateAndRecoverSession()
        
        if (!validation.isValid) {
          setValidationError(validation.error || 'Session validation failed')
          announce('Session validation failed. Please reset to continue.', 'assertive')
        } else if (validation.warnings) {
          setSessionWarnings(validation.warnings)
          announce(`Session recovered with ${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}`, 'polite')
        }
        
        performanceMonitor.mark('session-init-complete')
        performanceMonitor.measure('session-init-duration', 'session-init-start', 'session-init-complete')
        
      } catch (error) {
        const errorMsg = 'Failed to initialize session. This might be a browser storage issue.'
        setValidationError(errorMsg)
        announce(errorMsg, 'assertive')
      } finally {
        endSessionInit()
        setIsLoading(false)
        
        // Log performance metrics in development
        if (appConfig.VITE_APP_ENVIRONMENT === 'development') {
          setTimeout(() => {
            const metrics = performanceMonitor.getMetrics()
            const validation = performanceMonitor.validateDeploymentReadiness()
            
            if (!validation.isReady || validation.warnings.length > 0) {
              console.group('🚀 Deployment Readiness Check')
              console.log(`Status: ${validation.isReady ? '✅ Ready' : '❌ Issues Found'}`)
              if (validation.issues.length > 0) {
                console.warn('Issues:', validation.issues)
              }
              if (validation.warnings.length > 0) {
                console.warn('Warnings:', validation.warnings)
              }
              console.groupEnd()
            }
          }, 2000) // Wait for initial metrics to stabilize
        }
      }
    }, 'session initialization')
    
    const timer = setTimeout(initializeSession, 100)
    return () => clearTimeout(timer)
  }, [validateAndRecoverSession, announce])

  // Ensure sessionData is always defined - should never be null with useUnifiedSession
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

  const startSession = useCallback(safeEventHandler(() => {
    try {
      const safeSessionData = requireData(sessionData, 'sessionData')
      updateSession({ 
        phase: 'ai-preferences',
        sessionStarted: Date.now() 
      })
    } catch (error) {
      setValidationError('Cannot start session: invalid session state')
    }
  }, 'start session'), [updateSession, sessionData])

  const handleResetSession = useCallback(safeEventHandler(async () => {
    try {
      setIsLoading(true)
      setValidationError('')
      setSessionWarnings([])
      
      const resetResult = await safeAsync(
        () => Promise.resolve(resetSession()),
        undefined,
        'session reset'
      )
      
      if (!resetResult.success) {
        throw new Error(resetResult.error || 'Reset failed')
      }
    } catch (error) {
      console.error('Failed to reset session:', error)
      setValidationError('Failed to reset session. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }, 'reset session'), [resetSession])

  const handleEnableMultiplayer = useCallback(() => {
    enableMultiplayer()
  }, [enableMultiplayer])

  const handleJoinSession = useCallback(async (sessionIdToJoin: string): Promise<boolean> => {
    return joinSession(sessionIdToJoin)
  }, [joinSession])

  const viewAnalytics = useCallback(async () => {
    if (sessionData && sessionData.messages.length > 0) {
      try {
        await analyticsService.generateSessionAnalytics(sessionData)
      } catch (error) {
        // Silently fail - analytics are not critical
      }
    }
    updateSession({ phase: 'analytics' })
  }, [sessionData, updateSession])

  const viewHistory = useCallback(() => {
    updateSession({ phase: 'history' })
  }, [updateSession])

  const viewCouplesDashboard = useCallback(() => {
    updateSession({ phase: 'couples-dashboard' })
  }, [updateSession])

  const viewPatternRecognition = useCallback(() => {
    updateSession({ phase: 'pattern-recognition' })
  }, [updateSession])

  const viewMLInsights = useCallback(() => {
    updateSession({ phase: 'ml-insights' })
  }, [updateSession])

  const exportAnalytics = useCallback((data: string) => {
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mixitfixit-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Check for session recovery
  // const hasActiveSession = sessionData && sessionData.phase !== 'welcome' && 
  //   (sessionData.agreedIssue || sessionData.messages.length > 0)

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <CircleNotch size={32} className="animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium mb-1">
                  Loading MixitFixit
                </p>
                <p className="text-sm text-muted-foreground">
                  Preparing your conflict resolution session...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  // Show validation error with recovery options
  if (validationError) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-destructive">
                <Lock size={24} />
                <h2 className="text-lg font-semibold">Session Issues Detected</h2>
              </div>
              
              <p className="text-muted-foreground">
                Something went wrong with your session. Don't worry - this happens sometimes with browser storage.
              </p>
              
              <div className="p-3 bg-muted rounded text-sm">
                <strong>What happened:</strong> {validationError}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button onClick={handleResetSession} variant="default" disabled={isLoading}>
                  {isLoading ? 'Starting Fresh...' : 'Start Fresh Session'}
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  disabled={isLoading}
                >
                  Refresh Page
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Starting fresh will clear any saved progress but get you back to working.
              </p>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  // Welcome screen
  if (!sessionData || safeSessionData.phase === 'welcome') {
    return (
      <WelcomeScreen 
        currentPlayer={playerRole || 'player1'}
        onStartSession={startSession}
        onViewPatterns={() => updateSession({ phase: 'pattern-recognition' })}
        onViewCouples={() => updateSession({ phase: 'couples-dashboard' })}
        onViewMLInsights={() => updateSession({ phase: 'ml-insights' })}
      />
    )
  }

  // Active session screen
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div ref={announcementRef} {...announcementProps} />
        <SessionHeader 
          sessionData={safeSessionData}
          currentPlayer={playerRole || 'player1'}
          hasActiveSession={hasActiveSession || false}
          sessionWarnings={sessionWarnings}
          onViewAnalytics={viewAnalytics}
          onViewPatterns={viewPatternRecognition}
          onViewCouples={viewCouplesDashboard}
          onViewMLInsights={viewMLInsights}
          onViewHistory={viewHistory}
          onReset={handleResetSession}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8" role="main">
          <PhaseRenderer 
            sessionData={safeSessionData}
            currentPlayer={playerRole || 'player1'}
            updateSessionData={updateSession}
            onReset={handleResetSession}
            onExportAnalytics={exportAnalytics}
            enableMultiplayer={handleEnableMultiplayer}
            joinSession={handleJoinSession}
          />
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}

export default App