import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle, X, Eye } from '@phosphor-icons/react'

interface SessionData {
  phase: string
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

interface SteelManningPhaseProps {
  sessionData: SessionData
  currentPlayer: 'player1' | 'player2'
  updateSessionData: (updates: Partial<SessionData>) => void
}

export default function SteelManningPhase({ sessionData, currentPlayer, updateSessionData }: SteelManningPhaseProps) {
  const [currentSteelMan, setCurrentSteelMan] = useState('')
  
  const otherPlayer = currentPlayer === 'player1' ? 'player2' : 'player1'
  const myCurrentSteelMan = currentPlayer === 'player1' ? sessionData.playerOneSteelMan : sessionData.playerTwoSteelMan
  const otherPlayerSteelMan = currentPlayer === 'player1' ? sessionData.playerTwoSteelMan : sessionData.playerOneSteelMan

  const submitSteelMan = () => {
    if (currentSteelMan.trim()) {
      const updates = currentPlayer === 'player1' 
        ? { playerOneSteelMan: currentSteelMan.trim() }
        : { playerTwoSteelMan: currentSteelMan.trim() }
      updateSessionData(updates)
      setCurrentSteelMan('')
    }
  }

  const approveSteelMan = () => {
    // For demo purposes, auto-approve. In real app, this would need more complex approval logic
    if (sessionData.playerOneSteelMan && sessionData.playerTwoSteelMan) {
      updateSessionData({ phase: 'statement-locking' })
    }
  }

  const rejectSteelMan = () => {
    const updates = otherPlayer === 'player1' 
      ? { playerOneSteelMan: '' }
      : { playerTwoSteelMan: '' }
    updateSessionData(updates)
  }

  const bothCompleted = sessionData.playerOneSteelMan && sessionData.playerTwoSteelMan

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={24} />
            Steel-Manning Phase: Prove You're Not a Complete Narcissist
          </CardTitle>
          <p className="text-muted-foreground">
            Before you get to whine about your feelings, prove you can actually understand the other person's perspective on the agreed issue.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border-l-4 border-primary bg-muted/50">
            <h3 className="font-medium mb-2">The Issue We're Steel-Manning:</h3>
            <p className="text-foreground">{sessionData.agreedIssue}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* My Steel-Man */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={myCurrentSteelMan ? "default" : "outline"}>
                  Your Steel-Man
                </Badge>
                {myCurrentSteelMan && <CheckCircle size={16} className="text-green-500" />}
              </div>

              {!myCurrentSteelMan ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Explain the {otherPlayer === 'player1' ? 'other' : 'other'} person's perspective:
                  </label>
                  <Textarea
                    value={currentSteelMan}
                    onChange={(e) => setCurrentSteelMan(e.target.value)}
                    placeholder="What do they think? Why do they feel this way? What's their reasoning? Be honest and accurate..."
                    className="min-h-32"
                  />
                  <Button 
                    onClick={submitSteelMan}
                    disabled={!currentSteelMan.trim()}
                    className="w-full"
                  >
                    Submit My Steel-Man
                  </Button>
                </div>
              ) : (
                <div className="p-3 border rounded-lg bg-background">
                  <p className="text-sm text-muted-foreground mb-1">Your submission:</p>
                  <p>{myCurrentSteelMan}</p>
                </div>
              )}
            </div>

            {/* Their Steel-Man */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={otherPlayerSteelMan ? "default" : "outline"}>
                  Their Steel-Man
                </Badge>
                {otherPlayerSteelMan && <Eye size={16} className="text-blue-500" />}
              </div>

              {otherPlayerSteelMan ? (
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg bg-background">
                    <p className="text-sm text-muted-foreground mb-1">Their understanding of your perspective:</p>
                    <p>{otherPlayerSteelMan}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={approveSteelMan}
                      variant="default"
                      className="flex-1"
                    >
                      <CheckCircle size={16} className="mr-1" />
                      Accurate Enough
                    </Button>
                    <Button 
                      onClick={rejectSteelMan}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X size={16} className="mr-1" />
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                  Waiting for the other person to submit their steel-man of your perspective...
                </div>
              )}
            </div>
          </div>

          {bothCompleted && (
            <div className="pt-4 border-t text-center">
              <Badge variant="default" className="mb-2">Both Steel-Mans Complete</Badge>
              <p className="text-sm text-muted-foreground mb-4">
                Great! You've both proven you can at least pretend to understand each other. 
                Ready to lock in your personal statements?
              </p>
              <Button 
                onClick={() => updateSessionData({ phase: 'statement-locking' })}
                size="lg"
              >
                Proceed to Statement Locking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}