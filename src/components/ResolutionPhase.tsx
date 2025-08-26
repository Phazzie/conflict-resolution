import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Edit3, Handshake, AlertCircle } from '@phosphor-icons/react'

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

export default function ResolutionPhase({ sessionData, currentPlayer, updateSessionData }: Props) {
  const [resolutionText, setResolutionText] = useState('')
  const [modificationText, setModificationText] = useState('')
  const [proposer, setProposer] = useState<'player1' | 'player2' | null>(null)

  const handleProposeResolution = () => {
    if (!resolutionText.trim()) return
    
    updateSessionData({ 
      proposedResolution: resolutionText.trim()
    })
    setProposer(currentPlayer)
    setResolutionText('')
  }

  const handleAcceptResolution = () => {
    updateSessionData({
      finalResolution: sessionData.proposedResolution,
      phase: 'summary'
    })
  }

  const handleRejectResolution = () => {
    updateSessionData({ proposedResolution: '' })
    setProposer(null)
  }

  const handleModifyResolution = () => {
    if (!modificationText.trim()) return
    
    updateSessionData({
      proposedResolution: modificationText.trim()
    })
    setModificationText('')
  }

  const backToDiscussion = () => {
    updateSessionData({ phase: 'discussion' })
  }

  const isMyProposal = proposer === currentPlayer
  const isReviewingProposal = sessionData.proposedResolution && !isMyProposal
  const canPropose = !sessionData.proposedResolution

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake size={24} />
            Resolution Phase: Can We Stop This Ride?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                If, against all odds, a resolution appears on the horizon, one of you can propose it. 
                The other can accept, try to water it down with "modifications" (which need re-approval), 
                or just dig their heels in. Nothing's final until both parties click "agree."
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <AlertCircle size={20} className="text-primary" />
              <div>
                <p className="text-sm font-medium">Remember the Issue:</p>
                <p className="text-sm text-muted-foreground">{sessionData.agreedIssue}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessionData.finalResolution ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 size={24} />
              Final Resolution - LOCKED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white border-l-4 border-l-green-500 rounded-lg">
              <p className="text-foreground whitespace-pre-wrap">{sessionData.finalResolution}</p>
            </div>
            <p className="text-sm text-green-700 mt-3">
              Congratulations, you've achieved the impossible: mutual agreement. 
              This resolution is now locked and will be included in your battle report.
            </p>
          </CardContent>
        </Card>
      ) : sessionData.proposedResolution ? (
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 size={24} />
              Proposed Resolution
              {proposer && (
                <Badge variant="outline">
                  by {proposer === currentPlayer ? 'You' : `Player ${proposer === 'player1' ? '1' : '2'}`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{sessionData.proposedResolution}</p>
              </div>

              {isReviewingProposal && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleAcceptResolution}>
                      <CheckCircle2 size={16} className="mr-1" />
                      Accept Resolution
                    </Button>
                    <Button onClick={handleRejectResolution} variant="destructive">
                      <XCircle size={16} className="mr-1" />
                      Reject & Keep Fighting
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Or propose modifications:
                    </label>
                    <Textarea
                      value={modificationText}
                      onChange={(e) => setModificationText(e.target.value)}
                      placeholder="Suggest changes to this resolution..."
                      className="min-h-20"
                    />
                    <Button 
                      onClick={handleModifyResolution}
                      variant="outline" 
                      disabled={!modificationText.trim()}
                      className="w-full"
                    >
                      Propose Modified Version
                    </Button>
                  </div>
                </div>
              )}

              {isMyProposal && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Waiting for the other person to review your proposal...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Propose a Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Proposed Solution ({currentPlayer === 'player1' ? 'Player 1' : 'Player 2'})
                </label>
                <Textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Describe a concrete solution or agreement that addresses this issue. Be specific about what each person will do differently, boundaries that need to be set, or changes that need to happen."
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific and actionable. Vague promises like "we'll communicate better" aren't enough.
                </p>
              </div>
              
              <Button 
                onClick={handleProposeResolution}
                disabled={!resolutionText.trim()}
                className="w-full"
              >
                Propose This Resolution
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button 
          onClick={backToDiscussion} 
          variant="outline" 
          className="flex-1"
        >
          Back to Discussion
        </Button>
        
        {!sessionData.proposedResolution && (
          <Button 
            onClick={() => updateSessionData({ phase: 'summary' })}
            variant="destructive"
            className="flex-1"
          >
            End Session (No Resolution)
          </Button>
        )}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Resolution Guidelines:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Be specific about actions, not just feelings or intentions</p>
            <p>• Include what each person will do differently</p>
            <p>• Set clear boundaries or expectations if relevant</p>
            <p>• Make it measurable - how will you know if it's working?</p>
            <p>• Address the root cause, not just the symptoms</p>
            <p>• Both parties must explicitly agree for it to be final</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}