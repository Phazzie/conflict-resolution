import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Lock, Users, ChatCircle, CheckCircle, FileText, CircleNotch } from '@phosphor-icons/react'
import { SessionData, SessionPhase, PlayerRole, PHASE_PROGRESS, PHASE_NAMES } from './types/session'
import { validateSessionData } from './utils/validation'
import ErrorBoundary from './components/ErrorBoundary'
import IssueAgreement from './components/IssueAgreement'
import SteelManningPhase from './components/SteelManningPhase'
import StatementLocking from './components/StatementLocking'
import DiscussionPhase from './components/DiscussionPhase'
import ResolutionPhase from './components/ResolutionPhase'
import SessionSummary from './components/SessionSummary'

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

  const updateSessionData = (updates: Partial<SessionData>) => {
    setSessionData({ ...safeSessionData, ...updates })
  }

  const startSession = () => {
    updateSessionData({ 
      phase: 'issue-agreement',
      sessionStarted: Date.now() 
    })
  }

  const resetSession = () => {
    localStorage.removeItem('mixitfixit-player-role')
    setValidationError('')
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
  }

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
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={startSession} size="lg" className="w-full text-sm sm:text-base">
                    Enter the Digital Thunderdome
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
              <Button variant="outline" size="sm" onClick={resetSession} className="text-xs sm:text-sm">
                Reset
              </Button>
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
            <IssueAgreement 
              sessionData={safeSessionData}
              currentPlayer={currentPlayer}
              updateSessionData={updateSessionData}
            />
          )}
          
          {safeSessionData.phase === 'steel-manning' && (
            <SteelManningPhase
              sessionData={safeSessionData}
              currentPlayer={currentPlayer}
              updateSessionData={updateSessionData}
            />
          )}

          {safeSessionData.phase === 'statement-locking' && (
            <StatementLocking
              sessionData={safeSessionData}
              currentPlayer={currentPlayer}
              updateSessionData={updateSessionData}
            />
          )}

          {safeSessionData.phase === 'discussion' && (
            <DiscussionPhase
              sessionData={safeSessionData}
              currentPlayer={currentPlayer}
              updateSessionData={updateSessionData}
            />
          )}

          {safeSessionData.phase === 'resolution' && (
            <ResolutionPhase
              sessionData={safeSessionData}
              currentPlayer={currentPlayer}
              updateSessionData={updateSessionData}
            />
          )}

          {safeSessionData.phase === 'summary' && (
            <SessionSummary
              sessionData={safeSessionData}
              onReset={resetSession}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App