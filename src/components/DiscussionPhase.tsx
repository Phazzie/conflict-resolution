import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChatCircle, Robot, User, ArrowRight, Warning, Brain, Lightbulb, ThumbsUp, ThumbsDown, TrendUp } from '@phosphor-icons/react'
import { PhaseProps, Message } from '../types/session'
import { validateMessageInput } from '../utils/validation'
import { aiAnalyzer, type AIAnalysisResult, type ConversationContext } from '../services/aiAnalyzer'
import { patternRecognitionService } from '../services/patternRecognition'
import { machineLearningService, PatternPrediction } from '../services/machineLearning'
import SessionPatternInsights from './SessionPatternInsights'
import { toast } from 'sonner'

function DiscussionPhase({ sessionData, currentPlayer, updateSessionData }: PhaseProps) {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const [aiInterventionCount, setAiInterventionCount] = useState(0)
  const [mlPredictions, setMlPredictions] = useState<PatternPrediction[]>([])
  const [showMLInsights, setShowMLInsights] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState<{
    messageIndex: number
    predictions: PatternPrediction[]
  } | null>(null)
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
        conflictContext: sessionData.conflictContext,
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

      // Get ML-powered pattern predictions
      const mlPredictions = await machineLearningService.predictPatterns(newMessage, {
        sessionData,
        messageIndex: sessionData.messages.length,
        previousMessages: sessionData.messages
      })

      // Add detected patterns to the message
      newMessage.detectedPatterns = mlPredictions.map(p => p.pattern)
      newMessage.mlConfidence = mlPredictions.length > 0 ? Math.max(...mlPredictions.map(p => p.confidence)) : 0

      const updatedMessages = [...sessionData.messages, newMessage]
      
      // Update session data
      updateSessionData({ messages: updatedMessages })
      
      // Store predictions for feedback
      if (mlPredictions.length > 0) {
        setPendingFeedback({
          messageIndex: updatedMessages.length - 1,
          predictions: mlPredictions
        })
        setMlPredictions(mlPredictions)
      }
      
      // Increment AI intervention count if manipulation detected
      if (aiAnalysis.hasManipulation || mlPredictions.length > 0) {
        setAiInterventionCount(prev => prev + 1)
      }
      
      setCurrentMessage('')

      // Generate AI intervention with ML-enhanced suggestions
      if ((aiAnalysis.hasManipulation && aiAnalysis.suggestion) || mlPredictions.length > 0) {
        let aiSuggestion = aiAnalysis.suggestion || ''
        
        // Enhance suggestion with ML predictions
        if (mlPredictions.length > 0) {
          const topPrediction = mlPredictions[0]
          if (topPrediction.suggestedResponse) {
            aiSuggestion = `${aiSuggestion}\n\nML-Enhanced Suggestion: ${topPrediction.suggestedResponse}`
          }
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ai',
          content: aiSuggestion,
          timestamp: Date.now() + 1,
          mlEnhanced: mlPredictions.length > 0
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

  // Handle ML feedback
  const handleMLFeedback = useCallback(async (
    feedback: 'correct' | 'incorrect' | 'partial',
    actualPatterns?: string[]
  ) => {
    if (!pendingFeedback) return
    
    try {
      const message = sessionData.messages[pendingFeedback.messageIndex]
      await machineLearningService.learnFromFeedback(
        message,
        pendingFeedback.predictions,
        feedback,
        actualPatterns
      )
      
      toast.success(`ML model updated with your feedback!`)
      setPendingFeedback(null)
      setMlPredictions([])
      
      // Get updated model metrics
      const metrics = machineLearningService.getModelMetrics()
      console.log('Updated ML model metrics:', metrics)
    } catch (error) {
      console.error('Failed to provide ML feedback:', error)
      toast.error('Failed to update ML model')
    }
  }, [pendingFeedback, sessionData.messages])

  const toggleMLInsights = useCallback(() => {
    setShowMLInsights(prev => !prev)
  }, [])

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

  // Render ML predictions for a message
  const renderMLPredictions = useCallback((message: Message) => {
    if (!message.detectedPatterns?.length) return null

    return (
      <div className="mt-2 space-y-1">
        {message.detectedPatterns.map((pattern, index) => (
          <div key={index} className="text-xs bg-purple-50 border border-purple-200 rounded p-2">
            <div className="flex items-start gap-2">
              <Brain size={12} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-purple-900 font-medium">
                    ML Detected: {pattern.replace('-', ' ')}
                  </p>
                  {message.mlConfidence && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(message.mlConfidence * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-purple-700 text-xs">
                  Machine learning analysis based on previous patterns
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }, [])

  // Render feedback request for ML predictions
  const renderMLFeedback = useCallback(() => {
    if (!pendingFeedback || mlPredictions.length === 0) return null

    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendUp size={20} className="text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-medium text-purple-900">Help Improve Pattern Detection</h4>
                <p className="text-sm text-purple-700">
                  Our ML model detected {mlPredictions.length} pattern(s). Was this accurate?
                </p>
              </div>
              
              <div className="space-y-2">
                {mlPredictions.map((prediction, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(prediction.confidence * 100)}%
                      </Badge>
                      {prediction.pattern.replace('-', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMLFeedback('correct')}
                        className="h-6 px-2 text-xs hover:bg-green-100"
                      >
                        <ThumbsUp size={12} className="mr-1" />
                        Correct
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMLFeedback('incorrect')}
                        className="h-6 px-2 text-xs hover:bg-red-100"
                      >
                        <ThumbsDown size={12} className="mr-1" />
                        Wrong
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMLFeedback('partial')}
                  className="text-xs"
                >
                  Partially Correct
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingFeedback(null)}
                  className="text-xs"
                >
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [pendingFeedback, mlPredictions, handleMLFeedback])

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
                        {message.author !== 'ai' && (message.aiAnalysis || message.detectedPatterns) && (
                          <div className={`mt-2 ${message.author === currentPlayer ? 'text-left' : ''}`}>
                            {/* ML Pattern Detection */}
                            {renderMLPredictions(message)}
                            
                            {/* Traditional AI Analysis */}
                            {message.aiAnalysis && (
                              <>
                                {/* Manipulation Tactics */}
                                {renderManipulationTactics(message.aiAnalysis)}
                                
                                {/* AI Suggestions */}
                                {message.author === currentPlayer && renderAISuggestions(message.aiAnalysis)}
                              </>
                            )}
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
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Messages: {sessionData.messages.length} • AI Interventions: {aiInterventionCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMLInsights}
                  className="text-xs"
                >
                  <TrendUp size={14} className="mr-1" />
                  ML Insights {showMLInsights ? '−' : '+'}
                </Button>
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

      {/* ML Feedback Request */}
      {renderMLFeedback()}

      {/* ML Insights Panel */}
      {showMLInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp size={20} />
              Machine Learning Insights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Our ML model is learning from your feedback to improve pattern detection accuracy
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const metrics = machineLearningService.getModelMetrics()
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold text-primary">v{metrics.version}</div>
                      <div className="text-xs text-muted-foreground">Model Version</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold text-green-600">
                        {Math.round(metrics.accuracy * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">{metrics.trainingExamples}</div>
                      <div className="text-xs text-muted-foreground">Training Examples</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xs font-semibold text-purple-600">
                        {metrics.lastUpdated.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Last Updated</div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Pattern Detection Weights</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {Object.entries(metrics.patternWeights).map(([pattern, weight]) => (
                        <div key={pattern} className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="capitalize">{pattern.replace('-', ' ')}</span>
                          <Badge variant="outline" className="text-xs">
                            {weight}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

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