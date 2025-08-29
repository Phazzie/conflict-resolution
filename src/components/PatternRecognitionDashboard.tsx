import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Clock,
  BarChart3,
  Lightbulb,
  ArrowRight,
  X
} from '@phosphor-icons/react'
import { SessionData } from '../types/session'
import { 
  PatternAnalysis, 
  RelationshipPattern, 
  patternRecognitionService 
} from '../services/patternRecognition'
import DemoFeatureWrapper from './DemoFeatureWrapper'

interface PatternRecognitionDashboardProps {
  currentSession?: SessionData
  onClose: () => void
}

export default function PatternRecognitionDashboard({ 
  currentSession, 
  onClose 
}: PatternRecognitionDashboardProps) {
  const [currentAnalysis, setCurrentAnalysis] = useState<PatternAnalysis | null>(null)
  const [historicalPatterns, setHistoricalPatterns] = useState<RelationshipPattern[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('current')

  useEffect(() => {
    loadHistoricalPatterns()
    if (currentSession) {
      analyzeCurrentSession()
    }
  }, [currentSession])

  const analyzeCurrentSession = async () => {
    if (!currentSession) return
    
    setIsAnalyzing(true)
    try {
      const analysis = await patternRecognitionService.analyzeSession(currentSession)
      setCurrentAnalysis(analysis)
    } catch (error) {
      console.error('Pattern analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const loadHistoricalPatterns = () => {
    const patterns = patternRecognitionService.getHistoricalPatterns()
    setHistoricalPatterns(patterns)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-destructive'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-muted-foreground'
    }
  }

  const PatternCard = ({ pattern }: { pattern: RelationshipPattern }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain size={18} />
            {pattern.description}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={getSeverityColor(pattern.severity)}>
              {pattern.severity}
            </Badge>
            {pattern.frequency > 1 && (
              <Badge variant="outline">
                {pattern.frequency}x
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pattern.examples.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Examples:</h4>
            <div className="space-y-1">
              {pattern.examples.map((example, idx) => (
                <div key={idx} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  "{example}"
                </div>
              ))}
            </div>
          </div>
        )}
        
        {pattern.suggestedActions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Lightbulb size={14} />
              Suggested Actions:
            </h4>
            <ul className="space-y-1">
              {pattern.suggestedActions.map((action, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <ArrowRight size={12} className="mt-1 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {pattern.frequency > 1 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            First detected: {new Date(pattern.firstDetected).toLocaleDateString()}
            {pattern.lastSeen !== pattern.firstDetected && (
              <> • Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const AnalysisOverview = ({ analysis }: { analysis: PatternAnalysis }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 size={20} />
          Session Analysis Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analysis.patterns.length}
            </div>
            <div className="text-sm text-muted-foreground">Patterns Detected</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getRiskLevelColor(analysis.riskLevel)}`}>
              {analysis.riskLevel.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground">Risk Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analysis.progressIndicators.length}
            </div>
            <div className="text-sm text-muted-foreground">Positive Signs</div>
          </div>
        </div>
        
        {analysis.insights.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Key Insights:</h4>
            <div className="space-y-2">
              {analysis.insights.map((insight, idx) => (
                <Alert key={idx}>
                  <AlertTriangle size={16} />
                  <AlertDescription>{insight}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
        
        {analysis.progressIndicators.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Progress Indicators:
            </h4>
            <ul className="space-y-1">
              {analysis.progressIndicators.map((indicator, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle size={12} className="mt-1 text-green-500 flex-shrink-0" />
                  {indicator}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const HistoricalTrends = () => {
    const patternTypes = historicalPatterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + pattern.frequency
      return acc
    }, {} as Record<string, number>)

    const mostCommonPattern = Object.entries(patternTypes)
      .sort(([,a], [,b]) => b - a)[0]

    return (
      <div className="space-y-4">
        {historicalPatterns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Brain size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No historical patterns detected yet. Complete a few more sessions to see trends.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  Pattern Frequency Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mostCommonPattern && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Most Common Pattern</span>
                      <Badge variant="secondary">{mostCommonPattern[1]}x</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mostCommonPattern[0].replace(/-/g, ' ').toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  {Object.entries(patternTypes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {type.replace(/-/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / Math.max(...Object.values(patternTypes))) * 100} 
                            className="w-24"
                          />
                          <span className="text-xs text-muted-foreground w-8">
                            {count}x
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock size={18} />
                Historical Patterns
              </h3>
              {historicalPatterns
                .sort((a, b) => b.frequency - a.frequency)
                .map((pattern) => (
                  <PatternCard key={pattern.id} pattern={pattern} />
                ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <DemoFeatureWrapper
      featureName="Relationship Pattern Recognition"
      type="demo"
      description="This feature demonstrates AI-powered pattern detection for relationship conflicts. Currently shows sample patterns to illustrate the concept. Real implementation would analyze actual conversation data to identify genuine recurring patterns."
      estimatedRelease="Q2 2024"
    >
      <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain size={24} />
            Relationship Pattern Recognition
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered analysis of recurring relationship dynamics and conflict patterns
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X size={16} className="mr-2" />
          Close
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Target size={16} />
            Current Session
          </TabsTrigger>
          <TabsTrigger value="historical" className="flex items-center gap-2">
            <TrendingUp size={16} />
            Historical Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {isAnalyzing ? (
            <Card>
              <CardContent className="text-center py-8">
                <Brain size={48} className="mx-auto text-primary mb-4 animate-pulse" />
                <p className="text-muted-foreground">
                  Analyzing relationship patterns...
                </p>
              </CardContent>
            </Card>
          ) : currentAnalysis ? (
            <>
              <AnalysisOverview analysis={currentAnalysis} />
              
              {currentAnalysis.patterns.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Detected Patterns</h3>
                  {currentAnalysis.patterns
                    .sort((a, b) => {
                      const severityOrder = { high: 3, medium: 2, low: 1 }
                      return severityOrder[b.severity as keyof typeof severityOrder] - 
                             severityOrder[a.severity as keyof typeof severityOrder]
                    })
                    .map((pattern) => (
                      <PatternCard key={pattern.id} pattern={pattern} />
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Concerning Patterns Detected</h3>
                    <p className="text-muted-foreground">
                      Your current session shows healthy conflict resolution patterns. Keep up the good work!
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {currentAnalysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb size={20} />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight size={16} className="mt-1 text-primary flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Current Session</h3>
                <p className="text-muted-foreground">
                  Start a session to analyze relationship patterns
                </p>
                {currentSession && (
                  <Button onClick={analyzeCurrentSession} className="mt-4">
                    Analyze Current Session
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historical">
          <HistoricalTrends />
        </TabsContent>
      </Tabs>
    </div>
    </DemoFeatureWrapper>
  )
}