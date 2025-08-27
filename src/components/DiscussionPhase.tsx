import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChatCircle, Robot, User, ArrowRight } from '@phosphor-icons/react'
import { PhaseProps, Message } from '../types/session'
import { validateMessageInput } from '../utils/validation'
import { aiService } from '../utils/aiService'

export default function DiscussionPhase({ sessionData, currentPlayer, updateSessionData }: PhaseProps) {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const [aiInterventionCount, setAiInterventionCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [sessionData.messages])

  const sendMessage = async () => {
    const validation = validateMessageInput(currentMessage)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid message')
      return
    }
    
    setValidationError('')

    const newMessage: Message = {
      id: Date.now().toString(),
      author: currentPlayer,
      content: currentMessage.trim(),
      timestamp: Date.now()
    }

    const updatedMessages = [...sessionData.messages, newMessage]
    updateSessionData({ messages: updatedMessages })
    setCurrentMessage('')

    // AI intervention using the new service
    setIsAIThinking(true)
    
    try {
      const aiResponse = await aiService.generateIntervention({
        currentMessage: newMessage.content,
        messageHistory: sessionData.messages,
        agreedIssue: sessionData.agreedIssue,
        playerOneStatement: sessionData.playerOneStatement,
        playerTwoStatement: sessionData.playerTwoStatement,
        currentPlayer
      })
      
      if (aiResponse && aiResponse.intervention) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ai',
          content: aiResponse.intervention,
          timestamp: Date.now()
        }
        
        updateSessionData({ 
          messages: [...updatedMessages, aiMessage] 
        })
        
        setAiInterventionCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('AI response error:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  const proposeResolution = () => {
    updateSessionData({ phase: 'resolution' })
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatCircle size={24} />
            Moderated Discussion: Now You Can Argue (But Smartly)
          </CardTitle>
          <p className="text-muted-foreground">
            Chat away, but remember - our AI referee is watching and will call out your BS. 
            Try to stay focused on the actual issue.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Context Cards */}
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="p-3 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-1">The Issue</h4>
              <p className="text-muted-foreground">{sessionData.agreedIssue}</p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-1">Your Locked Statement</h4>
              <p className="text-muted-foreground">
                {currentPlayer === 'player1' ? sessionData.playerOneStatement : sessionData.playerTwoStatement}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="border rounded-lg">
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {sessionData.messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <ChatCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Time to break the ice... carefully.</p>
                </div>
              ) : (
                sessionData.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.author === currentPlayer ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.author === 'ai' 
                        ? 'bg-purple-100 text-purple-600'
                        : message.author === currentPlayer
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {message.author === 'ai' ? (
                        <Robot size={16} />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    
                    <div className={`flex-1 max-w-sm ${
                      message.author === currentPlayer ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.author === 'ai'
                          ? 'bg-purple-50 border border-purple-200'
                          : message.author === currentPlayer
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {message.author === 'ai' ? 'AI Referee' : 
                           message.author === currentPlayer ? 'You' : 'Them'}
                        </Badge>
                        <span>{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isAIThinking && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Robot size={16} />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <div className="inline-block p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse text-sm">AI is analyzing your latest attempt at communication...</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={currentMessage}
                    onChange={(e) => {
                      setCurrentMessage(e.target.value)
                      setValidationError('')
                    }}
                    placeholder="Type your message... (the AI is watching)"
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isAIThinking}
                  />
                  {validationError && (
                    <p className="text-sm text-destructive mt-1">{validationError}</p>
                  )}
                </div>
                <Button 
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isAIThinking}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          {/* Stats and Resolution */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Messages: {sessionData.messages.length} • AI Interventions: {aiInterventionCount}
              </div>
              <Badge variant="outline">
                {sessionData.messages.length < 6 ? 'Getting Started' : 
                 sessionData.messages.length < 20 ? 'Making Progress' : 
                 'Deep Discussion'}
              </Badge>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Feeling like you've made some progress? Ready to propose a resolution?
              </p>
              <Button 
                onClick={proposeResolution}
                variant="default"
                className="flex items-center gap-2"
              >
                <ArrowRight size={16} />
                Propose a Resolution
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}