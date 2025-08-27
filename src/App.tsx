import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Lock, Users, ChatCircle, CheckCircle, FileText } from '@phosphor-icons/react'
import IssueAgreement from './components/IssueAgreement'
import SteelManningPhase from './components/SteelManningPhase'
import StatementLocking from './components/StatementLocking'
import DiscussionPhase from './components/DiscussionPhase'
import ResolutionPhase from './components/ResolutionPhase'
import SessionSummary from './components/SessionSummary'

type SessionPhase = 'welcome' | 'issue-agreement' | 'steel-manning' | 'statement-locking' | 'discussion' | 'resolution' | 'summary'

interface SessionData {
  phase: SessionPhase
  agreedIssue: string
  playerOneSteelMan: string
  playerTwoSteelMan: string
  playerOneStatement: string
  playerTwoStatement: string
  messages: Array<{
    id: string
    author: 'player1' | 'player2' | 'ai'
    content: string
    timestamp: number
  }>
  proposedResolution: string
  finalResolution: string
  sessionStarted: number
}

const PHASE_PROGRESS = {
  'welcome': 0,
  'issue-agreement': 20,
  'steel-manning': 40,
  'statement-locking': 60,
  'discussion': 80,
  'resolution': 90,
  'summary': 100
}

const PHASE_NAMES = {
  'welcome': 'Digital Thunderdome Entry',
  'issue-agreement': 'Issue Agreement',
  'steel-manning': 'Steel-Manning Phase',
  'statement-locking': 'Statement Locking',
  'discussion': 'Moderated Discussion', 
  'resolution': 'Resolution Negotiation',
  'summary': 'Battle Report'
}

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

  const [currentPlayer] = useState<'player1' | 'player2'>(() => 
    Math.random() > 0.5 ? 'player1' : 'player2'
  )

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

  if (!sessionData || safeSessionData.phase === 'welcome') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">MixitFixit</h1>
            <p className="text-xl text-muted-foreground mb-2">
              Digital Thunderdome for Dysfunctional Relationships
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Welcome to the structured battleground where you're forced to listen, articulate, 
              and maybe (just maybe) not be a complete asshat. No mudslinging until you 
              actually agree on what you're fighting about.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={24} />
                Ready to Stop Screaming and Start Scheming?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <ChatCircle size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">Issue Agreement</p>
                    <p className="text-sm text-muted-foreground">
                      Actually agree on what you're fighting about first
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Users size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">Steel-Manning Phase</p>
                    <p className="text-sm text-muted-foreground">
                      Prove you're not a narcissist by understanding the other person
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Lock size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">Statement Locking</p>
                    <p className="text-sm text-muted-foreground">
                      Carve your truth in digital stone - no takebacks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <ChatCircle size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">AI-Moderated Discussion</p>
                    <p className="text-sm text-muted-foreground">
                      Chat with a snarky AI referee calling out your BS
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={startSession} size="lg" className="w-full">
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
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">MixitFixit</h1>
              <Badge variant="outline">
                {currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}
              </Badge>
            </div>
            <Button variant="outline" onClick={resetSession}>
              Reset Session
            </Button>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {PHASE_NAMES[safeSessionData.phase]}
              </span>
              <span className="text-sm text-muted-foreground">
                {PHASE_PROGRESS[safeSessionData.phase]}%
              </span>
            </div>
            <Progress value={PHASE_PROGRESS[safeSessionData.phase]} className="w-full" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
  )
}

export default App