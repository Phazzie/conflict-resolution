import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { CircleNotch, Lock } from '@phosphor-icons/react'
import { SessionData, PlayerRole } from './types/session'
import { validateSessionData } from './utils/validation'
import { clearSession } from './utils/sessionPersistence'
import { analyticsService } from './services/analytics'
import { sessionHistoryService } from './services/sessionHistory'
import { machineLearningService } from './services/mlServiceOptimized'
import { useSkipLinks, useScreenReaderAnnouncements } from './hooks/useAccessibility'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomeScreen from './components/WelcomeScreen'
import SessionHeader from './components/SessionHeader'
import PhaseRenderer from './components/PhaseRenderer'

function App() {
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
  const [sessionWarnings, setSessionWarnings] = useState<string[]>([])
  
  // Accessibility hooks
  const { announce, AnnouncementDiv } = useScreenReaderAnnouncements()
  useSkipLinks()
  
  // Initialize session with validation and recovery
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (sessionData) {
          const validation = validateSessionData(sessionData)
          if (!validation.isValid) {
            setValidationError(validation.error || 'Session validation failed')
            announce('Session validation failed. Please reset to continue.', 'assertive')
          } else if (validation.warnings) {
            setSessionWarnings(validation.warnings)
            announce(`Session recovered with ${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}`, 'polite')
          }
        }
      } catch (error) {
        const errorMsg = 'Failed to initialize session. This might be a browser storage issue.'
        setValidationError(errorMsg)
        announce(errorMsg, 'assertive')
      } finally {
        setIsLoading(false)
      }
    }
    
    const timer = setTimeout(initializeSession, 100)
    return () => clearTimeout(timer)
  }, [sessionData, announce])

  const [currentPlayer] = useState<PlayerRole>(() => {
    // Try to recover existing player role, or assign new one
    const savedPlayer = localStorage.getItem('mixitfixit-player-role')
    if (savedPlayer && (savedPlayer === 'player1' || savedPlayer === 'player2')) {
      return savedPlayer as PlayerRole
    }
    const newPlayer = Math.random() > 0.5 ? 'player1' : 'player2'
    localStorage.setItem('mixitfixit-player-role', newPlayer)
    return newPlayer
  })

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
    setSessionData(current => {
      const currentData = current || {
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
      return { ...currentData, ...updates } as SessionData
    })
  }, [setSessionData])

  const startSession = useCallback(() => {
    updateSessionData({ 
      phase: 'ai-preferences',
      sessionStarted: Date.now() 
    })
  }, [updateSessionData])

  const resetSession = useCallback(async () => {
    try {
      setIsLoading(true)
      localStorage.removeItem('mixitfixit-player-role')
      setValidationError('')
      setSessionWarnings([])
      
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
    } catch (error) {
      console.error('Failed to reset session:', error)
      setValidationError('Failed to reset session. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }, [setSessionData])

  const enableMultiplayer = () => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    updateSessionData({
      isMultiplayer: true,
      sessionId,
      participants: [{
        playerId: currentPlayer,
        isOnline: true,
        lastSeen: Date.now(),
        isTyping: false
      }]
    })
  }

  const joinSession = async (sessionId: string): Promise<boolean> => {
    try {
      if (!sessionId || !sessionId.match(/^session-\d+-[a-z0-9]{6}$/)) {
        return false
      }

      const sessionKey = `mixitfixit-shared-${sessionId}`
      const existingSessionData = localStorage.getItem(sessionKey)
      
      if (existingSessionData) {
        try {
          const sharedSession = JSON.parse(existingSessionData)
          updateSessionData({
            ...sharedSession,
            isMultiplayer: true,
            sessionId,
            participants: [
              { playerId: 'player1', isOnline: true, lastSeen: Date.now(), isTyping: false },
              { playerId: 'player2', isOnline: true, lastSeen: Date.now(), isTyping: false }
            ]
          })
          return true
        } catch (parseError) {
          // Silently fail and create new session
        }
      }

      const newSharedSession = {
        ...safeSessionData,
        isMultiplayer: true,
        sessionId,
        participants: [
          { playerId: currentPlayer, isOnline: true, lastSeen: Date.now(), isTyping: false }
        ]
      }
      
      localStorage.setItem(sessionKey, JSON.stringify(newSharedSession))
      updateSessionData(newSharedSession)
      
      return true
    } catch (error) {
      return false
    }
  }

  const viewAnalytics = useCallback(async () => {
    if (sessionData && sessionData.messages.length > 0) {
      try {
        await analyticsService.generateSessionAnalytics(sessionData)
      } catch (error) {
        // Silently fail - analytics are not critical
      }
    }
    updateSessionData({ phase: 'analytics' })
  }, [sessionData, updateSessionData])

  const viewHistory = useCallback(() => {
    updateSessionData({ phase: 'history' })
  }, [updateSessionData])

  const viewCouplesDashboard = useCallback(() => {
    updateSessionData({ phase: 'couples-dashboard' })
  }, [updateSessionData])

  const viewPatternRecognition = useCallback(() => {
    updateSessionData({ phase: 'pattern-recognition' })
  }, [updateSessionData])

  const viewMLInsights = useCallback(() => {
    updateSessionData({ phase: 'ml-insights' })
  }, [updateSessionData])

  const saveCurrentSession = useCallback(async (outcome: 'resolved' | 'stalemate' | 'abandoned') => {
    if (sessionData && (sessionData.agreedIssue || sessionData.messages.length > 0)) {
      try {
        await sessionHistoryService.saveSession(sessionData, outcome)
        await machineLearningService.learnFromSessionOutcome(sessionData, outcome)
      } catch (error) {
        // Silently fail - these are enhancement features
      }
    }
  }, [sessionData])

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
  const hasActiveSession = sessionData && sessionData.phase !== 'welcome' && 
    (sessionData.agreedIssue || sessionData.messages.length > 0)

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
                <Button onClick={resetSession} variant="default" disabled={isLoading}>
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
        currentPlayer={currentPlayer}
        onStartSession={startSession}
        onViewPatterns={() => updateSessionData({ phase: 'pattern-recognition' })}
        onViewCouples={() => updateSessionData({ phase: 'couples-dashboard' })}
        onViewMLInsights={() => updateSessionData({ phase: 'ml-insights' })}
      />
    )
  }

  // Active session screen
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <AnnouncementDiv />
        <SessionHeader 
          sessionData={safeSessionData}
          currentPlayer={currentPlayer}
          hasActiveSession={hasActiveSession}
          sessionWarnings={sessionWarnings}
          onViewAnalytics={viewAnalytics}
          onViewPatterns={viewPatternRecognition}
          onViewCouples={viewCouplesDashboard}
          onViewMLInsights={viewMLInsights}
          onViewHistory={viewHistory}
          onReset={resetSession}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8" role="main">
          <PhaseRenderer 
            sessionData={safeSessionData}
            currentPlayer={currentPlayer}
            updateSessionData={updateSessionData}
            onReset={resetSession}
            onExportAnalytics={exportAnalytics}
            enableMultiplayer={enableMultiplayer}
            joinSession={joinSession}
          />
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}

export default App