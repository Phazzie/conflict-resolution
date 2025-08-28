import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChatCircle, Robot, User, ArrowRight, Warning, Brain, Lightbulb } from '@phosphor-icons/react'
import { PhaseProps, Message, ManipulationTactic, AIAnalysis } from '../types/session'
import { validateMessageInput } from '../utils/validation'
import { aiAnalysisService } from '../services/aiAnalysis'
import { realTimeSessionService } from '../services/realTimeSession'

export default function DiscussionPhase({ sessionData, currentPlayer, updateSessionData }: PhaseProps) {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const [aiInterventionCount, setAiInterventionCount] = useState(0)
  const [participants, setParticipants] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [sessionData.messages])

  // Initialize real-time session if in multiplayer mode
  useEffect(() => {
    if (sessionData.isMultiplayer) {
      realTimeSessionService.initializeSession(
        sessionData.sessionId || 'default',
        currentPlayer,
        {
          onSessionUpdate: (updates) => updateSessionData(updates),
          onParticipantUpdate: setParticipants,
          onError: (error) => console.error('Real-time error:', error),
          onConnectionStatus: (connected) => console.log('Connection:', connected)
        }
      )
    }

    return () => {
      realTimeSessionService.disconnect()
    }
  }, [sessionData.isMultiplayer, sessionData.sessionId, currentPlayer])

  // Handle typing indicators
  const handleInputChange = (value: string) => {
    setCurrentMessage(value)
    setValidationError('')

    if (sessionData.isMultiplayer) {
      // Update typing status
      if (!isTyping && value.length > 0) {
        setIsTyping(true)
        realTimeSessionService.updateTypingStatus(true)
      } else if (isTyping && value.length === 0) {
        setIsTyping(false)
        realTimeSessionService.updateTypingStatus(false)
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to clear typing status
      if (value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
          realTimeSessionService.updateTypingStatus(false)
        }, 3000)
      }
    }
  }

  const sendMessage = async () => {
    const validation = validateMessageInput(currentMessage)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid message')
      return
    }
    
    setValidationError('')
    setIsAIAnalyzing(true)

    try {
      // Create message with AI analysis
      const messageContent = currentMessage.trim()
      
      // Get AI analysis for the message
      const aiAnalysis = await aiAnalysisService.analyzeMessage(
        messageContent,
        {
          previousMessages: sessionData.messages.map(m => m.content),
          agreedIssue: sessionData.agreedIssue,
          playerStatements: {
            player1: sessionData.playerOneStatement,
            player2: sessionData.playerTwoStatement
          },
          messageAuthor: currentPlayer
        }
      )

      const newMessage: Message = {
        id: Date.now().toString(),
        author: currentPlayer,
        content: messageContent,
        timestamp: Date.now(),
        aiAnalysis
      }

      const updatedMessages = [...sessionData.messages, newMessage]
      
      // Update via real-time service if multiplayer, otherwise local update
      if (sessionData.isMultiplayer) {
        await realTimeSessionService.sendMessage(newMessage)
      } else {
        updateSessionData({ messages: updatedMessages })
      }

      setCurrentMessage('')

      // Clear typing status
      if (isTyping) {
        setIsTyping(false)
        realTimeSessionService.updateTypingStatus(false)
      }

      // Generate AI intervention if needed
      const interventionText = await aiAnalysisService.generateIntervention(
        aiAnalysis.manipulationTactics,
        aiAnalysis.emotionalTone,
        messageContent
      )
      
      if (interventionText) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ai',
          content: interventionText,
          timestamp: Date.now()
        }
        
        // Send AI message
        if (sessionData.isMultiplayer) {
          await realTimeSessionService.sendMessage(aiMessage)
        } else {
          updateSessionData({ 
            messages: [...updatedMessages, aiMessage] 
          })
        }
        
        setAiInterventionCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setValidationError('Failed to send message. Please try again.')
    } finally {
      setIsAIAnalyzing(false)
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

  const renderManipulationTactics = (tactics: ManipulationTactic[]) => {
    if (!tactics.length) return null

    return (
      <div className="mt-2 space-y-1">
        {tactics.map((tactic, index) => (
          <Alert key={index} className="py-2">
            <Warning size={16} />
            <AlertDescription className="text-xs">
              <strong>Detected {tactic.type}:</strong> {tactic.description}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    )
  }

  const renderAISuggestions = (analysis: AIAnalysis) => {
    if (!analysis.suggestions.length) return null

    return (
      <div className="mt-2 space-y-1">
        {analysis.suggestions.slice(0, 2).map((suggestion, index) => (
          <div key={index} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-start gap-2">
              <Lightbulb size={12} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-900">{suggestion.content}</p>
                <p className="text-blue-700 mt-1">{suggestion.rationale}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const getToxicityColor = (score: number) => {
    if (score < 0.3) return 'text-green-600'
    if (score < 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const otherParticipantTyping = participants.find(p => p.playerId !== currentPlayer && p.isTyping)

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
                  <div key={message.id} className="space-y-2">
                    <div className={`flex items-start gap-3 ${
                      message.author === currentPlayer ? 'flex-row-reverse' : ''
                    }`}>
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
                        
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {message.author === 'ai' ? 'AI Referee' : 
                             message.author === currentPlayer ? 'You' : 'Them'}
                          </Badge>
                          <span>{formatTimestamp(message.timestamp)}</span>
                          
                          {/* Show toxicity score for user messages */}
                          {message.author !== 'ai' && message.aiAnalysis && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getToxicityColor(message.aiAnalysis.toxicityScore)}`}
                            >
                              <Brain size={10} className="mr-1" />
                              {Math.round(message.aiAnalysis.toxicityScore * 100)}% tension
                            </Badge>
                          )}
                        </div>

                        {/* AI Analysis Display */}
                        {message.author !== 'ai' && message.aiAnalysis && (
                          <div className={`mt-2 ${message.author === currentPlayer ? 'text-left' : ''}`}>
                            {/* Manipulation Tactics */}
                            {renderManipulationTactics(message.aiAnalysis.manipulationTactics)}
                            
                            {/* AI Suggestions */}
                            {message.author === currentPlayer && renderAISuggestions(message.aiAnalysis)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Other participant typing indicator */}
              {otherParticipantTyping && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <div className="inline-block p-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                        </div>
                        <span className="text-xs text-muted-foreground">typing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI analyzing indicator */}
              {isAIAnalyzing && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Robot size={16} />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <div className="inline-block p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="animate-pulse text-purple-600" />
                        <div className="text-sm">Analyzing communication patterns...</div>
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
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={sessionData.isMultiplayer ? 
                      "Type your message... (AI analyzing in real-time)" : 
                      "Type your message... (the AI is watching)"
                    }
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={isAIAnalyzing}
                  />
                  {validationError && (
                    <p className="text-sm text-destructive mt-1">{validationError}</p>
                  )}
                </div>
                <Button 
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isAIAnalyzing}
                >
                  {isAIAnalyzing ? 'Analyzing...' : 'Send'}
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