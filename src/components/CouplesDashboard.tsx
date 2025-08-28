import React, { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  BarChart3,
  Star,
  MessageCircle,
  Clock,
  Trophy,
  Plus,
  X,
  ArrowRight,
  Lightbulb
} from '@phosphor-icons/react'
import { SessionData, SessionAnalytics } from '../types/session'
import { HistoryAnalytics } from '../types/history'
import { sessionHistoryService } from '../services/sessionHistory'
import { toast } from 'sonner'

interface RelationshipGoal {
  id: string
  title: string
  description: string
  category: 'communication' | 'intimacy' | 'trust' | 'conflict' | 'growth' | 'fun'
  priority: 'high' | 'medium' | 'low'
  targetDate: number
  status: 'active' | 'completed' | 'paused'
  progress: number
  milestones: {
    id: string
    title: string
    completed: boolean
    completedAt?: number
  }[]
  createdAt: number
  createdBy: 'player1' | 'player2' | 'both'
  lastUpdated: number
}

interface SharedInsight {
  id: string
  type: 'pattern' | 'achievement' | 'warning' | 'opportunity'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  actionRequired: boolean
  suggestedActions?: string[]
  relevantSessions: string[]
  discoveredAt: number
  acknowledged: {
    player1: boolean
    player2: boolean
  }
}

interface CouplesDashboardProps {
  currentSession?: SessionData
  onClose: () => void
  onExport: (data: string) => void
}

const GOAL_CATEGORIES = {
  communication: { icon: MessageCircle, label: 'Communication', color: 'text-blue-500' },
  intimacy: { icon: Heart, label: 'Intimacy', color: 'text-pink-500' },
  trust: { icon: CheckCircle2, label: 'Trust', color: 'text-green-500' },
  conflict: { icon: AlertTriangle, label: 'Conflict Resolution', color: 'text-orange-500' },
  growth: { icon: TrendingUp, label: 'Personal Growth', color: 'text-purple-500' },
  fun: { icon: Star, label: 'Fun & Connection', color: 'text-yellow-500' }
}

export default function CouplesDashboard({ currentSession, onClose, onExport }: CouplesDashboardProps) {
  const [historyAnalytics, setHistoryAnalytics] = useState<HistoryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Couples data using KV storage
  const [relationshipGoals, setRelationshipGoals] = useKV<RelationshipGoal[]>('couples-goals', [])
  const [sharedInsights, setSharedInsights] = useKV<SharedInsight[]>('couples-insights', [])
  const [couplePreferences, setCouplePreferences] = useKV('couples-preferences', {
    goalReminders: true,
    weeklyReports: true,
    patternAlerts: true,
    sharedGoalView: true
  })

  // New goal form state
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'communication' as RelationshipGoal['category'],
    priority: 'medium' as RelationshipGoal['priority'],
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [showNewGoalForm, setShowNewGoalForm] = useState(false)

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        const analytics = await sessionHistoryService.generateHistoryAnalytics()
        setHistoryAnalytics(analytics)
        
        // Generate new insights based on latest data
        await generateSharedInsights(analytics)
      } catch (error) {
        console.error('Failed to load couples dashboard data:', error)
        toast.error('Failed to load relationship data')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  const generateSharedInsights = useCallback(async (analytics: HistoryAnalytics) => {
    const newInsights: SharedInsight[] = []

    // Pattern-based insights
    analytics.relationshipPatterns.forEach(pattern => {
      if (pattern.severity === 'high' || pattern.trend === 'worsening') {
        newInsights.push({
          id: `pattern-${pattern.patternId}-${Date.now()}`,
          type: 'warning',
          title: `${pattern.name} Pattern Detected`,
          description: pattern.description,
          severity: pattern.severity as 'low' | 'medium' | 'high',
          actionRequired: true,
          suggestedActions: [
            'Schedule a dedicated discussion session',
            'Consider professional guidance',
            'Review successful past resolutions'
          ],
          relevantSessions: pattern.examples,
          discoveredAt: Date.now(),
          acknowledged: { player1: false, player2: false }
        })
      }
    })

    // Progress achievements
    if (analytics.progressMetrics.resolutionRate > 70) {
      newInsights.push({
        id: `achievement-resolution-${Date.now()}`,
        type: 'achievement',
        title: 'Strong Resolution Success Rate',
        description: `You're resolving ${Math.round(analytics.progressMetrics.resolutionRate)}% of your conflicts effectively`,
        severity: 'low',
        actionRequired: false,
        relevantSessions: [],
        discoveredAt: Date.now(),
        acknowledged: { player1: false, player2: false }
      })
    }

    // Communication opportunities
    if (analytics.communicationMetrics.averageResponseTime > 300000) { // 5+ minutes
      newInsights.push({
        id: `opportunity-response-time-${Date.now()}`,
        type: 'opportunity',
        title: 'Improve Response Timing',
        description: 'Long response times may indicate disengagement or processing difficulties',
        severity: 'medium',
        actionRequired: false,
        suggestedActions: [
          'Set time boundaries for discussions',
          'Practice active listening techniques',
          'Take breaks when needed, but communicate them'
        ],
        relevantSessions: [],
        discoveredAt: Date.now(),
        acknowledged: { player1: false, player2: false }
      })
    }

    // Update insights, avoiding duplicates
    setSharedInsights(prevInsights => {
      const existingTypes = new Set(prevInsights.map(i => `${i.type}-${i.title}`))
      const uniqueNewInsights = newInsights.filter(insight => 
        !existingTypes.has(`${insight.type}-${insight.title}`)
      )
      return [...prevInsights, ...uniqueNewInsights].slice(-20) // Keep last 20 insights
    })
  }, [setSharedInsights])

  const createGoal = useCallback(async () => {
    if (!newGoal.title.trim()) {
      toast.error('Goal title is required')
      return
    }

    const goal: RelationshipGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: newGoal.title.trim(),
      description: newGoal.description.trim(),
      category: newGoal.category,
      priority: newGoal.priority,
      targetDate: new Date(newGoal.targetDate).getTime(),
      status: 'active',
      progress: 0,
      milestones: [],
      createdAt: Date.now(),
      createdBy: 'both', // For now, assume jointly created
      lastUpdated: Date.now()
    }

    setRelationshipGoals(prevGoals => [...prevGoals, goal])
    setNewGoal({
      title: '',
      description: '',
      category: 'communication',
      priority: 'medium',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    setShowNewGoalForm(false)
    toast.success('Relationship goal created successfully!')
  }, [newGoal, setRelationshipGoals])

  const updateGoalProgress = useCallback((goalId: string, progress: number) => {
    setRelationshipGoals(prevGoals =>
      prevGoals.map(goal => {
        if (goal.id === goalId) {
          const updatedGoal = {
            ...goal,
            progress: Math.max(0, Math.min(100, progress)),
            lastUpdated: Date.now()
          }
          
          // Auto-complete if progress reaches 100%
          if (updatedGoal.progress === 100 && goal.status !== 'completed') {
            updatedGoal.status = 'completed'
            toast.success(`🎉 Goal "${goal.title}" completed!`)
          }
          
          return updatedGoal
        }
        return goal
      })
    )
  }, [setRelationshipGoals])

  const acknowledgeInsight = useCallback((insightId: string, player: 'player1' | 'player2') => {
    setSharedInsights(prevInsights =>
      prevInsights.map(insight => {
        if (insight.id === insightId) {
          return {
            ...insight,
            acknowledged: {
              ...insight.acknowledged,
              [player]: true
            }
          }
        }
        return insight
      })
    )
  }, [setSharedInsights])

  const dismissInsight = useCallback((insightId: string) => {
    setSharedInsights(prevInsights =>
      prevInsights.filter(insight => insight.id !== insightId)
    )
  }, [setSharedInsights])

  const exportCouplesData = useCallback(() => {
    const exportData = {
      relationshipGoals,
      sharedInsights,
      historyAnalytics,
      preferences: couplePreferences,
      exportedAt: Date.now()
    }
    
    onExport(JSON.stringify(exportData, null, 2))
    toast.success('Couples data exported successfully')
  }, [relationshipGoals, sharedInsights, historyAnalytics, couplePreferences, onExport])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading couples dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeGoals = relationshipGoals.filter(g => g.status === 'active')
  const completedGoals = relationshipGoals.filter(g => g.status === 'completed')
  const unacknowledgedInsights = sharedInsights.filter(i => 
    !i.acknowledged.player1 || !i.acknowledged.player2
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="w-8 h-8 text-pink-500" />
              <div>
                <h1 className="text-2xl font-bold">Couples Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Shared insights, goals, and relationship progress tracking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCouplesData}>
                Export Data
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals" className="relative">
              Goals
              {activeGoals.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeGoals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="relative">
              Insights
              {unacknowledgedInsights.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {unacknowledgedInsights.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Relationship Health Score */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Relationship Health</CardTitle>
                  <Heart className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {historyAnalytics?.insights.overallHealth === 'excellent' ? '95%' :
                     historyAnalytics?.insights.overallHealth === 'good' ? '75%' :
                     historyAnalytics?.insights.overallHealth === 'concerning' ? '55%' : '35%'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {historyAnalytics?.insights.overallHealth === 'excellent' ? 'Excellent relationship dynamics' :
                     historyAnalytics?.insights.overallHealth === 'good' ? 'Generally healthy patterns' :
                     historyAnalytics?.insights.overallHealth === 'concerning' ? 'Some areas need attention' : 'Significant improvements needed'}
                  </p>
                  <div className="mt-2">
                    <Badge variant={
                      historyAnalytics?.insights.overallHealth === 'excellent' ? 'default' :
                      historyAnalytics?.insights.overallHealth === 'good' ? 'secondary' :
                      historyAnalytics?.insights.overallHealth === 'concerning' ? 'outline' : 'destructive'
                    }>
                      {historyAnalytics?.insights.overallHealth || 'Unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                  <Target className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeGoals.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {completedGoals.length} completed this year
                  </p>
                  <div className="mt-2">
                    <Progress 
                      value={activeGoals.length > 0 ? 
                        activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length : 0
                      } 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Resolution Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolution Success</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(historyAnalytics?.progressMetrics.resolutionRate || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {historyAnalytics?.progressMetrics.improvementTrend === 'improving' ? 'Improving trend' :
                     historyAnalytics?.progressMetrics.improvementTrend === 'declining' ? 'Needs attention' : 'Stable performance'}
                  </p>
                  <div className="mt-2 flex items-center text-xs">
                    {historyAnalytics?.progressMetrics.improvementTrend === 'improving' ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : historyAnalytics?.progressMetrics.improvementTrend === 'declining' ? (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    ) : null}
                    <span className={
                      historyAnalytics?.progressMetrics.improvementTrend === 'improving' ? 'text-green-500' :
                      historyAnalytics?.progressMetrics.improvementTrend === 'declining' ? 'text-red-500' : 'text-muted-foreground'
                    }>
                      {historyAnalytics?.progressMetrics.improvementTrend || 'stable'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Current Streak */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {historyAnalytics?.progressMetrics.streaks.current || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    sessions resolved • Best: {historyAnalytics?.progressMetrics.streaks.best || 0}
                  </p>
                </CardContent>
              </Card>

              {/* Pending Insights */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Insights</CardTitle>
                  <Lightbulb className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{unacknowledgedInsights.length}</div>
                  <p className="text-xs text-muted-foreground">
                    require attention
                  </p>
                  {unacknowledgedInsights.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2" 
                      onClick={() => setActiveTab('insights')}
                    >
                      Review <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Communication Quality */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Communication</CardTitle>
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(historyAnalytics?.communicationMetrics.steelManningAccuracy || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    steel-manning accuracy
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-green-600">
                        {Math.round(historyAnalytics?.communicationMetrics.emotionalTone.positive || 0)}%
                      </div>
                      <div>Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-600">
                        {Math.round(historyAnalytics?.communicationMetrics.emotionalTone.neutral || 0)}%
                      </div>
                      <div>Neutral</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">
                        {Math.round(historyAnalytics?.communicationMetrics.emotionalTone.negative || 0)}%
                      </div>
                      <div>Negative</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setShowNewGoalForm(true)
                    setActiveTab('goals')
                  }}
                >
                  <Plus className="h-5 w-5" />
                  Create New Goal
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('insights')}
                >
                  <Lightbulb className="h-5 w-5" />
                  Review Insights
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('patterns')}
                >
                  <BarChart3 className="h-5 w-5" />
                  View Patterns
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={exportCouplesData}
                >
                  <Calendar className="h-5 w-5" />
                  Export Report
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Relationship Goals</h2>
              <Button onClick={() => setShowNewGoalForm(!showNewGoalForm)}>
                {showNewGoalForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {showNewGoalForm ? 'Cancel' : 'New Goal'}
              </Button>
            </div>

            {showNewGoalForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Create New Relationship Goal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Goal Title</label>
                      <Input
                        placeholder="e.g., Improve daily communication"
                        value={newGoal.title}
                        onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={newGoal.category}
                        onChange={e => setNewGoal(prev => ({ ...prev, category: e.target.value as RelationshipGoal['category'] }))}
                      >
                        {Object.entries(GOAL_CATEGORIES).map(([key, category]) => (
                          <option key={key} value={key}>{category.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Describe what success looks like..."
                      value={newGoal.description}
                      onChange={e => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={newGoal.priority}
                        onChange={e => setNewGoal(prev => ({ ...prev, priority: e.target.value as RelationshipGoal['priority'] }))}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Target Date</label>
                      <Input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={e => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createGoal}>Create Goal</Button>
                    <Button variant="outline" onClick={() => setShowNewGoalForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {activeGoals.map(goal => {
                const CategoryIcon = GOAL_CATEGORIES[goal.category].icon
                const daysRemaining = Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24))
                
                return (
                  <Card key={goal.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <CategoryIcon className={`h-6 w-6 ${GOAL_CATEGORIES[goal.category].color}`} />
                          <div>
                            <h3 className="font-medium">{goal.title}</h3>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            goal.priority === 'high' ? 'destructive' :
                            goal.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {goal.priority}
                          </Badge>
                          <Badge variant="outline">
                            {GOAL_CATEGORIES[goal.category].label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span>
                          {daysRemaining > 0 ? 
                            `${daysRemaining} days remaining` : 
                            `${Math.abs(daysRemaining)} days overdue`
                          }
                        </span>
                        <span>Created {new Date(goal.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 25))}
                        >
                          +25%
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                        >
                          +10%
                        </Button>
                        {goal.progress < 100 && (
                          <Button
                            size="sm"
                            onClick={() => updateGoalProgress(goal.id, 100)}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {completedGoals.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Completed Goals</h3>
                  <div className="grid gap-4">
                    {completedGoals.slice(0, 3).map(goal => {
                      const CategoryIcon = GOAL_CATEGORIES[goal.category].icon
                      
                      return (
                        <Card key={goal.id} className="opacity-60">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <CategoryIcon className={`h-5 w-5 ${GOAL_CATEGORIES[goal.category].color}`} />
                              <div className="flex-1">
                                <h3 className="font-medium">{goal.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Completed {new Date(goal.lastUpdated).toLocaleDateString()}
                                </p>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {relationshipGoals.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No goals yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by creating your first relationship goal together
                    </p>
                    <Button onClick={() => setShowNewGoalForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <h2 className="text-xl font-semibold mb-6">Shared Relationship Insights</h2>
            
            {sharedInsights.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No insights yet</h3>
                  <p className="text-muted-foreground">
                    Complete more sessions to unlock personalized relationship insights
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sharedInsights
                  .sort((a, b) => b.discoveredAt - a.discoveredAt)
                  .map(insight => {
                    const isFullyAcknowledged = insight.acknowledged.player1 && insight.acknowledged.player2
                    
                    return (
                      <Card key={insight.id} className={isFullyAcknowledged ? 'opacity-60' : ''}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />}
                              {insight.type === 'achievement' && <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />}
                              {insight.type === 'opportunity' && <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />}
                              {insight.type === 'pattern' && <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5" />}
                              
                              <div className="flex-1">
                                <h3 className="font-medium mb-1">{insight.title}</h3>
                                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                                
                                {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium mb-2">Suggested Actions:</p>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                      {insight.suggestedActions.map((action, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                          <span className="text-primary">•</span>
                                          <span>{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                insight.severity === 'high' ? 'destructive' :
                                insight.severity === 'medium' ? 'default' : 'secondary'
                              }>
                                {insight.severity}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => dismissInsight(insight.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Discovered {new Date(insight.discoveredAt).toLocaleDateString()}</span>
                              {insight.relevantSessions.length > 0 && (
                                <span>{insight.relevantSessions.length} related sessions</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Acknowledged by:</span>
                              <div className="flex gap-1">
                                <Badge variant={insight.acknowledged.player1 ? "default" : "outline"} className="text-xs">
                                  P1 {insight.acknowledged.player1 ? '✓' : ''}
                                </Badge>
                                <Badge variant={insight.acknowledged.player2 ? "default" : "outline"} className="text-xs">
                                  P2 {insight.acknowledged.player2 ? '✓' : ''}
                                </Badge>
                              </div>
                              {!isFullyAcknowledged && (
                                <div className="flex gap-1">
                                  {!insight.acknowledged.player1 && (
                                    <Button size="sm" variant="outline" onClick={() => acknowledgeInsight(insight.id, 'player1')}>
                                      Ack P1
                                    </Button>
                                  )}
                                  {!insight.acknowledged.player2 && (
                                    <Button size="sm" variant="outline" onClick={() => acknowledgeInsight(insight.id, 'player2')}>
                                      Ack P2
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="mt-6">
            <h2 className="text-xl font-semibold mb-6">Relationship Pattern Analysis</h2>
            
            {historyAnalytics && historyAnalytics.relationshipPatterns.length > 0 ? (
              <div className="space-y-6">
                {historyAnalytics.relationshipPatterns.map(pattern => (
                  <Card key={pattern.patternId}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-lg">{pattern.name}</h3>
                          <p className="text-muted-foreground">{pattern.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            pattern.severity === 'high' ? 'destructive' :
                            pattern.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {pattern.severity} severity
                          </Badge>
                          <Badge variant="outline">
                            {pattern.trend}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium">Frequency</p>
                          <p className="text-2xl font-bold">{pattern.frequency}</p>
                          <p className="text-xs text-muted-foreground">occurrences</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Last Seen</p>
                          <p className="text-sm">{new Date(pattern.lastOccurrence).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Trend</p>
                          <div className="flex items-center gap-1">
                            {pattern.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {pattern.trend === 'worsening' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <span className={
                              pattern.trend === 'improving' ? 'text-green-500' :
                              pattern.trend === 'worsening' ? 'text-red-500' : 'text-muted-foreground'
                            }>
                              {pattern.trend}
                            </span>
                          </div>
                        </div>
                      </div>

                      {pattern.examples.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Recent Examples:</p>
                          <div className="space-y-1">
                            {pattern.examples.slice(0, 3).map((example, index) => (
                              <p key={index} className="text-sm text-muted-foreground">
                                • {example}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No patterns detected yet</h3>
                  <p className="text-muted-foreground">
                    Complete more sessions to identify relationship patterns and trends
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}