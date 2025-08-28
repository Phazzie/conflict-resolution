import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Lock, CheckCircle, Warning } from '@phosphor-icons/react'
import { PhaseProps } from '../types/session'
import { validateStatementInput } from '../utils/validation'

const StatementLocking = React.memo(({ sessionData, currentPlayer, updateSessionData }: PhaseProps) => {
  const [currentStatement, setCurrentStatement] = useState('')
  const [showLockConfirm, setShowLockConfirm] = useState(false)
  const myCurrentStatement = currentPlayer === 'player1' ? sessionData.playerOneStatement : sessionData.playerTwoStatement
  const otherPlayerStatement = currentPlayer === 'player1' ? sessionData.playerTwoStatement : sessionData.playerOneStatement

  const lockStatement = () => {
    const validation = validateStatementInput(currentStatement)
    if (!validation.isValid) {
      console.warn('Statement validation failed:', validation.error)
      return
    }
    
    const updates = currentPlayer === 'player1' 
      ? { playerOneStatement: currentStatement.trim() }
      : { playerTwoStatement: currentStatement.trim() }
    updateSessionData(updates)
    setCurrentStatement('')
    setShowLockConfirm(false)
  }

  const bothStatementsLocked = sessionData.playerOneStatement && sessionData.playerTwoStatement

  const proceedToDiscussion = () => {
    updateSessionData({ phase: 'discussion' })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={24} />
            Statement Locking: Carve Your Truth in Digital Stone
          </CardTitle>
          <p className="text-muted-foreground">
            Time to commit to your perspective. Once locked, there's no "I didn't mean it like that" or "you're twisting my words." This is your immutable truth.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border-l-4 border-primary bg-muted/50">
            <h3 className="font-medium mb-2">The Issue:</h3>
            <p className="text-foreground mb-3">{sessionData.agreedIssue}</p>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Your Steel-Man:</strong> {currentPlayer === 'player1' ? sessionData.playerOneSteelMan : sessionData.playerTwoSteelMan}</p>
              <p><strong>Their Steel-Man:</strong> {currentPlayer === 'player1' ? sessionData.playerTwoSteelMan : sessionData.playerOneSteelMan}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* My Statement */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={myCurrentStatement ? "default" : "outline"}>
                  Your Statement
                </Badge>
                {myCurrentStatement && (
                  <div className="flex items-center gap-1">
                    <Lock size={16} className="text-green-500" />
                    <span className="text-xs text-green-600 font-medium">LOCKED</span>
                  </div>
                )}
              </div>

              {!myCurrentStatement ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Your personal statement on this issue:
                  </label>
                  <Textarea
                    value={currentStatement}
                    onChange={(e) => setCurrentStatement(e.target.value)}
                    placeholder="This is your chance to articulate your position clearly and completely. Be honest, be specific, and remember - this gets locked in forever..."
                    className="min-h-40"
                  />
                  
                  {!showLockConfirm ? (
                    <Button 
                      onClick={() => setShowLockConfirm(true)}
                      disabled={!currentStatement.trim()}
                      className="w-full"
                      variant="default"
                    >
                      Ready to Lock This Statement
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 border border-destructive/50 bg-destructive/5 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive">
                        <Warning size={16} />
                        <span className="font-medium">Final Warning</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Once locked, this statement cannot be edited. It becomes your official position for this discussion. Are you absolutely sure?
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={lockStatement}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Lock size={16} className="mr-1" />
                          Lock It In Forever
                        </Button>
                        <Button 
                          onClick={() => setShowLockConfirm(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Wait, Let Me Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border-2 border-green-500/30 rounded-lg bg-green-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">STATEMENT LOCKED</span>
                  </div>
                  <p className="text-foreground">{myCurrentStatement}</p>
                </div>
              )}
            </div>

            {/* Their Statement */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={otherPlayerStatement ? "default" : "outline"}>
                  Their Statement
                </Badge>
                {otherPlayerStatement && (
                  <div className="flex items-center gap-1">
                    <Lock size={16} className="text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">LOCKED</span>
                  </div>
                )}
              </div>

              {otherPlayerStatement ? (
                <div className="p-4 border-2 border-blue-500/30 rounded-lg bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">STATEMENT LOCKED</span>
                  </div>
                  <p className="text-foreground">{otherPlayerStatement}</p>
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground min-h-40 flex items-center justify-center">
                  Waiting for the other person to lock in their statement...
                </div>
              )}
            </div>
          </div>

          {bothStatementsLocked && (
            <div className="pt-4 border-t text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-500" />
                <Badge variant="default">Both Statements Locked</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Excellent! You've both committed to your positions. Now the real fun begins - 
                let's see if you can discuss this like civilized humans with our AI referee watching.
              </p>
              <Button 
                onClick={proceedToDiscussion}
                size="lg"
              >
                Enter the Moderated Discussion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

StatementLocking.displayName = 'StatementLocking'

export default StatementLocking