import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, CheckCircle2, X } from '@phosphor-icons/react'

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

interface IssueAgreementProps {
  sessionData: SessionData
  currentPlayer: 'player1' | 'player2'
  updateSessionData: (updates: Partial<SessionData>) => void
}

export default function IssueAgreement({ sessionData, currentPlayer, updateSessionData }: IssueAgreementProps) {
  const [proposedIssue, setProposedIssue] = useState('')
  const [modification, setModification] = useState('')

  const proposeIssue = () => {
    if (proposedIssue.trim()) {
      updateSessionData({ agreedIssue: proposedIssue.trim() })
    }
  }

  const acceptIssue = () => {
    updateSessionData({ phase: 'steel-manning' })
  }

  const modifyIssue = () => {
    if (modification.trim()) {
      updateSessionData({ agreedIssue: modification.trim() })
      setModification('')
    }
  }

  const rejectIssue = () => {
    updateSessionData({ agreedIssue: '' })
    setProposedIssue('')
  }

  const hasProposedIssue = sessionData.agreedIssue.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={24} />
            Issue Agreement Phase
          </CardTitle>
          <p className="text-muted-foreground">
            First, let's agree on what exactly you're fighting about. Revolutionary concept, I know.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasProposedIssue ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What's the issue you want to address?
                </label>
                <Textarea
                  value={proposedIssue}
                  onChange={(e) => setProposedIssue(e.target.value)}
                  placeholder="Be specific. 'You're annoying' doesn't count as constructive..."
                  className="min-h-24"
                />
              </div>
              <Button 
                onClick={proposeIssue} 
                disabled={!proposedIssue.trim()}
                className="w-full"
              >
                Propose This Issue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-primary bg-muted/50">
                <h3 className="font-medium mb-2">Proposed Issue:</h3>
                <p className="text-foreground">{sessionData.agreedIssue}</p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Waiting for Agreement</Badge>
                <span className="text-sm text-muted-foreground">
                  Both players need to agree before proceeding
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  onClick={acceptIssue}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Accept Issue
                </Button>
                
                <div className="space-y-2">
                  <Textarea
                    value={modification}
                    onChange={(e) => setModification(e.target.value)}
                    placeholder="Suggest a modification..."
                    className="min-h-16"
                  />
                  <Button 
                    onClick={modifyIssue}
                    variant="secondary"
                    disabled={!modification.trim()}
                    className="w-full"
                  >
                    Modify & Re-propose
                  </Button>
                </div>
                
                <Button 
                  onClick={rejectIssue}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Reject Issue
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}