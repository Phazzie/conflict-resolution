import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Toaster } from '@/components/ui/sonner'
import { Lock, Users, ChatCircle, CircleNotch, ChartBar, History } from '@phosphor-icons/react'
import { SessionData, PlayerRole, PHASE_PROGRESS, PHASE_NAMES } from './types/session'
import { validateSessionData } from './utils/validation'
import { clearSession } from './utils/sessionPersistence'
import { analyticsService } from './services/analytics'
import { sessionHistoryService } from './services/sessionHistory'
import ErrorBoundary from './components/ErrorBoundary'
import PhaseErrorBoundary from './components/PhaseErrorBoundary'
import IssueAgreement from './components/IssueAgreement'
import SteelManningPhase from './components/SteelManningPhase'
import StatementLocking from './components/StatementLocking'
import DiscussionPhase from './components/DiscussionPhase'
import ResolutionPhase from './components/ResolutionPhase'
import SessionSummary from './components/SessionSummary'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import SessionSharing from './components/SessionSharing'
import SessionHistoryDashboard from './components/SessionHistoryDashboard'
import CouplesDashboard from './components/CouplesDashboard'

function App() {
  const [sessionData, setSessionData] = useKV<SessionData>('mixitfixit-session', {
    phase: 'welcome',
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
  
  // Initialize loading state and validate session
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessionData) {
        const validation = validateSessionData(sessionData)
        if (!validation.isValid) {
          setValidationError(validation.error || 'Session validation failed')
          console.warn('Session validation failed:', validation.error)
        }
      }
      setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [sessionData])

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

  const startSession = useCallback(() => {
    updateSessionData({ 
      phase: 'issue-agreement',
      sessionStarted: Date.now() 
    })
  }, [updateSessionData])

  const resetSession = useCallback(() => {
    localStorage.removeItem('mixitfixit-player-role')
    setValidationError('')
    clearSession() // Use enhanced session clearing
    setSessionData({
      phase: 'welcome',
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
    // TODO: Implement actual session joining logic
    // For now, simulate joining
    updateSessionData({
      isMultiplayer: true,
      sessionId,
      participants: [
        { playerId: 'player1', isOnline: true, lastSeen: Date.now(), isTyping: false },
        { playerId: 'player2', isOnline: true, lastSeen: Date.now(), isTyping: false }
      ]
    })
    return true
  }

  const viewAnalytics = useCallback(async () => {
    // Generate analytics for current session before showing dashboard
    if (sessionData && sessionData.messages.length > 0) {
      try {
        const analytics = await analyticsService.generateSessionAnalytics(sessionData)
        console.log('Generated session analytics:', analytics)
      } catch (error) {
        console.error('Failed to generate session analytics:', error)
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

  const saveCurrentSession = useCallback(async (outcome: 'resolved' | 'stalemate' | 'abandoned') => {
    if (sessionData && (sessionData.agreedIssue || sessionData.messages.length > 0)) {
      try {
        await sessionHistoryService.saveSession(sessionData, outcome)
        console.log(`Session saved to history with outcome: ${outcome}`)
      } catch (error) {
        console.error('Failed to save session to history:', error)
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="flex items-center gap-3 p-6">
              <CircleNotch size={24} className="animate-spin text-primary" />
              <p className="text-muted-foreground">
                Loading the digital thunderdome...
              </p>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Lock size={24} />
                Session Corrupted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Looks like something went sideways with your session data. Even digital relationships have trust issues.
              </p>
              
              <div className="p-3 bg-muted rounded text-sm">
                {validationError}
              </div>
              
              <div className="flex gap-2">
                <Button onClick={resetSession} variant="default">
                  Start Fresh
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Sometimes the best solution is to burn it all down and start over.
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
      <ErrorBoundary>
        <div className="min-h-screen bg-background p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">MixitFixit</h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-2">
                Digital Thunderdome for Dysfunctional Relationships
              </p>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
                Welcome to the structured battleground where you're forced to listen, articulate, 
                and maybe (just maybe) not be a complete asshat. No mudslinging until you 
                actually agree on what you're fighting about.
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Users size={20} className="sm:w-6 sm:h-6" />
                  Ready to Stop Screaming and Start Scheming?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ChatCircle size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Issue Agreement</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Actually agree on what you're fighting about first
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Users size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Steel-Manning Phase</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Prove you're not a narcissist by understanding the other person
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Lock size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Statement Locking</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Carve your truth in digital stone - no takebacks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ChatCircle size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">AI-Moderated Discussion</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Chat with a snarky AI referee calling out your BS
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Heart size={16} className="sm:w-5 sm:h-5 text-pink-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Couples Dashboard</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Track shared goals and relationship patterns over time
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={startSession} size="lg" className="w-full text-sm sm:text-base mb-3">
                    Enter the Digital Thunderdome
                  </Button>
                  <Button 
                    onClick={() => updateSessionData({ phase: 'couples-dashboard' })} 
                    variant="outline" 
                    size="lg" 
                    className="w-full text-sm sm:text-base"
                  >
                    <Heart size={16} className="mr-2" />
                    View Couples Dashboard
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    You're {currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} in this session
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  // Active session screen
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">MixitFixit</h1>
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {currentPlayer === 'player1' ? 'P1' : 'P2'}
                </Badge>
                {hasActiveSession && (
                  <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                    Session Recovered
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {safeSessionData.messages.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={viewAnalytics}
                    className="text-xs sm:text-sm"
                  >
                    <ChartBar size={16} className="mr-1" />
                    Analytics
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={viewCouplesDashboard}
                  className="text-xs sm:text-sm"
                >
                  <Heart size={16} className="mr-1" />
                  Couples
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={viewHistory}
                  className="text-xs sm:text-sm"
                >
                  <History size={16} className="mr-1" />
                  History
                </Button>
                <Button variant="outline" size="sm" onClick={resetSession} className="text-xs sm:text-sm">
                  Reset
                </Button>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate mr-2">
                  {PHASE_NAMES[safeSessionData.phase]}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {PHASE_PROGRESS[safeSessionData.phase]}%
                </span>
              </div>
              <Progress value={PHASE_PROGRESS[safeSessionData.phase]} className="w-full" />
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {safeSessionData.phase === 'issue-agreement' && (
            <PhaseErrorBoundary phase="Issue Agreement" onReset={resetSession}>
              <IssueAgreement 
                sessionData={safeSessionData}
                updateSessionData={updateSessionData}
              />
            </PhaseErrorBoundary>
          )}
          
          {safeSessionData.phase === 'steel-manning' && (
            <PhaseErrorBoundary phase="Steel Manning" onReset={resetSession}>
              <SteelManningPhase
                sessionData={safeSessionData}
                currentPlayer={currentPlayer}
                updateSessionData={updateSessionData}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'statement-locking' && (
            <PhaseErrorBoundary phase="Statement Locking" onReset={resetSession}>
              <StatementLocking
                sessionData={safeSessionData}
                currentPlayer={currentPlayer}
                updateSessionData={updateSessionData}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'discussion' && (
            <PhaseErrorBoundary phase="Discussion" onReset={resetSession}>
              <DiscussionPhase
                sessionData={safeSessionData}
                currentPlayer={currentPlayer}
                updateSessionData={updateSessionData}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'resolution' && (
            <PhaseErrorBoundary phase="Resolution" onReset={resetSession}>
              <ResolutionPhase
                sessionData={safeSessionData}
                updateSessionData={updateSessionData}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'summary' && (
            <PhaseErrorBoundary phase="Summary" onReset={resetSession}>
              <SessionSummary
                sessionData={safeSessionData}
                onReset={resetSession}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'analytics' && (
            <PhaseErrorBoundary phase="Analytics" onReset={resetSession}>
              <AnalyticsDashboard onExport={exportAnalytics} />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'history' && (
            <PhaseErrorBoundary phase="Session History" onReset={resetSession}>
              <SessionHistoryDashboard 
                currentSession={safeSessionData}
                onClose={() => updateSessionData({ phase: 'welcome' })}
                onExport={exportAnalytics}
              />
            </PhaseErrorBoundary>
          )}

          {safeSessionData.phase === 'couples-dashboard' && (
            <PhaseErrorBoundary phase="Couples Dashboard" onReset={resetSession}>
              <CouplesDashboard 
                currentSession={safeSessionData}
                onClose={() => updateSessionData({ phase: 'welcome' })}
                onExport={exportAnalytics}
              />
            </PhaseErrorBoundary>
          )}

          {/* Session Sharing Component - show on discussion phase */}
          {safeSessionData.phase === 'discussion' && (
            <div className="mt-8">
              <SessionSharing
                sessionId={safeSessionData.sessionId}
                currentPlayer={currentPlayer}
                participants={safeSessionData.participants || []}
                isMultiplayer={safeSessionData.isMultiplayer || false}
                onEnableMultiplayer={enableMultiplayer}
                onJoinSession={joinSession}
              />
            </div>
          )}
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}

export default App