import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Robot, Send, Flag, Lightbulb } from '@phosphor-icons/react'

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

export default function DiscussionPhase({ sessionData, currentPlayer, updateSessionData }: Props) {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isAiProcessing) return

    const newMessage = {
      id: Date.now().toString(),
      author: currentPlayer,
      content: currentMessage.trim(),
      timestamp: Date.now()
    }

    const updatedMessages = [...sessionData.messages, newMessage]
    updateSessionData({ messages: updatedMessages })
    setCurrentMessage('')

    // Trigger AI analysis
    setIsAiProcessing(true)
    try {
      const aiResponse = await getAIResponse(newMessage.content, sessionData)
      
      if (aiResponse) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          author: 'ai' as const,
          content: aiResponse,
          timestamp: Date.now()
        }
        
        updateSessionData({ 
          messages: [...updatedMessages, aiMessage] 
        })
      }
    } catch (error) {
      console.error('AI response error:', error)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const proposeResolution = () => {
    updateSessionData({ phase: 'resolution' })
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [sessionData.messages])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={24} />
            Moderated Discussion: Now You Can Argue (But Smartly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                The gloves are off. Type away, sling your carefully worded accusations. But here's 
                the kicker: our AI referee is watching, armed with a PhD in your particular brand 
                of bullshit and ready to call out manipulation tactics.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Player 1's Position</h4>
                <p className="text-xs text-muted-foreground">{sessionData.playerOneStatement}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Player 2's Position</h4>
                <p className="text-xs text-muted-foreground">{sessionData.playerTwoStatement}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-96 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {sessionData.messages.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No messages yet. Someone brave enough to go first?
                    </p>
                  )}
                  
                  {sessionData.messages.map((message, index) => (
                    <div key={message.id}>
                      <div className={`flex ${message.author === currentPlayer ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.author === 'ai'
                              ? 'bg-accent/10 border border-accent/20 mx-auto'
                              : message.author === currentPlayer
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.author === 'ai' ? (
                              <Robot size={16} className="text-accent" />
                            ) : (
                              <MessageSquare size={16} />
                            )}
                            <span className="text-xs font-medium">
                              {message.author === 'ai' 
                                ? 'AI Referee' 
                                : message.author === currentPlayer 
                                ? 'You' 
                                : `Player ${message.author === 'player1' ? '1' : '2'}`}
                            </span>
                            <span className="text-xs opacity-60">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                      
                      {index < sessionData.messages.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                  
                  {isAiProcessing && (
                    <div className="flex justify-center">
                      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <Robot size={16} className="text-accent animate-pulse" />
                          <span className="text-sm text-muted-foreground">AI is analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="space-y-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Express your thoughts, but remember - the AI is watching for BS..."
                  className="min-h-20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isAiProcessing}
                    size="sm"
                  >
                    <Send size={16} className="mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb size={20} />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={proposeResolution} className="w-full">
                Propose Resolution
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Ready to end this? Propose a way forward.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Robot size={18} />
                AI Referee Notes:
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Watching for blame-shifting and deflection</p>
                <p>• Detecting gaslighting attempts</p>
                <p>• Flagging stonewalling behavior</p>
                <p>• Identifying projection patterns</p>
                <p>• Suggesting constructive rephrasing</p>
                <p>• Calling out contradictions to locked statements</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

async function getAIResponse(message: string, sessionData: SessionData): Promise<string | null> {
  try {
    const prompt = spark.llmPrompt`
You are an AI referee in MixitFixit, a conflict resolution app. You have a dry, witty personality and extensive knowledge of manipulation tactics. 

Context:
- Agreed Issue: ${sessionData.agreedIssue}
- Player 1's Locked Statement: ${sessionData.playerOneStatement}
- Player 2's Locked Statement: ${sessionData.playerTwoStatement}
- Recent Message: "${message}"

Your job is to analyze this message and provide feedback if it contains:
1. Contradictions to their locked statement
2. Manipulation tactics (gaslighting, blame-shifting, projection, stonewalling)
3. Unproductive communication patterns
4. Opportunities for constructive rephrasing

If the message is constructive and doesn't have issues, don't respond. Only intervene when there's something worth addressing.

When you do respond, be:
- Dry and witty but not mean
- Specific about what you noticed
- Helpful with suggestions for improvement
- Brief (2-3 sentences max)

Examples of your tone:
- "Interesting pivot from your locked statement. Memory like a goldfish, or strategic amnesia?"
- "That's some impressive blame-shifting. Care to try addressing the actual point?"
- "I see we're going with the classic 'make them defensive' strategy. Bold. Ineffective, but bold."

Respond only if intervention is needed, otherwise return empty string.`

    const response = await spark.llm(prompt, 'gpt-4o-mini')
    return response.trim() || null
  } catch (error) {
    console.error('AI response error:', error)
    return null
  }
}