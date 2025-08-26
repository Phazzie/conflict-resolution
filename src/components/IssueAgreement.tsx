import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, CheckCircle2, XCircle, Edit3 } from '@phosphor-icons/react'

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

export default function IssueAgreement({ sessionData, currentPlayer, updateSessionData }: Props) {
  const [proposedIssue, setProposedIssue] = useState('')
  const [modificationText, setModificationText] = useState('')
  const [pendingProposal, setPendingProposal] = useState('')
  const [status, setStatus] = useState<'idle' | 'proposed' | 'pending-approval'>('idle')

  const handleProposeIssue = () => {
    if (!proposedIssue.trim()) return
    
    setPendingProposal(proposedIssue.trim())
    setStatus('pending-approval')
    setProposedIssue('')
  }

  const handleAcceptIssue = () => {
    updateSessionData({
      agreedIssue: pendingProposal,
      phase: 'steel-manning'
    })
  }

  const handleRejectIssue = () => {
    setPendingProposal('')
    setStatus('idle')
  }

  const handleModifyIssue = () => {
    if (!modificationText.trim()) return
    
    setPendingProposal(modificationText.trim())
    setModificationText('')
  }

  const isWaitingForOther = status === 'pending-approval' && currentPlayer === 'player1'
  const isReviewingProposal = status === 'pending-approval' && currentPlayer === 'player2'
  const canPropose = status === 'idle'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={24} />
            Issue Agreement: What Are We Actually Fighting About?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Before we proceed to the digital Thunderdome, let's establish what specific issue 
              is causing this delightful dysfunction. No mudslinging until both parties agree 
              on the exact wording of your mutual torment.
            </p>
            
            {sessionData.agreedIssue && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={20} className="text-primary" />
                  <span className="font-medium text-primary">Agreed Issue</span>
                </div>
                <p className="text-foreground">{sessionData.agreedIssue}</p>
              </div>
            )}

            {pendingProposal && !sessionData.agreedIssue && (
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 size={20} className="text-accent" />
                  <span className="font-medium text-accent">Pending Proposal</span>
                </div>
                <p className="text-foreground mb-4">{pendingProposal}</p>
                
                {isReviewingProposal && (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleAcceptIssue} size="sm">
                      <CheckCircle2 size={16} className="mr-1" />
                      Accept
                    </Button>
                    <Button onClick={handleRejectIssue} variant="destructive" size="sm">
                      <XCircle size={16} className="mr-1" />
                      Reject
                    </Button>
                    <div className="flex items-center gap-2 flex-1 min-w-64">
                      <Textarea
                        value={modificationText}
                        onChange={(e) => setModificationText(e.target.value)}
                        placeholder="Suggest modification..."
                        className="min-h-0 h-9 text-sm"
                      />
                      <Button 
                        onClick={handleModifyIssue}
                        variant="outline" 
                        size="sm"
                        disabled={!modificationText.trim()}
                      >
                        Modify
                      </Button>
                    </div>
                  </div>
                )}
                
                {isWaitingForOther && (
                  <Badge variant="secondary">
                    Waiting for the other person to respond...
                  </Badge>
                )}
              </div>
            )}

            {canPropose && !sessionData.agreedIssue && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Propose the Issue ({currentPlayer === 'player1' ? 'Player 1' : 'Player 2'})
                  </label>
                  <Textarea
                    value={proposedIssue}
                    onChange={(e) => setProposedIssue(e.target.value)}
                    placeholder="e.g., 'You treat your phone like your primary life partner' or 'You never listen when I'm trying to explain my feelings'"
                    className="min-h-24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific. Vague complaints like "you're annoying" won't cut it here.
                  </p>
                </div>
                
                <Button 
                  onClick={handleProposeIssue}
                  disabled={!proposedIssue.trim()}
                  className="w-full"
                >
                  Propose This Issue
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!sessionData.agreedIssue && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">How This Works:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. One person proposes the specific issue you're dealing with</p>
              <p>2. The other person can Accept, Reject, or Modify the proposed wording</p>
              <p>3. If modified, it goes back to the original proposer for approval</p>
              <p>4. This continues until both parties agree on the exact same wording</p>
              <p>5. Only then do we proceed to the next phase of mutual understanding</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}