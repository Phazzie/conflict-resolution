import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Brain, TrendUp, Download, RotateCcw, ChartLine, Target, Lightbulb } from '@phosphor-icons/react'
import { machineLearningService } from '../services/machineLearning'
import { toast } from 'sonner'

interface MLInsightsDashboardProps {
  onClose: () => void
  onExport: (data: string) => void
}

export default function MLInsightsDashboard({ onClose, onExport }: MLInsightsDashboardProps) {
  const [metrics, setMetrics] = useState(machineLearningService.getModelMetrics())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Refresh metrics periodically
    const interval = setInterval(() => {
      setMetrics(machineLearningService.getModelMetrics())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

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
    if (window.confirm('Are you sure you want to reset the ML model? This will lose all learned patterns.')) {
      setIsLoading(true)
      try {
        machineLearningService.resetModel()
        setMetrics(machineLearningService.getModelMetrics())
        toast.success('ML model has been reset')
      } catch (error) {
        console.error('Failed to reset ML model:', error)
        toast.error('Failed to reset ML model')
      } finally {
        setIsLoading(false)
      }
    }
  }

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
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartLine size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{metrics.trainingExamples}</div>
                <div className="text-sm text-muted-foreground">Training Examples</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendUp size={20} className="text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-green-600">
                  {metrics.lastUpdated.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div className="text-xs text-green-600">
                  {metrics.lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance */}
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

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={20} />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Training Data Insights */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Training Data Analysis</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {metrics.trainingExamples < 50 && (
                  <li>• Need more training examples for better accuracy (current: {metrics.trainingExamples})</li>
                )}
                {metrics.accuracy < 0.7 && (
                  <li>• Model accuracy could be improved with more diverse feedback</li>
                )}
                {Object.values(metrics.patternWeights).some(w => w < 0.3) && (
                  <li>• Some patterns have low weights - more examples needed</li>
                )}
                {metrics.version > 20 && metrics.accuracy > 0.8 && (
                  <li>• Model is performing well with good training diversity</li>
                )}
              </ul>
            </div>

            {/* Usage Tips */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Tips for Better Results</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Provide feedback on ML predictions during discussions</li>
                <li>• Use varied communication styles to train the model</li>
                <li>• Review patterns regularly to understand what's being detected</li>
                <li>• Export model data periodically for analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Model Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Advanced options for model maintenance and optimization
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleExportModel}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export Training Data
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setMetrics(machineLearningService.getModelMetrics())}
              className="flex items-center gap-2"
            >
              <TrendUp size={16} />
              Refresh Metrics
            </Button>

            <Button
              variant="destructive"
              onClick={handleResetModel}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              {isLoading ? 'Resetting...' : 'Reset Model'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <strong>Note:</strong> Resetting the model will remove all learned patterns and feedback. 
            Export your data first if you want to preserve training examples.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}