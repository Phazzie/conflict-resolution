import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, X, PencilSimple, Handshake } from '@phosphor-icons/react'

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

interface ResolutionPhaseProps {
  sessionData: SessionData
  currentPlayer: 'player1' | 'player2'
  updateSessionData: (updates: Partial<SessionData>) => void
}

export default function ResolutionPhase({ sessionData, updateSessionData }: Omit<ResolutionPhaseProps, 'currentPlayer'>) {
  const [currentProposal, setCurrentProposal] = useState('')
  const [modification, setModification] = useState('')

  const proposeResolution = () => {
    if (currentProposal.trim()) {
      updateSessionData({ proposedResolution: currentProposal.trim() })
      setCurrentProposal('')
    }
  }

  const acceptResolution = () => {
    updateSessionData({ 
      finalResolution: sessionData.proposedResolution,
      phase: 'summary' 
    })
  }

  const modifyResolution = () => {
    if (modification.trim()) {
      updateSessionData({ proposedResolution: modification.trim() })
      setModification('')
    }
  }

  const rejectResolution = () => {
    updateSessionData({ proposedResolution: '' })
  }

  const hasProposedResolution = sessionData.proposedResolution.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake size={24} />
            Resolution Phase: Can We Actually Agree to Stop?
          </CardTitle>
          <p className="text-muted-foreground">
            Time to see if all that "discussion" actually led somewhere. Propose a resolution that you can both live with.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Context */}
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-primary bg-muted/50">
              <h3 className="font-medium mb-2">The Issue We've Been Fighting About:</h3>
              <p className="text-foreground">{sessionData.agreedIssue}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-1">Player 1's Locked Statement</h4>
                <p className="text-muted-foreground">{sessionData.playerOneStatement}</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-1">Player 2's Locked Statement</h4>
                <p className="text-muted-foreground">{sessionData.playerTwoStatement}</p>
              </div>
            </div>

            {sessionData.messages.length > 0 && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-1">Discussion Summary</h4>
                <p className="text-xs text-muted-foreground">
                  {sessionData.messages.length} messages exchanged
                  {sessionData.messages.filter(m => m.author === 'ai').length > 0 && 
                    ` (including ${sessionData.messages.filter(m => m.author === 'ai').length} AI interventions)`}
                </p>
              </div>
            )}
          </div>

          {/* Resolution Proposal/Negotiation */}
          {!hasProposedResolution ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Propose a Resolution
                </label>
                <Textarea
                  value={currentProposal}
                  onChange={(e) => setCurrentProposal(e.target.value)}
                  placeholder="What specific actions, agreements, or changes would resolve this issue? Be concrete and actionable..."
                  className="min-h-32"
                />
              </div>
              <Button 
                onClick={proposeResolution} 
                disabled={!currentProposal.trim()}
                className="w-full"
              >
                <PencilSimple size={16} className="mr-2" />
                Propose This Resolution
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-green-500 bg-green-50/50">
                <h3 className="font-medium mb-2 text-green-800">Proposed Resolution:</h3>
                <p className="text-foreground">{sessionData.proposedResolution}</p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Waiting for Agreement</Badge>
                <span className="text-sm text-muted-foreground">
                  Both parties need to agree to make this resolution final
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={acceptResolution}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Accept Resolution
                </Button>
                
                <div className="space-y-2">
                  <Textarea
                    value={modification}
                    onChange={(e) => setModification(e.target.value)}
                    placeholder="Suggest modifications..."
                    className="min-h-20"
                  />
                  <Button 
                    onClick={modifyResolution}
                    variant="secondary"
                    disabled={!modification.trim()}
                    className="w-full flex items-center gap-2"
                  >
                    <PencilSimple size={16} />
                    Modify & Re-propose
                  </Button>
                </div>
                
                <Button 
                  onClick={rejectResolution}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Reject & Continue Fighting
                </Button>
              </div>
            </div>
          )}

          {/* Helpful Tips */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Tips for a Good Resolution:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Be specific about actions, not vague about feelings</li>
              <li>Include what each person will do differently</li>
              <li>Set measurable outcomes or check-ins</li>
              <li>Address the core issue, not just symptoms</li>
              <li>Make it realistic and achievable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}