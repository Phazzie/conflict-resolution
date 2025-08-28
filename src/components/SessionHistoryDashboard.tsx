import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Calendar, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  BarChart3,
  Download,
  Trash2
} from '@phosphor-icons/react'
import { sessionHistoryService } from '../services/sessionHistory'
import { HistoryAnalytics, RelationshipPattern, RecurringIssue } from '../types/history'
import { SessionData } from '../types/session'
import { toast } from 'sonner'

interface SessionHistoryDashboardProps {
  currentSession?: SessionData
  onClose: () => void
  onExport: (data: string) => void
}

export default function SessionHistoryDashboard({ 
  currentSession, 
  onClose, 
  onExport 
}: SessionHistoryDashboardProps) {
  const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const data = await sessionHistoryService.generateHistoryAnalytics()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load session history analytics:', error)
      toast.error('Failed to load session history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportHistory = async () => {
    try {
      const historyData = await sessionHistoryService.exportHistory()
      onExport(historyData)
      toast.success('Session history exported successfully')
    } catch (error) {
      console.error('Failed to export history:', error)
      toast.error('Failed to export session history')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Are you sure? This will permanently delete all session history. This cannot be undone.')) {
      return
    }

    try {
      await sessionHistoryService.clearHistory()
      await loadAnalytics()
      toast.success('Session history cleared')
    } catch (error) {
      console.error('Failed to clear history:', error)
      toast.error('Failed to clear session history')
    }
  }

  const formatDuration = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving': return <TrendingUp size={16} className="text-green-600" />
      case 'worsening': return <TrendingDown size={16} className="text-red-600" />
      default: return <Activity size={16} className="text-blue-600" />
    }
  }

  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'concerning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">
              Analyzing relationship patterns...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Session History</h1>
            <Button variant="outline" onClick={onClose}>
              Back to Session
            </Button>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={24} />
                No Session History Yet
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-6">
                Complete a few sessions to start seeing patterns and insights about your relationship dynamics.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Pattern Recognition</p>
                    <p className="text-sm text-muted-foreground">Identify recurring issues and communication patterns</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <TrendingUp size={20} className="text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Progress Tracking</p>
                    <p className="text-sm text-muted-foreground">Monitor improvement in conflict resolution over time</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Target size={20} className="text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Personalized Insights</p>
                    <p className="text-sm text-muted-foreground">Get tailored recommendations for your relationship</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Session History & Insights</h1>
              <p className="text-muted-foreground">
                {analytics.totalSessions} sessions analyzed • Since {formatDate(analytics.dateRange.first)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportHistory}>
                <Download size={16} className="mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearHistory}>
                <Trash2 size={16} className="mr-1" />
                Clear History
              </Button>
              <Button variant="default" onClick={onClose}>
                Back to Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Relationship Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={20} />
                  Relationship Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getHealthColor(analytics.insights.overallHealth)}`}>
                      {analytics.insights.overallHealth.toUpperCase()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Overall Health</p>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(analytics.progressMetrics.resolutionRate)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics.progressMetrics.streaks.current}
                    </div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics.recurringIssues.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Recurring Issues</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users size={20} />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Message Length</span>
                      <span className="font-medium">{Math.round(analytics.communicationMetrics.messageLength)} chars</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Positive Tone</span>
                      <span className="font-medium">{Math.round(analytics.communicationMetrics.emotionalTone.positive)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Steel-Manning Accuracy</span>
                      <span className="font-medium">{Math.round(analytics.communicationMetrics.steelManningAccuracy)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target size={20} />
                    Success Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions Completed</span>
                      <span className="font-medium">{Math.round(analytics.progressMetrics.sessionCompletionRate)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Consensus Reached</span>
                      <span className="font-medium">{Math.round(analytics.progressMetrics.consensusRate)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Satisfaction</span>
                      <span className="font-medium">{analytics.progressMetrics.averageSatisfaction.toFixed(1)}/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 size={20} />
                    AI Assistance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Intervention Effectiveness</span>
                      <span className="font-medium">{Math.round(analytics.communicationMetrics.aiInterventionEffectiveness)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Manipulation Detected</span>
                      <span className="font-medium">{analytics.communicationMetrics.manipulationTactics.length} types</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Progress Trend</span>
                      <span className="flex items-center gap-1 font-medium">
                        {getTrendIcon(analytics.progressMetrics.improvementTrend)}
                        {analytics.progressMetrics.improvementTrend}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions Summary */}
            {analytics.timeBasedAnalysis.weeklyTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.timeBasedAnalysis.weeklyTrends.slice(-4).map((week, index) => (
                      <div key={week.week} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-muted-foreground" />
                          <div>
                            <p className="font-medium">{week.week}</p>
                            <p className="text-sm text-muted-foreground">{week.sessionsCount} sessions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{Math.round(week.resolutionRate)}% resolved</p>
                          <p className="text-sm text-muted-foreground">
                            {week.averageSatisfaction.toFixed(1)}/5 satisfaction
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            {/* Relationship Patterns */}
            {analytics.relationshipPatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity size={20} />
                    Identified Relationship Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.relationshipPatterns.map((pattern, index) => (
                      <div key={pattern.patternId} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{pattern.name}</h3>
                              <Badge className={getSeverityColor(pattern.severity)}>
                                {pattern.severity}
                              </Badge>
                              {getTrendIcon(pattern.trend)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {pattern.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Frequency: {pattern.frequency}</span>
                              <span>Last seen: {formatDate(pattern.lastOccurrence)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {pattern.examples.length > 0 && (
                          <div className="mt-3 p-3 bg-muted/30 rounded">
                            <p className="text-sm font-medium mb-2">Recent Examples:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pattern.examples.slice(0, 3).map((example, idx) => (
                                <li key={idx} className="list-disc list-inside">
                                  "{example}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recurring Issues */}
            {analytics.recurringIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Recurring Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recurringIssues.map((issue, index) => (
                      <div key={issue.issueId} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">"{issue.normalizedIssue}"</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Frequency:</span>
                                <p className="font-medium">{issue.frequency} times</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Resolution Rate:</span>
                                <p className="font-medium">{Math.round(issue.resolutionRate * 100)}%</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Avg Duration:</span>
                                <p className="font-medium">{formatDuration(issue.averageDuration)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Discussed:</span>
                                <p className="font-medium">{formatDate(issue.lastDiscussed)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {issue.patterns.successfulResolutions.length > 0 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm font-medium text-green-800 mb-2">Successful Resolutions:</p>
                            <ul className="text-sm text-green-700 space-y-1">
                              {issue.patterns.successfulResolutions.slice(0, 2).map((resolution, idx) => (
                                <li key={idx} className="list-disc list-inside">
                                  "{resolution.substring(0, 100)}..."
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manipulation Tactics */}
            {analytics.communicationMetrics.manipulationTactics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Communication Patterns to Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.communicationMetrics.manipulationTactics.map((tactic, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{tactic.tactic.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                          {getTrendIcon(tactic.trend)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Detected {tactic.frequency} times</span>
                          <span className="capitalize">{tactic.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Resolution Success Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(analytics.progressMetrics.resolutionRate)}%
                      </span>
                    </div>
                    <Progress value={analytics.progressMetrics.resolutionRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Session Completion Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(analytics.progressMetrics.sessionCompletionRate)}%
                      </span>
                    </div>
                    <Progress value={analytics.progressMetrics.sessionCompletionRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Consensus Achievement Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(analytics.progressMetrics.consensusRate)}%
                      </span>
                    </div>
                    <Progress value={analytics.progressMetrics.consensusRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Satisfaction</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics.progressMetrics.averageSatisfaction.toFixed(1)}/5.0
                      </span>
                    </div>
                    <Progress value={(analytics.progressMetrics.averageSatisfaction / 5) * 100} className="h-2" />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={20} className="text-primary" />
                      <span className="font-medium">Current Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {analytics.progressMetrics.streaks.current}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      consecutive {analytics.progressMetrics.streaks.type}s
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={20} className="text-green-600" />
                      <span className="font-medium">Best Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.progressMetrics.streaks.best}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {analytics.progressMetrics.streaks.type}s in a row
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getTrendIcon(analytics.progressMetrics.improvementTrend)}
                      <span className="font-medium">Trend</span>
                    </div>
                    <p className="text-lg font-bold capitalize">
                      {analytics.progressMetrics.improvementTrend}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      overall trajectory
                    </p>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trends */}
            {analytics.timeBasedAnalysis.weeklyTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {analytics.timeBasedAnalysis.weeklyTrends.slice(-8).map((week, index) => (
                        <div key={week.week} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-muted-foreground" />
                            <div>
                              <p className="font-medium">{week.week}</p>
                              <p className="text-sm text-muted-foreground">
                                {week.sessionsCount} session{week.sessionsCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{Math.round(week.resolutionRate)}% resolved</p>
                            <p className="text-sm text-muted-foreground">
                              {week.averageSatisfaction.toFixed(1)}/5 satisfaction
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Relationship Health Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={20} />
                  Relationship Health Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className={`inline-flex px-6 py-3 rounded-full text-lg font-bold ${getHealthColor(analytics.insights.overallHealth)}`}>
                    {analytics.insights.overallHealth.toUpperCase()}
                  </div>
                  <p className="text-muted-foreground mt-2">Overall Health Status</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strength Areas */}
                  {analytics.insights.strengthAreas.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                        <CheckCircle size={20} />
                        Strength Areas
                      </h3>
                      <ul className="space-y-2">
                        {analytics.insights.strengthAreas.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Growth Areas */}
                  {analytics.insights.growthAreas.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                        <Target size={20} />
                        Growth Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {analytics.insights.growthAreas.map((growth, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Target size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            {growth}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {analytics.insights.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} />
                    Personalized Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.insights.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold flex-1">{rec.action}</h4>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 
                                        rec.priority === 'medium' ? 'default' : 'secondary'}>
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.reasoning}</p>
                        <p className="text-sm font-medium text-primary">{rec.expectedImpact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Factors */}
            {analytics.insights.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Risk Factors to Monitor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.insights.riskFactors.map((risk, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold flex-1">{risk.factor}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(risk.severity)}>
                              {risk.severity}
                            </Badge>
                            {getTrendIcon(risk.trend)}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Suggested Interventions:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {risk.interventions.map((intervention, idx) => (
                              <li key={idx} className="list-disc list-inside">
                                {intervention}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Seasonal Patterns */}
            {analytics.timeBasedAnalysis.seasonalTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analytics.timeBasedAnalysis.seasonalTrends.map((season) => (
                      <div key={season.season} className="text-center p-4 border rounded-lg">
                        <h4 className="font-semibold capitalize mb-2">{season.season}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            {season.conflictFrequency} conflicts
                          </p>
                          <p className="font-medium">
                            {Math.round(season.resolutionSuccess)}% resolved
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Patterns */}
            {analytics.timeBasedAnalysis.monthlyPatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {analytics.timeBasedAnalysis.monthlyPatterns.slice(-6).map((month) => (
                        <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium">{month.month}</p>
                            <p className="text-sm text-muted-foreground">
                              Common issues: {month.commonIssues.join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{Math.round(month.progressScore)}%</p>
                            <p className="text-sm text-muted-foreground">progress score</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Time-based Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Temporal Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.dateRange.first && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span className="font-medium">Relationship Journey</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {Math.round((Date.now() - analytics.dateRange.first) / (1000 * 60 * 60 * 24))} days
                        </p>
                        <p className="text-sm text-muted-foreground">of structured conversations</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span className="font-medium">Most Active Period</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {analytics.timeBasedAnalysis.weeklyTrends.length > 0 ? 
                          analytics.timeBasedAnalysis.weeklyTrends
                            .reduce((max, week) => week.sessionsCount > max.sessionsCount ? week : max)
                            .week
                          : 'N/A'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">most sessions completed</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} />
                      <span className="font-medium">Success Momentum</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium capitalize">
                        {analytics.progressMetrics.improvementTrend}
                      </p>
                      <p className="text-sm text-muted-foreground">overall trajectory</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}