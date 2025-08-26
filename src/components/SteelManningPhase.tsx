import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle2, XCircle, Brain } from '@phosphor-icons/react'

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

interface Props {
  sessionData: SessionData
  currentPlayer: 'player1' | 'player2'
  updateSessionData: (updates: Partial<SessionData>) => void
}

export default function SteelManningPhase({ sessionData, currentPlayer, updateSessionData }: Props) {
  const [currentSteelMan, setCurrentSteelMan] = useState('')
  const [playerOneSteelManApproved, setPlayerOneSteelManApproved] = useState(false)
  const [playerTwoSteelManApproved, setPlayerTwoSteelManApproved] = useState(false)

  const handleSubmitSteelMan = () => {
    if (!currentSteelMan.trim()) return

    const updates = currentPlayer === 'player1' 
      ? { playerOneSteelMan: currentSteelMan.trim() }
      : { playerTwoSteelMan: currentSteelMan.trim() }
    
    updateSessionData(updates)
    setCurrentSteelMan('')
  }

  const handleApproveSteelMan = (player: 'player1' | 'player2') => {
    if (player === 'player1') {
      setPlayerOneSteelManApproved(true)
    } else {
      setPlayerTwoSteelManApproved(true)
    }

    // Check if both steel-mans are approved and proceed to next phase
    const bothApproved = (player === 'player1' ? true : playerOneSteelManApproved) && 
                        (player === 'player2' ? true : playerTwoSteelManApproved)
    
    if (bothApproved) {
      updateSessionData({ phase: 'statement-locking' })
    }
  }

  const handleRejectSteelMan = (player: 'player1' | 'player2') => {
    const updates = player === 'player1' 
      ? { playerOneSteelMan: '' }
      : { playerTwoSteelMan: '' }
    
    updateSessionData(updates)
    
    if (player === 'player1') setPlayerOneSteelManApproved(false)
    if (player === 'player2') setPlayerTwoSteelManApproved(false)
  }

  const mySubmittedSteelMan = currentPlayer === 'player1' ? sessionData.playerOneSteelMan : sessionData.playerTwoSteelMan
  const theirSubmittedSteelMan = currentPlayer === 'player1' ? sessionData.playerTwoSteelMan : sessionData.playerOneSteelMan
  const canSubmit = !mySubmittedSteelMan
  const needsToReview = theirSubmittedSteelMan && !playerTwoSteelManApproved && !playerOneSteelManApproved

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={24} />
            Steel-Manning Phase: Prove You're Not a Complete Narcissist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={20} className="text-primary" />
                <span className="font-medium">The Agreed Issue</span>
              </div>
              <p className="text-foreground">{sessionData.agreedIssue}</p>
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                Before you get to unleash your meticulously crafted monologue of woe, you have to prove 
                you're actually listening. Explain the <strong>other person's perspective</strong> on this issue 
                so accurately that they grudgingly nod in agreement.
              </p>
              <p>
                This isn't about agreeing with them (heaven forbid), it's about demonstrating you 
                understand their feelings, reasoning, and position. Get it wrong? Try again, buttercup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Player 1 Steel-Man */}
        <Card className={currentPlayer === 'player1' ? 'ring-2 ring-primary/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Player 1's Steel-Man</span>
              {currentPlayer === 'player1' && <Badge variant="secondary">You</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData.playerOneSteelMan ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{sessionData.playerOneSteelMan}</p>
                </div>
                
                {currentPlayer === 'player2' && !playerOneSteelManApproved && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApproveSteelMan('player1')} 
                      size="sm"
                    >
                      <CheckCircle2 size={16} className="mr-1" />
                      Accurate Enough
                    </Button>
                    <Button 
                      onClick={() => handleRejectSteelMan('player1')}
                      variant="destructive" 
                      size="sm"
                    >
                      <XCircle size={16} className="mr-1" />
                      Try Again
                    </Button>
                  </div>
                )}
                
                {playerOneSteelManApproved && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 size={16} className="mr-1" />
                    Approved by Player 2
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {currentPlayer === 'player1' && canSubmit ? (
                  <>
                    <Textarea
                      value={currentSteelMan}
                      onChange={(e) => setCurrentSteelMan(e.target.value)}
                      placeholder="Explain Player 2's perspective on this issue. What do they feel? What's their reasoning? Be specific and empathetic."
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Write this from their point of view. What are their feelings, concerns, and logic about this issue?
                    </p>
                    <Button 
                      onClick={handleSubmitSteelMan}
                      disabled={!currentSteelMan.trim()}
                      className="w-full"
                    >
                      Submit Steel-Man
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for Player 1 to submit their steel-man...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player 2 Steel-Man */}
        <Card className={currentPlayer === 'player2' ? 'ring-2 ring-primary/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Player 2's Steel-Man</span>
              {currentPlayer === 'player2' && <Badge variant="secondary">You</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData.playerTwoSteelMan ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{sessionData.playerTwoSteelMan}</p>
                </div>
                
                {currentPlayer === 'player1' && !playerTwoSteelManApproved && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApproveSteelMan('player2')} 
                      size="sm"
                    >
                      <CheckCircle2 size={16} className="mr-1" />
                      Accurate Enough
                    </Button>
                    <Button 
                      onClick={() => handleRejectSteelMan('player2')}
                      variant="destructive" 
                      size="sm"
                    >
                      <XCircle size={16} className="mr-1" />
                      Try Again
                    </Button>
                  </div>
                )}
                
                {playerTwoSteelManApproved && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 size={16} className="mr-1" />
                    Approved by Player 1
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {currentPlayer === 'player2' && canSubmit ? (
                  <>
                    <Textarea
                      value={currentSteelMan}
                      onChange={(e) => setCurrentSteelMan(e.target.value)}
                      placeholder="Explain Player 1's perspective on this issue. What do they feel? What's their reasoning? Be specific and empathetic."
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Write this from their point of view. What are their feelings, concerns, and logic about this issue?
                    </p>
                    <Button 
                      onClick={handleSubmitSteelMan}
                      disabled={!currentSteelMan.trim()}
                      className="w-full"
                    >
                      Submit Steel-Man
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for Player 2 to submit their steel-man...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Steel-Manning Rules:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Explain the other person's position better than they could themselves</p>
            <p>• Include their emotions, reasoning, and underlying concerns</p>
            <p>• No strawman arguments or subtle digs - this is about understanding</p>
            <p>• They must approve your steel-man before you can proceed</p>
            <p>• If rejected, revise and try again until you demonstrate actual listening</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}