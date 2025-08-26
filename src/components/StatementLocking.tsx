import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Lock, Shield, AlertTriangle } from '@phosphor-icons/react'

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

export default function StatementLocking({ sessionData, currentPlayer, updateSessionData }: Props) {
  const [currentStatement, setCurrentStatement] = useState('')

  const handleLockStatement = () => {
    const updates = currentPlayer === 'player1' 
      ? { playerOneStatement: currentStatement.trim() }
      : { playerTwoStatement: currentStatement.trim() }
    
    updateSessionData(updates)
    setCurrentStatement('')

    // Check if both statements are locked and proceed to discussion phase
    const bothLocked = (currentPlayer === 'player1' ? true : !!sessionData.playerOneStatement) && 
                      (currentPlayer === 'player2' ? true : !!sessionData.playerTwoStatement)
    
    if (bothLocked) {
      updateSessionData({ phase: 'discussion' })
    }
  }

  const myStatement = currentPlayer === 'player1' ? sessionData.playerOneStatement : sessionData.playerTwoStatement
  const theirStatement = currentPlayer === 'player1' ? sessionData.playerTwoStatement : sessionData.playerOneStatement
  const canLock = !myStatement && currentStatement.trim()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={24} />
            Statement Locking: Carve Your Truth in Digital Stone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={20} className="text-primary" />
                <span className="font-medium">The Agreed Issue</span>
              </div>
              <p className="text-foreground">{sessionData.agreedIssue}</p>
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                Now that you've both demonstrated basic cognitive empathy, it's time for 
                <strong> Statement Locking</strong>. Write your personal, unadulterated truth about 
                this issue. Hit submit, and it's locked harder than Fort Knox.
              </p>
              <p className="flex items-center gap-2 text-orange-600 font-medium">
                <AlertTriangle size={16} />
                No edits. No "I didn't mean it like that." No rewriting history.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Player 1 Statement */}
        <Card className={currentPlayer === 'player1' ? 'ring-2 ring-primary/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Player 1's Statement</span>
              {currentPlayer === 'player1' && <Badge variant="secondary">You</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData.playerOneStatement ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted border-l-4 border-l-primary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                      LOCKED STATEMENT
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{sessionData.playerOneStatement}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <Shield size={16} className="mr-1" />
                  Statement Locked
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                {currentPlayer === 'player1' ? (
                  <>
                    <Textarea
                      value={currentStatement}
                      onChange={(e) => setCurrentStatement(e.target.value)}
                      placeholder="Write your definitive statement about this issue. This is your personal truth - your feelings, your perspective, your reasoning. Choose your words carefully because once locked, this becomes your official position."
                      className="min-h-40"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Be honest about your feelings and perspective</p>
                      <p>• Include your reasoning and what matters to you</p>
                      <p>• This will be your permanent position for this discussion</p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={!canLock}
                          className="w-full"
                          variant={canLock ? "default" : "secondary"}
                        >
                          <Lock size={16} className="mr-2" />
                          Lock Statement Forever
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle size={20} className="text-orange-500" />
                            Are You Absolutely Sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Once you lock this statement, it becomes your immutable truth for this session. 
                            No edits, no takebacks, no "I was emotional" excuses. This will be the 
                            bedrock of your position throughout the entire discussion.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-3 bg-muted rounded-lg my-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{currentStatement}</p>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Wait, Let Me Revise</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLockStatement}>
                            Yes, Lock It In
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for Player 1 to lock their statement...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player 2 Statement */}
        <Card className={currentPlayer === 'player2' ? 'ring-2 ring-primary/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Player 2's Statement</span>
              {currentPlayer === 'player2' && <Badge variant="secondary">You</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData.playerTwoStatement ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted border-l-4 border-l-primary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                      LOCKED STATEMENT
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{sessionData.playerTwoStatement}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <Shield size={16} className="mr-1" />
                  Statement Locked
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                {currentPlayer === 'player2' ? (
                  <>
                    <Textarea
                      value={currentStatement}
                      onChange={(e) => setCurrentStatement(e.target.value)}
                      placeholder="Write your definitive statement about this issue. This is your personal truth - your feelings, your perspective, your reasoning. Choose your words carefully because once locked, this becomes your official position."
                      className="min-h-40"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Be honest about your feelings and perspective</p>
                      <p>• Include your reasoning and what matters to you</p>
                      <p>• This will be your permanent position for this discussion</p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={!canLock}
                          className="w-full"
                          variant={canLock ? "default" : "secondary"}
                        >
                          <Lock size={16} className="mr-2" />
                          Lock Statement Forever
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle size={20} className="text-orange-500" />
                            Are You Absolutely Sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Once you lock this statement, it becomes your immutable truth for this session. 
                            No edits, no takebacks, no "I was emotional" excuses. This will be the 
                            bedrock of your position throughout the entire discussion.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-3 bg-muted rounded-lg my-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{currentStatement}</p>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Wait, Let Me Revise</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLockStatement}>
                            Yes, Lock It In
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for Player 2 to lock their statement...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Shield size={18} />
            Why Statement Locking Matters:
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Prevents gaslighting and "I never said that" nonsense</p>
            <p>• Creates accountability anchors for the discussion</p>
            <p>• Forces you to actually think about your position</p>
            <p>• Eliminates moving goalposts and narrative shifting</p>
            <p>• Makes inconsistencies obvious when they happen</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}