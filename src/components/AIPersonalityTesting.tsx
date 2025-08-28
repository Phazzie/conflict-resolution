import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { 
  TestTube, 
  Heart, 
  Brain, 
  Lightbulb, 
  ThumbsUp, 
  ThumbsDown,
  BarChart3,
  Users,
  Sparkles
} from '@phosphor-icons/react'
import { unifiedAIService, type ConversationContext } from '@/services/aiServiceUnified'
import { useKV } from '@github/spark/hooks'

interface AIPersonalityTestProps {
  onComplete?: (chosenPersonality: 'supportive' | 'neutral' | 'direct') => void
  className?: string
}

interface TestResult {
  personality: 'supportive' | 'neutral' | 'direct'
  response: string
  userRating?: number
  userFeedback?: string
  timestamp: number
}

interface ABTestData {
  userId: string
  testScenario: string
  results: TestResult[]
  completedAt?: number
  chosenPersonality?: 'supportive' | 'neutral' | 'direct'
}

const TEST_SCENARIOS = [
  {
    id: 'blame_shifting',
    trigger: "You always make everything about yourself and never listen to what I'm actually saying!",
    context: "The agreed issue is about household chores distribution",
    description: "Response to blame-shifting language"
  },
  {
    id: 'emotional_escalation',
    trigger: "I can't believe you're being so unreasonable about this! This is ridiculous!",
    context: "The agreed issue is about spending decisions",
    description: "Response to emotional escalation"
  },
  {
    id: 'stonewalling',
    trigger: "Whatever. I don't care anymore. Do what you want.",
    context: "The agreed issue is about communication patterns",
    description: "Response to stonewalling behavior"
  }
]

export default function AIPersonalityTesting({ onComplete, className }: AIPersonalityTestProps) {
  const [abTestData, setABTestData] = useKV<ABTestData[]>('ai-personality-tests', [])
  const [currentTest, setCurrentTest] = useState<ABTestData | null>(null)
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isGeneratingResponses, setIsGeneratingResponses] = useState(false)
  const [currentRating, setCurrentRating] = useState<number | null>(null)
  const [currentFeedback, setCurrentFeedback] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [chosenPersonality, setChosenPersonality] = useState<'supportive' | 'neutral' | 'direct' | null>(null)

  useEffect(() => {
    // Initialize a new test
    const newTest: ABTestData = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      testScenario: 'comprehensive',
      results: [],
    }
    setCurrentTest(newTest)
  }, [])

  const generateTestResponses = async (scenario: typeof TEST_SCENARIOS[0]) => {
    setIsGeneratingResponses(true)
    
    try {
      const mockContext: ConversationContext = {
        agreedIssue: scenario.context,
        playerOneStatement: "This is important to me because...",
        playerTwoStatement: "I feel like this affects us because...",
        currentMessage: scenario.trigger,
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [
          {
            author: 'player1',
            content: "I think we need to talk about this issue.",
            timestamp: Date.now() - 60000
          }
        ]
      }

      // Generate responses for all three personalities
      const personalityTests = await unifiedAIService.testPersonality(scenario.trigger, mockContext)

      const newResults: TestResult[] = [
        {
          personality: 'supportive',
          response: personalityTests.supportive.suggestion,
          timestamp: Date.now()
        },
        {
          personality: 'neutral', 
          response: personalityTests.neutral.suggestion,
          timestamp: Date.now()
        },
        {
          personality: 'direct',
          response: personalityTests.direct.suggestion,
          timestamp: Date.now()
        }
      ]

      setTestResults(newResults)
    } catch (error) {
      console.error('Failed to generate test responses:', error)
      // Fallback responses for testing
      setTestResults([
        {
          personality: 'supportive',
          response: "I can hear that you're feeling frustrated. It sounds like this issue is really important to you. Would you like to try rephrasing this in a way that focuses on your feelings?",
          timestamp: Date.now()
        },
        {
          personality: 'neutral',
          response: "This statement contains some generalizations that might not be helpful. Consider focusing on the specific issue rather than using absolute terms like 'always' and 'never'.",
          timestamp: Date.now()
        },
        {
          personality: 'direct',
          response: "Hold up there, champ. That statement has some blame Olympics vibes. How about we try focusing on the actual issue instead of who's more wrong?",
          timestamp: Date.now()
        }
      ])
    } finally {
      setIsGeneratingResponses(false)
    }
  }

  const handleStartTest = () => {
    const scenario = TEST_SCENARIOS[currentScenarioIndex]
    generateTestResponses(scenario)
  }

  const handleRateResponse = (personality: 'supportive' | 'neutral' | 'direct', rating: number) => {
    setTestResults(prev => prev.map(result => 
      result.personality === personality 
        ? { ...result, userRating: rating }
        : result
    ))
  }

  const handleFeedbackSubmit = (personality: 'supportive' | 'neutral' | 'direct', feedback: string) => {
    setTestResults(prev => prev.map(result => 
      result.personality === personality 
        ? { ...result, userFeedback: feedback }
        : result
    ))
  }

  const handleCompleteTest = () => {
    if (!currentTest || !chosenPersonality) return

    const completedTest: ABTestData = {
      ...currentTest,
      results: testResults,
      completedAt: Date.now(),
      chosenPersonality
    }

    setABTestData(prev => [...prev, completedTest])
    setShowResults(true)
    onComplete?.(chosenPersonality)
  }

  const getPersonalityIcon = (personality: 'supportive' | 'neutral' | 'direct') => {
    switch (personality) {
      case 'supportive': return Heart
      case 'neutral': return Brain
      case 'direct': return Lightbulb
    }
  }

  const getPersonalityColor = (personality: 'supportive' | 'neutral' | 'direct') => {
    switch (personality) {
      case 'supportive': return 'text-pink-500'
      case 'neutral': return 'text-blue-500'
      case 'direct': return 'text-amber-500'
    }
  }

  const getPersonalityName = (personality: 'supportive' | 'neutral' | 'direct') => {
    switch (personality) {
      case 'supportive': return 'Supportive & Gentle'
      case 'neutral': return 'Professional & Clear'
      case 'direct': return 'Direct & Witty'
    }
  }

  if (showResults) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={20} />
            Test Complete! Thank You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <BarChart3 size={16} />
            <AlertDescription>
              Your feedback helps us improve AI interactions for everyone. 
              The <strong>{getPersonalityName(chosenPersonality!)}</strong> personality 
              has been set as your default.
            </AlertDescription>
          </Alert>
          
          <div className="text-center">
            <p className="text-muted-foreground">
              You can always change this later in Settings.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (testResults.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube size={20} />
            AI Personality A/B Test
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Help us understand which AI communication style works best for you. 
            This helps improve the experience for everyone.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Users size={16} />
            <AlertDescription>
              <strong>Test Scenario:</strong> {TEST_SCENARIOS[currentScenarioIndex].description}
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Sample Message:</p>
            <p className="italic">"{TEST_SCENARIOS[currentScenarioIndex].trigger}"</p>
            <p className="text-sm text-muted-foreground mt-2">
              Context: {TEST_SCENARIOS[currentScenarioIndex].context}
            </p>
          </div>

          <Button 
            onClick={handleStartTest} 
            disabled={isGeneratingResponses}
            className="w-full"
          >
            {isGeneratingResponses ? 'Generating AI Responses...' : 'Start A/B Test'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube size={20} />
          Compare AI Responses
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Rate each response style. Which one would be most helpful during a conflict?
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {testResults.map((result) => {
          const IconComponent = getPersonalityIcon(result.personality)
          const colorClass = getPersonalityColor(result.personality)
          
          return (
            <div key={result.personality} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <IconComponent size={16} className={colorClass} />
                <Badge variant="outline">{getPersonalityName(result.personality)}</Badge>
              </div>
              
              <div className="bg-muted p-3 rounded mb-3">
                <p className="text-sm italic">"{result.response}"</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">How helpful is this response?</Label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={result.userRating === rating ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleRateResponse(result.personality, rating)}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Any feedback? (Optional)</Label>
                  <Textarea
                    placeholder="What did you like or dislike about this response?"
                    rows={2}
                    className="mt-1"
                    onChange={(e) => handleFeedbackSubmit(result.personality, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {testResults.every(r => r.userRating) && (
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-medium">Which style would you prefer as your default?</Label>
            <RadioGroup
              value={chosenPersonality || ''}
              onValueChange={(value) => setChosenPersonality(value as 'supportive' | 'neutral' | 'direct')}
            >
              {testResults.map((result) => {
                const IconComponent = getPersonalityIcon(result.personality)
                const colorClass = getPersonalityColor(result.personality)
                
                return (
                  <div key={result.personality} className="flex items-center space-x-2">
                    <RadioGroupItem value={result.personality} id={result.personality} />
                    <Label htmlFor={result.personality} className="flex items-center gap-2 cursor-pointer">
                      <IconComponent size={14} className={colorClass} />
                      {getPersonalityName(result.personality)}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
            
            <Button 
              onClick={handleCompleteTest}
              disabled={!chosenPersonality}
              className="w-full"
            >
              Complete Test & Save Preference
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}