import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ChartBar, 
  TrendUp, 
  TrendDown, 
  Warning, 
  CheckCircle, 
  Brain,
  Users,
  Clock,
  Target,
  Download
} from '@phosphor-icons/react'
import { analyticsService } from '@/services/analytics'

interface AnalyticsDashboardProps {
  onExport?: (data: string) => void
}

export default function AnalyticsDashboard({ onExport }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    loadDashboardData()
  }, [selectedTimeframe])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const data = analyticsService.generateDashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (dashboardData && onExport) {
      const exportData = JSON.stringify({
        generatedAt: new Date().toISOString(),
        timeframe: selectedTimeframe,
        ...dashboardData
      }, null, 2)
      onExport(exportData)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!dashboardData || dashboardData.totalSessions === 0) {
    return (
      <div className="text-center py-12 animate-in fade-in-50 duration-500">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <ChartBar size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Analytics Data Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start a few sessions to see insights and patterns in conflict resolution.
        </p>
        <p className="text-sm text-muted-foreground">
          Once you've completed some sessions, you'll see metrics on manipulation detection,
          emotional trends, and resolution success rates.
        </p>
      </div>
    )
  }

  const {
    totalSessions,
    averageSuccessRate,
    commonManipulationTactics,
    emotionalTrends,
    improvementMetrics
  } = dashboardData

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ChartBar size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Conflict Resolution Analytics</h2>
            <p className="text-muted-foreground">Insights from your digital thunderdome battles</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as typeof selectedTimeframe)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value=\"week\">Last Week</option>
            <option value=\"month\">Last Month</option>
            <option value=\"all\">All Time</option>
          </select>
          
          <Button variant=\"outline\" size=\"sm\" onClick={handleExport}>
            <Download size={16} className=\"mr-2\" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{(averageSuccessRate * 100).toFixed(0)}%</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={averageSuccessRate * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(improvementMetrics.averageTimeToResolution / 60000)}m
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock size={20} className="text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Effectiveness</p>
                <p className="text-2xl font-bold">
                  {(improvementMetrics.aiInterventionEffectiveness * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Brain size={20} className="text-orange-600" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={improvementMetrics.aiInterventionEffectiveness * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manipulation Tactics Analysis */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warning size={20} className="text-amber-600" />
            Common Manipulation Tactics Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commonManipulationTactics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No manipulation tactics detected yet. Either you're saints, or you haven't argued enough.
            </p>
          ) : (
            <div className="space-y-4">
              {commonManipulationTactics.map((tactic, index) => (
                <div key={tactic.tactic} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? 'destructive' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium capitalize">{tactic.tactic.replace('-', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Detected {tactic.count} time{tactic.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tactic.trend === 'up' ? (
                      <TrendUp size={16} className="text-red-500" />
                    ) : tactic.trend === 'down' ? (
                      <TrendDown size={16} className="text-green-500" />
                    ) : null}
                    <span className="text-lg font-bold">{tactic.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emotional Trends */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} className="text-blue-600" />
            Emotional Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emotionalTrends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No emotional data available yet. Start some sessions to see patterns.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {emotionalTrends.slice(0, 6).map((trend, index) => (
                <div key={trend.emotion} className="text-center p-4 border rounded-lg">
                  <p className="text-2xl mb-2">
                    {getEmotionEmoji(trend.emotion)}
                  </p>
                  <p className="font-medium capitalize">{trend.emotion}</p>
                  <p className="text-sm text-muted-foreground">{trend.frequency} times</p>
                  <div className="mt-2">
                    <Progress 
                      value={(trend.frequency / Math.max(...emotionalTrends.map(t => t.frequency))) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Success Metrics Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Communication Improved</span>
                <Badge variant={improvementMetrics.averageToxicityReduction > 0.5 ? 'default' : 'secondary'}>
                  {(improvementMetrics.averageToxicityReduction * 100).toFixed(0)}%
                </Badge>
              </div>
              <Progress value={improvementMetrics.averageToxicityReduction * 100} />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Success Rate</span>
                <Badge variant={averageSuccessRate > 0.6 ? 'default' : 'secondary'}>
                  {(averageSuccessRate * 100).toFixed(0)}%
                </Badge>
              </div>
              <Progress value={averageSuccessRate * 100} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {averageSuccessRate > 0.7 ? (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Excellent Progress!</p>
                    <p className="text-sm text-green-700">
                      Your conflict resolution skills are improving significantly.
                    </p>
                  </div>
                </div>
              ) : averageSuccessRate > 0.4 ? (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Warning size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Making Progress</p>
                    <p className="text-sm text-yellow-700">
                      You're on the right track. Keep practicing structured communication.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Warning size={20} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Room for Improvement</p>
                    <p className="text-sm text-red-700">
                      Focus on completing full sessions and following AI suggestions.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Tip:</strong> Sessions with AI interventions show {Math.round(improvementMetrics.aiInterventionEffectiveness * 100)}% better outcomes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    angry: '😠',
    defensive: '🛡️',
    hurt: '💔',
    frustrated: '😤',
    dismissive: '🙄',
    caring: '❤️',
    confused: '😕',
    hopeful: '🌟'
  }
  return emojiMap[emotion] || '🤔'
}