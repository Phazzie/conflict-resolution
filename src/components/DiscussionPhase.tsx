import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChatCircle, Robot, User, ArrowRight, Warning, Brain, Lightbulb } from '@phosphor-icons/react'
import { PhaseProps, Message } from '../types/session'
import { validateMessageInput } from '../utils/validation'
import { aiAnalyzer, type AIAnalysisResult, type ConversationContext } from '../services/aiAnalyzer'
import { patternRecognitionService } from '../services/patternRecognition'
import SessionPatternInsights from './SessionPatternInsights'

function DiscussionPhase({ sessionData, currentPlayer, updateSessionData }: PhaseProps) {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const [aiInterventionCount, setAiInterventionCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [sessionData.messages, scrollToBottom])

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    setCurrentMessage(value)
    setValidationError('')
  }, [])

  const sendMessage = useCallback(async () => {
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
      
      // Prepare context for AI analysis
      const analysisContext: ConversationContext = {
        agreedIssue: sessionData.agreedIssue,
        playerOneStatement: sessionData.playerOneStatement,
        playerTwoStatement: sessionData.playerTwoStatement,
        currentMessage: messageContent,
        messageAuthor: currentPlayer,
        previousMessages: sessionData.messages.map(m => ({
          author: m.author,
          content: m.content,
          timestamp: m.timestamp
        }))
      }
      
      // Get AI analysis for the message
      const aiAnalysis = await aiAnalyzer.analyzeMessage(analysisContext)

      const newMessage: Message = {
        id: Date.now().toString(),
        author: currentPlayer,
        content: messageContent,
        timestamp: Date.now(),
        aiAnalysis
      }

      const updatedMessages = [...sessionData.messages, newMessage]
      
      // Update session data
      updateSessionData({ messages: updatedMessages })
      
      // Increment AI intervention count if manipulation detected
      if (aiAnalysis.hasManipulation) {
        setAiInterventionCount(prev => prev + 1)
      }
      
      setCurrentMessage('')

      // Generate AI intervention if manipulation detected
      if (aiAnalysis.hasManipulation && aiAnalysis.suggestion) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ai',
          content: aiAnalysis.suggestion,
          timestamp: Date.now() + 1
        }
        
        // Add AI message after a short delay for better UX
        setTimeout(() => {
          updateSessionData({ 
            messages: [...updatedMessages, aiMessage] 
          })
        }, 1000)
      }

      // Run pattern analysis on updated session data
      try {
        const updatedSessionData = { ...sessionData, messages: updatedMessages }
        const patternAnalysis = await patternRecognitionService.analyzeSession(updatedSessionData)
        
        // Update session with pattern analysis if significant patterns detected
        if (patternAnalysis.patterns.length > 0) {
          updateSessionData({
            patternAnalysis: {
              detectedPatterns: patternAnalysis.patterns.map(p => p.description),
              severity: patternAnalysis.riskLevel,
              recommendations: patternAnalysis.recommendations,
              analyzedAt: Date.now()
            }
          })
        }
      } catch (patternError) {
        console.error('Pattern analysis failed:', patternError)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setValidationError('Failed to send message. Please try again.')
    } finally {
      setIsAIAnalyzing(false)
    }
  }, [sessionData.agreedIssue, sessionData.playerOneStatement, sessionData.playerTwoStatement, sessionData.messages, currentPlayer, currentMessage, updateSessionData])

  const proposeResolution = useCallback(() => {
    updateSessionData({ phase: 'resolution' })
  }, [updateSessionData])

  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }, [])

  const renderManipulationTactics = useCallback((analysis: AIAnalysisResult) => {
    if (!analysis.hasManipulation || !analysis.detectedTactics.length) return null

    return (
      <div className="mt-2 space-y-1">
        {analysis.detectedTactics.map((tactic, index) => (
          <Alert key={index} className="py-2">
            <Warning size={16} />
            <AlertDescription className="text-xs">
              <strong>Detected {tactic.tactic}:</strong> {tactic.description}
              {tactic.suggestion && (
                <div className="mt-1 text-blue-600">
                  <strong>Suggestion:</strong> {tactic.suggestion}
                </div>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    )
  }, [])

  const renderAISuggestions = useCallback((analysis: AIAnalysisResult) => {
    if (!analysis.suggestion && !analysis.rephraseOption) return null

    return (
      <div className="mt-2 space-y-1">
        {analysis.suggestion && (
          <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-start gap-2">
              <Brain size={12} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-900 font-medium">AI Referee Says:</p>
                <p className="text-blue-700">{analysis.suggestion}</p>
              </div>
            </div>
          </div>
        )}
        {analysis.rephraseOption && (
          <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
            <div className="flex items-start gap-2">
              <Lightbulb size={12} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-900 font-medium">Try this instead:</p>
                <p className="text-green-700">{analysis.rephraseOption}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }, [])

  const getToneColor = useCallback((tone: string) => {
    switch (tone) {
      case 'constructive': return 'text-green-600'
      case 'defensive': return 'text-yellow-600'
      case 'aggressive': return 'text-orange-600'
      case 'manipulative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }, [])

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
            <div className="h-64 sm:h-96 overflow-y-auto p-4 space-y-3">
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
                      
                      <div className={`flex-1 max-w-xs sm:max-w-sm ${
                        message.author === currentPlayer ? 'text-right' : ''
                      }`}>
                        <div className={`inline-block p-3 rounded-lg text-sm sm:text-base ${
                          message.author === 'ai'
                            ? 'bg-purple-50 border border-purple-200'
                            : message.author === currentPlayer
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                        }`}>
                          <p>{message.content}</p>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {message.author === 'ai' ? 'AI Referee' : 
                             message.author === currentPlayer ? 'You' : 'Them'}
                          </Badge>
                          <span>{formatTimestamp(message.timestamp)}</span>
                          
                          {/* Show tone for user messages */}
                          {message.author !== 'ai' && message.aiAnalysis && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getToneColor(message.aiAnalysis.overallTone)}`}
                            >
                              <Brain size={10} className="mr-1" />
                              {message.aiAnalysis.overallTone}
                            </Badge>
                          )}
                        </div>

                        {/* AI Analysis Display */}
                        {message.author !== 'ai' && message.aiAnalysis && (
                          <div className={`mt-2 ${message.author === currentPlayer ? 'text-left' : ''}`}>
                            {/* Manipulation Tactics */}
                            {renderManipulationTactics(message.aiAnalysis)}
                            
                            {/* AI Suggestions */}
                            {message.author === currentPlayer && renderAISuggestions(message.aiAnalysis)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
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
            <div className="border-t p-3 sm:p-4">
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
                    className="text-base" // Prevents zoom on iOS
                  />
                  {validationError && (
                    <p className="text-sm text-destructive mt-1">{validationError}</p>
                  )}
                </div>
                <Button 
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isAIAnalyzing}
                  size="default" // Ensure adequate touch target
                >
                  {isAIAnalyzing ? 'Analyzing...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats and Resolution */}
          <div className="pt-4 border-t">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div className="text-sm text-muted-foreground">
                Messages: {sessionData.messages.length} • AI Interventions: {aiInterventionCount}
              </div>
              <Badge variant="outline" className="text-xs">
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
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <ArrowRight size={16} />
                Propose a Resolution
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Pattern Insights */}
      {sessionData.messages.length > 3 && (
        <div className="mt-6">
          <SessionPatternInsights currentSession={sessionData} />
        </div>
      )}

      {/* Real-time Pattern Detection */}
      {sessionData.patternAnalysis && sessionData.patternAnalysis.detectedPatterns.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain size={18} />
                Pattern Detection Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className={
                sessionData.patternAnalysis.severity === 'high' ? 'border-destructive bg-destructive/5' :
                sessionData.patternAnalysis.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/5' :
                'border-green-500 bg-green-500/5'
              }>
                <Brain size={16} />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">
                      Detected {sessionData.patternAnalysis.detectedPatterns.length} relationship pattern(s) 
                      <Badge variant="outline" className="ml-2">
                        {sessionData.patternAnalysis.severity} severity
                      </Badge>
                    </div>
                    <ul className="text-sm space-y-1">
                      {sessionData.patternAnalysis.detectedPatterns.slice(0, 3).map((pattern, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
                          {pattern}
                        </li>
                      ))}
                    </ul>
                    {sessionData.patternAnalysis.recommendations.length > 0 && (
                      <div className="pt-2 mt-2 border-t">
                        <div className="text-sm font-medium mb-1 flex items-center gap-1">
                          <Lightbulb size={12} />
                          Quick suggestion:
                        </div>
                        <div className="text-sm text-blue-600">
                          {sessionData.patternAnalysis.recommendations[0]}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default memo(DiscussionPhase)