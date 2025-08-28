import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Target,
  History
} from '@phosphor-icons/react'
import { sessionHistoryService } from '../services/sessionHistory'
import { PatternRecognitionResult } from '../types/history'
import { SessionData } from '../types/session'

interface SessionPatternInsightsProps {
  currentSession: SessionData
}

export default function SessionPatternInsights({ currentSession }: SessionPatternInsightsProps) {
  const [patterns, setPatterns] = useState<PatternRecognitionResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  useEffect(() => {
    const analyzePatterns = async () => {
      try {
        setIsAnalyzing(true)
        const results = await sessionHistoryService.analyzeSessionPatterns(currentSession)
        setPatterns(results)
      } catch (error) {
        console.error('Failed to analyze session patterns:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    if (currentSession.agreedIssue) {
      analyzePatterns()
    }
  }, [currentSession])

  const getPatternTypeIcon = (type: string) => {
    switch (type) {
      case 'thematic': return <History size={16} className="text-blue-600" />
      case 'communication': return <Activity size={16} className="text-green-600" />
      case 'behavioral': return <Target size={16} className="text-purple-600" />
      case 'temporal': return <TrendingUp size={16} className="text-orange-600" />
      default: return <CheckCircle size={16} className="text-gray-600" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">
            Analyzing patterns from your relationship history...
          </span>
        </CardContent>
      </Card>
    )
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle size={48} className="mx-auto text-green-600 mb-3" />
            <p className="text-sm text-muted-foreground">
              No concerning patterns detected. This appears to be a fresh topic for you both.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={20} />
          Pattern Recognition Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patterns.map((pattern, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getPatternTypeIcon(pattern.patternType)}
                <h4 className="font-semibold capitalize">{pattern.patternType} Pattern</h4>
              </div>
              <Badge className={getConfidenceColor(pattern.confidence)}>
                {Math.round(pattern.confidence * 100)}% confidence
              </Badge>
            </div>

            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {pattern.description}
              </AlertDescription>
            </Alert>

            {pattern.evidence.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Evidence from your history:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {pattern.evidence.slice(0, 3).map((evidence, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      "{evidence}"
                    </li>
                  ))}
                  {pattern.evidence.length > 3 && (
                    <li className="text-xs italic">
                      ...and {pattern.evidence.length - 3} more instances
                    </li>
                  )}
                </ul>
              </div>
            )}

            {pattern.recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800 mb-2">Recommendations:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {pattern.recommendations.map((rec, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History size={14} />
            <span>
              Analysis based on {patterns.reduce((sum, p) => sum + p.evidence.length, 0)} historical data points
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}