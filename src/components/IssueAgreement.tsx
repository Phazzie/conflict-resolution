import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChatCircle, CheckCircle, X } from '@phosphor-icons/react'
import { PhaseProps } from '../types/session'
import { validateIssueInput } from '../utils/validation'
import { SuccessCheckmark, LoadingSpinner } from '@/components/ui/loading'

const IssueAgreement = React.memo(({ sessionData, updateSessionData }: Omit<PhaseProps, 'currentPlayer'>) => {
  const [proposedIssue, setProposedIssue] = useState('')
  const [modification, setModification] = useState('')
  const [validationError, setValidationError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const proposeIssue = async () => {
    setIsSubmitting(true)
    const validation = validateIssueInput(proposedIssue)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid input')
      setIsSubmitting(false)
      return
    }
    
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setValidationError('')
    updateSessionData({ agreedIssue: proposedIssue.trim() })
    setShowSuccess(true)
    setIsSubmitting(false)
    
    // Hide success after animation
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const acceptIssue = () => {
    updateSessionData({ phase: 'steel-manning' })
  }

  const modifyIssue = () => {
    const validation = validateIssueInput(modification)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid modification')
      return
    }
    
    setValidationError('')
    updateSessionData({ agreedIssue: modification.trim() })
    setModification('')
  }

  const rejectIssue = () => {
    updateSessionData({ agreedIssue: '' })
    setProposedIssue('')
    setValidationError('')
  }

  const hasProposedIssue = sessionData.agreedIssue.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatCircle size={24} />
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
                <label htmlFor="issue-input" className="block text-sm font-medium mb-2">
                  What's the issue you want to address?
                </label>
                <Textarea
                  id="issue-input"
                  value={proposedIssue}
                  onChange={(e) => {
                    setProposedIssue(e.target.value)
                    setValidationError('')
                  }}
                  placeholder="Be specific. 'You're annoying' doesn't count as constructive..."
                  className="min-h-24"
                  aria-describedby={validationError ? "issue-error" : undefined}
                  aria-invalid={!!validationError}
                />
                {validationError && (
                  <p id="issue-error" role="alert" className="text-sm text-destructive">{validationError}</p>
                )}
              </div>
              <Button 
                onClick={proposeIssue} 
                disabled={!proposedIssue.trim() || isSubmitting}
                className="w-full"
                aria-label="Propose this issue for discussion"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" text="Processing..." />
                ) : (
                  'Propose This Issue'
                )}
              </Button>
              
              {showSuccess && (
                <SuccessCheckmark text="Issue proposed successfully!" />
              )}
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
                  <CheckCircle size={16} />
                  Accept Issue
                </Button>
                
                <div className="space-y-2">
                  <Textarea
                    value={modification}
                    onChange={(e) => {
                      setModification(e.target.value)
                      setValidationError('')
                    }}
                    placeholder="Suggest a modification..."
                    className="min-h-16"
                  />
                  {validationError && (
                    <p className="text-sm text-destructive">{validationError}</p>
                  )}
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
})

IssueAgreement.displayName = 'IssueAgreement'

export default IssueAgreement