import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Brain, TrendUp, Download, RotateCcw, ChartLine, Target, Lightbulb, Clock, CheckCircle, XCircle, MinusCircle } from '@phosphor-icons/react'
import { machineLearningService } from '../services/machineLearning'
import { toast } from 'sonner'

interface AccuracyTrend {
  date: number
  accuracy: number
}

interface FeedbackDistribution {
  correct: number
  incorrect: number
  partial: number
}

interface MLInsightsDashboardProps {
  onClose: () => void
  onExport: (data: string) => void
}

export default function MLInsightsDashboard({ onClose, onExport }: MLInsightsDashboardProps) {
  const [metrics, setMetrics] = useState(machineLearningService.getModelMetrics())
  const [isLoading, setIsLoading] = useState(false)
  const [accuracyHistory, setAccuracyHistory] = useState<AccuracyTrend[]>([])
  const [feedbackStats, setFeedbackStats] = useState<FeedbackDistribution>({ correct: 0, incorrect: 0, partial: 0 })

  useEffect(() => {
    // Load extended metrics
    loadExtendedMetrics()
    
    // Refresh metrics periodically
    const interval = setInterval(() => {
      setMetrics(machineLearningService.getModelMetrics())
      loadExtendedMetrics()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadExtendedMetrics = () => {
    try {
      // Parse exported model data to get accuracy history and feedback stats
      const exportedData = JSON.parse(machineLearningService.exportModel())
      
      // Calculate accuracy history from training data
      if (exportedData.trainingData && exportedData.trainingData.length > 0) {
        const history = calculateAccuracyHistory(exportedData.trainingData)
        setAccuracyHistory(history)
        
        // Calculate feedback distribution
        const stats = exportedData.trainingData.reduce((acc: FeedbackDistribution, example: any) => {
          if (example.userFeedback === 'correct') acc.correct++
          else if (example.userFeedback === 'incorrect') acc.incorrect++
          else if (example.userFeedback === 'partial') acc.partial++
          return acc
        }, { correct: 0, incorrect: 0, partial: 0 })
        
        setFeedbackStats(stats)
      }
    } catch (error) {
      console.error('Failed to load extended metrics:', error)
    }
  }

  const calculateAccuracyHistory = (trainingData: any[]): AccuracyTrend[] => {
    const history: AccuracyTrend[] = []
    const batchSize = 10
    
    for (let i = batchSize; i <= trainingData.length; i += batchSize) {
      const batch = trainingData.slice(Math.max(0, i - batchSize), i)
      const correctCount = batch.filter((ex: any) => 
        ex.userFeedback === 'correct' || ex.userFeedback === 'partial'
      ).length
      
      history.push({
        date: Date.now() - (trainingData.length - i) * 1000 * 60 * 10, // Approximate timestamps
        accuracy: correctCount / batch.length
      })
    }
    
    return history.slice(-10) // Last 10 data points
  }

  const handleExportModel = () => {
    try {
      const modelData = machineLearningService.exportModel()
      onExport(modelData)
      toast.success('ML model exported successfully!')
    } catch (error) {
      console.error('Failed to export ML model:', error)
      toast.error('Failed to export ML model')
    }
  }

  const handleResetModel = async () => {
    if (window.confirm('Are you sure you want to reset the ML model? This will lose all learned patterns and training progress.')) {
      setIsLoading(true)
      try {
        machineLearningService.resetModel()
        setMetrics(machineLearningService.getModelMetrics())
        setAccuracyHistory([])
        setFeedbackStats({ correct: 0, incorrect: 0, partial: 0 })
        toast.success('ML model has been reset')
      } catch (error) {
        console.error('Failed to reset ML model:', error)
        toast.error('Failed to reset ML model')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getLearningProgressColor = (trainingExamples: number) => {
    if (trainingExamples >= 100) return 'text-green-600'
    if (trainingExamples >= 50) return 'text-blue-600'
    if (trainingExamples >= 20) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getLearningProgressBgColor = (trainingExamples: number) => {
    if (trainingExamples >= 100) return 'bg-green-100 border-green-200'
    if (trainingExamples >= 50) return 'bg-blue-100 border-blue-200'
    if (trainingExamples >= 20) return 'bg-yellow-100 border-yellow-200'
    return 'bg-gray-100 border-gray-200'
  }

  const totalFeedback = feedbackStats.correct + feedbackStats.incorrect + feedbackStats.partial
  const feedbackAccuracy = totalFeedback > 0 ? (feedbackStats.correct + feedbackStats.partial * 0.5) / totalFeedback : 0

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-green-600'
    if (accuracy >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'bg-green-100 border-green-200'
    if (accuracy >= 0.6) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain size={32} className="text-purple-600" />
            Machine Learning Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your AI-powered pattern detection system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportModel} size="sm">
            <Download size={16} className="mr-2" />
            Export Model
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            Back
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">v{metrics.version}</div>
                <div className="text-sm text-muted-foreground">Model Version</div>
                <div className="text-xs text-purple-600 mt-1">
                  {metrics.lastUpdated.toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getAccuracyBgColor(metrics.accuracy)}`}>
                <Target size={20} className={getAccuracyColor(metrics.accuracy)} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getAccuracyColor(metrics.accuracy)}`}>
                  {Math.round(metrics.accuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Current Accuracy</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {feedbackAccuracy > 0 ? `User feedback: ${Math.round(feedbackAccuracy * 100)}%` : 'No feedback yet'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getLearningProgressBgColor(metrics.trainingExamples)}`}>
                <ChartLine size={20} className={getLearningProgressColor(metrics.trainingExamples)} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getLearningProgressColor(metrics.trainingExamples)}`}>
                  {metrics.trainingExamples}
                </div>
                <div className="text-sm text-muted-foreground">Training Examples</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Target: 100+ examples
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock size={20} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-indigo-600">
                  {metrics.lastUpdated.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Last Training</div>
                <div className="text-xs text-indigo-600">
                  {metrics.lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp size={20} />
              Learning Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Model accuracy improvement over time
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {accuracyHistory.length > 0 ? (
              <div className="space-y-4">
                {/* Simple accuracy trend visualization */}
                <div className="grid grid-cols-5 gap-2">
                  {accuracyHistory.slice(-5).map((point, idx) => (
                    <div key={idx} className="text-center">
                      <div className="h-20 bg-muted rounded flex items-end justify-center p-1">
                        <div 
                          className={`w-full rounded-t ${
                            point.accuracy >= 0.8 ? 'bg-green-500' :
                            point.accuracy >= 0.6 ? 'bg-blue-500' :
                            point.accuracy >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ height: `${Math.max(point.accuracy * 100, 10)}%` }}
                        />
                      </div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        {Math.round(point.accuracy * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-center text-muted-foreground">
                  Last 5 training periods (each ~{Math.floor(metrics.trainingExamples / 5)} examples)
                </div>
                
                {/* Progress indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Training Progress</span>
                    <span className="font-medium">
                      {Math.round((metrics.trainingExamples / 100) * 100)}% to target
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.trainingExamples / 100) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ChartLine size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No training history yet</p>
                <p className="text-xs">Start providing feedback to see progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              User Feedback Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution of user feedback on AI predictions
            </p>
          </CardHeader>
          <CardContent>
            {totalFeedback > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{feedbackStats.correct}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                    <div className="text-xs text-green-600">
                      {Math.round((feedbackStats.correct / totalFeedback) * 100)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <MinusCircle size={16} className="text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-600">{feedbackStats.partial}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Partial</div>
                    <div className="text-xs text-yellow-600">
                      {Math.round((feedbackStats.partial / totalFeedback) * 100)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <XCircle size={16} className="text-red-600" />
                      <span className="text-2xl font-bold text-red-600">{feedbackStats.incorrect}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Incorrect</div>
                    <div className="text-xs text-red-600">
                      {Math.round((feedbackStats.incorrect / totalFeedback) * 100)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Overall Feedback Score</div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={feedbackAccuracy * 100} 
                      className={`h-3 flex-1 ${
                        feedbackAccuracy >= 0.8 ? '[&>div]:bg-green-500' :
                        feedbackAccuracy >= 0.6 ? '[&>div]:bg-blue-500' :
                        feedbackAccuracy >= 0.4 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                      }`}
                    />
                    <span className={`text-sm font-bold ${
                      feedbackAccuracy >= 0.8 ? 'text-green-600' :
                      feedbackAccuracy >= 0.6 ? 'text-blue-600' :
                      feedbackAccuracy >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(feedbackAccuracy * 100)}%
                    </span>
                  </div>
                </div>

                {feedbackAccuracy >= 0.8 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-green-900">Excellent Performance!</div>
                        <div className="text-green-700">
                          Model predictions are highly accurate. Keep providing feedback to maintain performance.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No feedback data yet</p>
                <p className="text-xs">Use the app and provide feedback to see analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Accuracy</span>
                <span className={`text-sm font-bold ${getAccuracyColor(metrics.accuracy)}`}>
                  {Math.round(metrics.accuracy * 100)}%
                </span>
              </div>
              <Progress 
                value={metrics.accuracy * 100} 
                className={`h-3 ${metrics.accuracy >= 0.8 ? '[&>div]:bg-green-500' : 
                                  metrics.accuracy >= 0.6 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
              />
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Performance Indicators</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between">
                  <span>Training Size</span>
                  <Badge variant="outline" className={
                    metrics.trainingExamples >= 100 ? 'border-green-500 text-green-700' :
                    metrics.trainingExamples >= 50 ? 'border-yellow-500 text-yellow-700' :
                    'border-red-500 text-red-700'
                  }>
                    {metrics.trainingExamples >= 100 ? 'Excellent' :
                     metrics.trainingExamples >= 50 ? 'Good' : 'Needs More Data'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Model Maturity</span>
                  <Badge variant="outline" className={
                    metrics.version >= 50 ? 'border-green-500 text-green-700' :
                    metrics.version >= 20 ? 'border-yellow-500 text-yellow-700' :
                    'border-blue-500 text-blue-700'
                  }>
                    {metrics.version >= 50 ? 'Mature' :
                     metrics.version >= 20 ? 'Developing' : 'Early'}
                  </Badge>
                </div>
              </div>
            </div>

            {metrics.accuracy < 0.5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-900">Improvement Needed</div>
                    <div className="text-yellow-700">
                      Model accuracy is below 50%. More user feedback is needed for better pattern detection.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pattern Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain size={20} />
              Pattern Detection Weights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Higher weights indicate stronger pattern recognition confidence
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.patternWeights).map(([pattern, weight]) => (
                <div key={pattern} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">
                      {pattern.replace('-', ' ')}
                    </span>
                    <Badge variant="outline" className={
                      weight >= 0.8 ? 'border-green-500 text-green-700' :
                      weight >= 0.5 ? 'border-blue-500 text-blue-700' :
                      'border-gray-400 text-gray-600'
                    }>
                      {weight.toFixed(2)}
                    </Badge>
                  </div>
                  <Progress 
                    value={weight * 100} 
                    className={`h-2 ${weight >= 0.8 ? '[&>div]:bg-green-500' : 
                                      weight >= 0.5 ? '[&>div]:bg-blue-500' : '[&>div]:bg-gray-400'}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={20} />
            AI Learning Insights & Performance Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed analysis of model performance and optimization recommendations
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Learning Stage Analysis */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Brain size={16} />
                Learning Stage Assessment
              </h4>
              <div className="space-y-2 text-sm text-blue-800">
                {metrics.trainingExamples < 10 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-red-500 text-red-700">Early</Badge>
                    <span>Model is in early learning stage. Accuracy may be inconsistent until more data is collected.</span>
                  </div>
                )}
                {metrics.trainingExamples >= 10 && metrics.trainingExamples < 50 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">Developing</Badge>
                    <span>Model is developing pattern recognition. {50 - metrics.trainingExamples} more examples needed for stability.</span>
                  </div>
                )}
                {metrics.trainingExamples >= 50 && metrics.trainingExamples < 100 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-blue-500 text-blue-700">Maturing</Badge>
                    <span>Model is maturing well. Accuracy should be more reliable. {100 - metrics.trainingExamples} examples to optimal performance.</span>
                  </div>
                )}
                {metrics.trainingExamples >= 100 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-green-500 text-green-700">Mature</Badge>
                    <span>Model has reached maturity with excellent training data diversity. Performance should be consistently high.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy Analysis */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Target size={16} />
                Accuracy Performance Analysis
              </h4>
              <div className="space-y-2 text-sm text-green-800">
                {metrics.accuracy >= 0.8 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 mt-0.5" />
                    <span>Excellent accuracy ({Math.round(metrics.accuracy * 100)}%). Model is performing at optimal levels.</span>
                  </div>
                )}
                {metrics.accuracy >= 0.6 && metrics.accuracy < 0.8 && (
                  <div className="flex items-start gap-2">
                    <MinusCircle size={16} className="text-blue-600 mt-0.5" />
                    <span>Good accuracy ({Math.round(metrics.accuracy * 100)}%). Model is reliable but has room for improvement.</span>
                  </div>
                )}
                {metrics.accuracy >= 0.4 && metrics.accuracy < 0.6 && (
                  <div className="flex items-start gap-2">
                    <XCircle size={16} className="text-yellow-600 mt-0.5" />
                    <span>Moderate accuracy ({Math.round(metrics.accuracy * 100)}%). More diverse training examples needed.</span>
                  </div>
                )}
                {metrics.accuracy < 0.4 && (
                  <div className="flex items-start gap-2">
                    <XCircle size={16} className="text-red-600 mt-0.5" />
                    <span>Low accuracy ({Math.round(metrics.accuracy * 100)}%). Model needs significant more training data and feedback.</span>
                  </div>
                )}
                
                {totalFeedback > 0 && (
                  <div className="flex items-start gap-2 mt-2">
                    <TrendUp size={16} className="text-green-600 mt-0.5" />
                    <span>User feedback score: {Math.round(feedbackAccuracy * 100)}% based on {totalFeedback} responses.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Optimization Recommendations */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <Lightbulb size={16} />
                Optimization Recommendations
              </h4>
              <ul className="text-sm text-purple-800 space-y-1">
                {metrics.trainingExamples < 50 && (
                  <li>• Prioritize collecting more training examples through active use and feedback</li>
                )}
                {Object.values(metrics.patternWeights).some(w => w < 0.3) && (
                  <li>• Some patterns have low confidence weights - provide targeted examples for weak patterns</li>
                )}
                {totalFeedback > 0 && feedbackAccuracy < 0.7 && (
                  <li>• Consider reviewing feedback quality - ensure accurate pattern labeling for better learning</li>
                )}
                {metrics.accuracy < 0.7 && metrics.trainingExamples >= 50 && (
                  <li>• Model accuracy is below target despite sufficient data - consider resetting and retraining</li>
                )}
                {accuracyHistory.length > 3 && accuracyHistory.slice(-3).every((point, idx, arr) => 
                  idx === 0 || point.accuracy <= arr[idx - 1].accuracy
                ) && (
                  <li>• Accuracy has been declining - review recent training examples for quality issues</li>
                )}
                <li>• Export model data regularly for external analysis and backup</li>
                <li>• Provide consistent feedback to maintain and improve model performance</li>
              </ul>
            </div>

            {/* Learning Progress Insights */}
            {accuracyHistory.length > 0 && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
                  <ChartLine size={16} />
                  Learning Progress Insights
                </h4>
                <div className="space-y-2 text-sm text-indigo-800">
                  {(() => {
                    const recent = accuracyHistory.slice(-3)
                    const isImproving = recent.length > 1 && recent[recent.length - 1].accuracy > recent[0].accuracy
                    const isStable = recent.length > 2 && Math.abs(recent[recent.length - 1].accuracy - recent[0].accuracy) < 0.1
                    
                    return (
                      <>
                        {isImproving && (
                          <div>• Model accuracy is trending upward - excellent learning progress!</div>
                        )}
                        {isStable && !isImproving && (
                          <div>• Model performance is stable - consistent but may benefit from new data types</div>
                        )}
                        {!isImproving && !isStable && (
                          <div>• Model accuracy is fluctuating - may need more consistent training examples</div>
                        )}
                        <div>• Training velocity: ~{Math.floor(metrics.trainingExamples / Math.max(metrics.version, 1))} examples per version</div>
                        <div>• Current learning phase: {
                          metrics.accuracy > 0.8 ? 'Optimization & Maintenance' :
                          metrics.accuracy > 0.6 ? 'Active Learning & Improvement' :
                          metrics.accuracy > 0.4 ? 'Rapid Learning & Pattern Discovery' :
                          'Initial Training & Foundation Building'
                        }</div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Model Management */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Model Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive tools for model optimization, monitoring, and maintenance
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Summary */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Brain size={16} />
              Model Health Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className={`text-lg font-bold ${getLearningProgressColor(metrics.trainingExamples)}`}>
                  {metrics.trainingExamples >= 100 ? 'Excellent' :
                   metrics.trainingExamples >= 50 ? 'Good' :
                   metrics.trainingExamples >= 20 ? 'Fair' : 'Poor'}
                </div>
                <div className="text-muted-foreground">Training Data</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${getAccuracyColor(metrics.accuracy)}`}>
                  {metrics.accuracy >= 0.8 ? 'Excellent' :
                   metrics.accuracy >= 0.6 ? 'Good' :
                   metrics.accuracy >= 0.4 ? 'Fair' : 'Poor'}
                </div>
                <div className="text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  totalFeedback >= 50 ? 'text-green-600' :
                  totalFeedback >= 20 ? 'text-blue-600' :
                  totalFeedback >= 5 ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {totalFeedback >= 50 ? 'High' :
                   totalFeedback >= 20 ? 'Medium' :
                   totalFeedback >= 5 ? 'Low' : 'None'}
                </div>
                <div className="text-muted-foreground">User Engagement</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  metrics.version >= 50 ? 'text-green-600' :
                  metrics.version >= 20 ? 'text-blue-600' :
                  metrics.version >= 5 ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {metrics.version >= 50 ? 'Mature' :
                   metrics.version >= 20 ? 'Stable' :
                   metrics.version >= 5 ? 'Growing' : 'New'}
                </div>
                <div className="text-muted-foreground">Model Maturity</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h5 className="font-medium text-sm">Data Management</h5>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleExportModel}
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <Download size={16} />
                  Export Complete Model Data
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setMetrics(machineLearningService.getModelMetrics())}
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <TrendUp size={16} />
                  Refresh All Metrics
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-sm">Model Operations</h5>
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  onClick={handleResetModel}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <RotateCcw size={16} />
                  {isLoading ? 'Resetting Model...' : 'Reset & Restart Training'}
                </Button>
                
                <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                  <strong>Caution:</strong> Reset removes all learned patterns and progress data.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
              <div>
                <strong>Last Training:</strong><br />
                {metrics.lastUpdated.toLocaleDateString()} at {metrics.lastUpdated.toLocaleTimeString()}
              </div>
              <div>
                <strong>Data Retention:</strong><br />
                {Math.min(metrics.trainingExamples, 1000)}/1000 examples
              </div>
              <div>
                <strong>Pattern Coverage:</strong><br />
                {Object.keys(metrics.patternWeights).length} patterns tracked
              </div>
              <div>
                <strong>Feedback Rate:</strong><br />
                {totalFeedback > 0 ? `${Math.round((totalFeedback / metrics.trainingExamples) * 100)}%` : '0%'} of examples
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}