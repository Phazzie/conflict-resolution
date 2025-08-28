import { 
  RelationshipGoal, 
  SharedInsight, 
  CouplesPreferences, 
  RelationshipMilestone,
  GoalProgress,
  CouplesAnalytics,
  SharedMemory,
  HealthMetrics,
  CouplesData
} from '../types/couples'
import { SessionData } from '../types/session'
import { HistoryAnalytics } from '../types/history'
import { sessionHistoryService } from './sessionHistory'

class CouplesService {
  private readonly STORAGE_KEYS = {
    GOALS: 'mixitfixit-couples-goals',
    INSIGHTS: 'mixitfixit-couples-insights',
    PREFERENCES: 'mixitfixit-couples-preferences',
    MILESTONES: 'mixitfixit-couples-milestones',
    PROGRESS: 'mixitfixit-couples-progress',
    MEMORIES: 'mixitfixit-couples-memories',
    HEALTH_METRICS: 'mixitfixit-couples-health'
  }

  // Goal Management
  async getGoals(): Promise<RelationshipGoal[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.GOALS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load relationship goals:', error)
      return []
    }
  }

  async saveGoals(goals: RelationshipGoal[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.GOALS, JSON.stringify(goals))
    } catch (error) {
      console.error('Failed to save relationship goals:', error)
      throw new Error('Failed to save goals')
    }
  }

  async createGoal(goalData: Omit<RelationshipGoal, 'id' | 'createdAt' | 'lastUpdated'>): Promise<RelationshipGoal> {
    const goal: RelationshipGoal = {
      ...goalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }

    const goals = await this.getGoals()
    goals.push(goal)
    await this.saveGoals(goals)

    // Log progress entry
    await this.logGoalProgress(goal.id, 0, 'system', 'Goal created')

    return goal
  }

  async updateGoal(goalId: string, updates: Partial<RelationshipGoal>): Promise<void> {
    const goals = await this.getGoals()
    const goalIndex = goals.findIndex(g => g.id === goalId)
    
    if (goalIndex === -1) {
      throw new Error('Goal not found')
    }

    const oldProgress = goals[goalIndex].progress
    goals[goalIndex] = { ...goals[goalIndex], ...updates, lastUpdated: Date.now() }
    
    // Log progress if it changed
    if (updates.progress !== undefined && updates.progress !== oldProgress) {
      await this.logGoalProgress(goalId, updates.progress, 'player1', 'Progress updated')
    }

    await this.saveGoals(goals)
  }

  async deleteGoal(goalId: string): Promise<void> {
    const goals = await this.getGoals()
    const filteredGoals = goals.filter(g => g.id !== goalId)
    await this.saveGoals(filteredGoals)

    // Clean up related data
    await this.deleteGoalProgress(goalId)
    await this.deleteGoalMilestones(goalId)
  }

  // Progress Tracking
  async logGoalProgress(
    goalId: string, 
    progress: number, 
    updatedBy: 'player1' | 'player2' | 'system', 
    note?: string
  ): Promise<void> {
    const progressHistory = await this.getProgressHistory()
    const entry: GoalProgress = {
      goalId,
      timestamp: Date.now(),
      progress,
      updatedBy,
      note
    }

    progressHistory.push(entry)
    
    // Keep only last 1000 progress entries
    if (progressHistory.length > 1000) {
      progressHistory.splice(0, progressHistory.length - 1000)
    }

    try {
      localStorage.setItem(this.STORAGE_KEYS.PROGRESS, JSON.stringify(progressHistory))
    } catch (error) {
      console.error('Failed to log goal progress:', error)
    }
  }

  async getProgressHistory(goalId?: string): Promise<GoalProgress[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.PROGRESS)
      const allProgress = stored ? JSON.parse(stored) : []
      return goalId ? allProgress.filter((p: GoalProgress) => p.goalId === goalId) : allProgress
    } catch (error) {
      console.error('Failed to load progress history:', error)
      return []
    }
  }

  async deleteGoalProgress(goalId: string): Promise<void> {
    const progressHistory = await this.getProgressHistory()
    const filteredProgress = progressHistory.filter(p => p.goalId !== goalId)
    
    try {
      localStorage.setItem(this.STORAGE_KEYS.PROGRESS, JSON.stringify(filteredProgress))
    } catch (error) {
      console.error('Failed to delete goal progress:', error)
    }
  }

  // Insights Management
  async getSharedInsights(): Promise<SharedInsight[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.INSIGHTS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load shared insights:', error)
      return []
    }
  }

  async saveSharedInsights(insights: SharedInsight[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.INSIGHTS, JSON.stringify(insights))
    } catch (error) {
      console.error('Failed to save shared insights:', error)
      throw new Error('Failed to save insights')
    }
  }

  async addInsight(insightData: Omit<SharedInsight, 'id' | 'discoveredAt'>): Promise<SharedInsight> {
    const insight: SharedInsight = {
      ...insightData,
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      discoveredAt: Date.now()
    }

    const insights = await this.getSharedInsights()
    insights.push(insight)
    
    // Keep only the most recent 50 insights
    if (insights.length > 50) {
      insights.splice(0, insights.length - 50)
    }

    await this.saveSharedInsights(insights)
    return insight
  }

  async acknowledgeInsight(insightId: string, player: 'player1' | 'player2'): Promise<void> {
    const insights = await this.getSharedInsights()
    const insight = insights.find(i => i.id === insightId)
    
    if (insight) {
      insight.acknowledged[player] = true
      await this.saveSharedInsights(insights)
    }
  }

  async dismissInsight(insightId: string): Promise<void> {
    const insights = await this.getSharedInsights()
    const filteredInsights = insights.filter(i => i.id !== insightId)
    await this.saveSharedInsights(filteredInsights)
  }

  // Generate insights from session data and relationship patterns
  async generateInsightsFromHistory(historyAnalytics: HistoryAnalytics): Promise<SharedInsight[]> {
    const newInsights: SharedInsight[] = []
    const existingInsights = await this.getSharedInsights()
    const existingTypes = new Set(existingInsights.map(i => `${i.type}-${i.title}`))

    // Pattern-based insights
    historyAnalytics.relationshipPatterns.forEach(pattern => {
      if (pattern.severity === 'high' || pattern.trend === 'worsening') {
        const insightKey = `warning-${pattern.name} Pattern Detected`
        if (!existingTypes.has(insightKey)) {
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
      }
    })

    // Achievement insights
    if (historyAnalytics.progressMetrics.resolutionRate > 70) {
      const insightKey = 'achievement-Strong Resolution Success Rate'
      if (!existingTypes.has(insightKey)) {
        newInsights.push({
          id: `achievement-resolution-${Date.now()}`,
          type: 'achievement',
          title: 'Strong Resolution Success Rate',
          description: `You're resolving ${Math.round(historyAnalytics.progressMetrics.resolutionRate)}% of your conflicts effectively`,
          severity: 'low',
          actionRequired: false,
          relevantSessions: [],
          discoveredAt: Date.now(),
          acknowledged: { player1: false, player2: false }
        })
      }
    }

    // Communication opportunities
    if (historyAnalytics.communicationMetrics.averageResponseTime > 300000) {
      const insightKey = 'opportunity-Improve Response Timing'
      if (!existingTypes.has(insightKey)) {
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
    }

    return newInsights
  }

  // Milestones Management
  async getMilestones(goalId?: string): Promise<RelationshipMilestone[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.MILESTONES)
      const allMilestones = stored ? JSON.parse(stored) : []
      return goalId ? allMilestones.filter((m: RelationshipMilestone) => m.goalId === goalId) : allMilestones
    } catch (error) {
      console.error('Failed to load milestones:', error)
      return []
    }
  }

  async saveMilestones(milestones: RelationshipMilestone[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.MILESTONES, JSON.stringify(milestones))
    } catch (error) {
      console.error('Failed to save milestones:', error)
      throw new Error('Failed to save milestones')
    }
  }

  async deleteGoalMilestones(goalId: string): Promise<void> {
    const milestones = await this.getMilestones()
    const filteredMilestones = milestones.filter(m => m.goalId !== goalId)
    await this.saveMilestones(filteredMilestones)
  }

  // Preferences Management
  async getPreferences(): Promise<CouplesPreferences> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.PREFERENCES)
      return stored ? JSON.parse(stored) : {
        goalReminders: true,
        weeklyReports: true,
        patternAlerts: true,
        sharedGoalView: true,
        notificationFrequency: 'weekly' as const,
        privacyMode: 'shared' as const
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      return {
        goalReminders: true,
        weeklyReports: true,
        patternAlerts: true,
        sharedGoalView: true,
        notificationFrequency: 'weekly' as const,
        privacyMode: 'shared' as const
      }
    }
  }

  async savePreferences(preferences: CouplesPreferences): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save preferences:', error)
      throw new Error('Failed to save preferences')
    }
  }

  // Analytics Generation
  async generateCouplesAnalytics(): Promise<CouplesAnalytics> {
    const goals = await this.getGoals()
    const progressHistory = await this.getProgressHistory()
    const historyAnalytics = await sessionHistoryService.generateHistoryAnalytics()

    const completedGoals = goals.filter(g => g.status === 'completed')
    const activeGoals = goals.filter(g => g.status === 'active')

    // Calculate completion rate
    const goalCompletionRate = goals.length > 0 ? 
      (completedGoals.length / goals.length) * 100 : 0

    // Calculate average duration for completed goals
    const averageGoalDuration = completedGoals.length > 0 ?
      completedGoals.reduce((sum, goal) => sum + (goal.lastUpdated - goal.createdAt), 0) / completedGoals.length :
      0

    // Find most successful category
    const categorySuccess = {} as Record<string, number>
    completedGoals.forEach(goal => {
      categorySuccess[goal.category] = (categorySuccess[goal.category] || 0) + 1
    })
    const mostSuccessfulCategory = Object.entries(categorySuccess)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'communication'

    // Calculate collaboration score based on goal updates from both players
    const recentProgress = progressHistory.filter(p => p.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000)
    const player1Updates = recentProgress.filter(p => p.updatedBy === 'player1').length
    const player2Updates = recentProgress.filter(p => p.updatedBy === 'player2').length
    const totalUpdates = player1Updates + player2Updates
    const collaborationScore = totalUpdates > 0 ? 
      (Math.min(player1Updates, player2Updates) / totalUpdates) * 100 : 50

    // Identify growth areas based on goal categories with low completion rates
    const categoryCompletion = {} as Record<string, { completed: number, total: number }>
    goals.forEach(goal => {
      if (!categoryCompletion[goal.category]) {
        categoryCompletion[goal.category] = { completed: 0, total: 0 }
      }
      categoryCompletion[goal.category].total++
      if (goal.status === 'completed') {
        categoryCompletion[goal.category].completed++
      }
    })

    const growthAreas = Object.entries(categoryCompletion)
      .filter(([,data]) => data.total > 0 && (data.completed / data.total) < 0.5)
      .map(([category]) => category)
      .slice(0, 3)

    // Identify achievements
    const achievements: string[] = []
    if (goalCompletionRate > 80) achievements.push('High Goal Achievement Rate')
    if (collaborationScore > 70) achievements.push('Strong Collaboration')
    if (historyAnalytics.progressMetrics.resolutionRate > 75) achievements.push('Excellent Conflict Resolution')
    if (completedGoals.length >= 5) achievements.push('Goal-Setting Champions')

    return {
      goalCompletionRate,
      averageGoalDuration,
      mostSuccessfulCategory,
      streakData: {
        current: this.calculateGoalStreak(goals),
        best: this.calculateBestGoalStreak(goals),
        type: 'goal-completion'
      },
      collaborationScore,
      growthAreas,
      achievements,
      trends: {
        goalSetting: this.calculateGoalSettingTrend(goals),
        completion: this.calculateCompletionTrend(goals),
        collaboration: this.calculateCollaborationTrend(progressHistory)
      }
    }
  }

  // Health Metrics
  async calculateHealthMetrics(): Promise<HealthMetrics> {
    const goals = await this.getGoals()
    const insights = await this.getSharedInsights()
    const historyAnalytics = await sessionHistoryService.generateHistoryAnalytics()

    // Base scores from session history
    const communication = Math.max(0, Math.min(100, 
      (historyAnalytics.communicationMetrics.steelManningAccuracy + 
       historyAnalytics.communicationMetrics.emotionalTone.positive - 
       historyAnalytics.communicationMetrics.emotionalTone.negative) / 2
    ))

    const conflictResolution = historyAnalytics.progressMetrics.resolutionRate

    const trustAndSafety = Math.max(0, 100 - (insights.filter(i => i.type === 'warning').length * 10))

    // Goals-based metrics
    const activeGoals = goals.filter(g => g.status === 'active')
    const completedGoals = goals.filter(g => g.status === 'completed')
    const sharedGoals = activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(activeGoals.length, 1)

    const intimacyGoals = goals.filter(g => g.category === 'intimacy' || g.category === 'fun')
    const intimacyAndConnection = intimacyGoals.length > 0 ? 
      intimacyGoals.reduce((sum, goal) => sum + goal.progress, 0) / intimacyGoals.length : 50

    const growthGoals = goals.filter(g => g.category === 'growth')
    const individualGrowth = growthGoals.length > 0 ?
      growthGoals.reduce((sum, goal) => sum + goal.progress, 0) / growthGoals.length : 50

    const overall = Math.round(
      (communication * 0.2 + 
       trustAndSafety * 0.2 + 
       conflictResolution * 0.2 + 
       intimacyAndConnection * 0.15 + 
       sharedGoals * 0.15 + 
       individualGrowth * 0.1)
    )

    const positive: string[] = []
    const concerning: string[] = []
    const improvements: string[] = []

    // Analyze factors
    if (communication > 75) positive.push('Strong communication skills')
    else if (communication < 50) concerning.push('Communication challenges')

    if (conflictResolution > 70) positive.push('Effective conflict resolution')
    else if (conflictResolution < 40) concerning.push('Difficulty resolving conflicts')

    if (completedGoals.length > 3) positive.push('Consistent goal achievement')
    if (activeGoals.length > 5) concerning.push('May be overcommitting to goals')

    if (communication < 60) improvements.push('Practice active listening techniques')
    if (conflictResolution < 60) improvements.push('Learn de-escalation strategies')
    if (sharedGoals < 50) improvements.push('Set more specific, achievable goals')

    return {
      overall,
      communication,
      trustAndSafety,
      conflictResolution,
      intimacyAndConnection,
      sharedGoals,
      individual Growth: individualGrowth,
      factors: {
        positive,
        concerning,
        improvements
      }
    }
  }

  // Shared Memories
  async getSharedMemories(): Promise<SharedMemory[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.MEMORIES)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load shared memories:', error)
      return []
    }
  }

  async addMemory(memoryData: Omit<SharedMemory, 'id' | 'timestamp'>): Promise<SharedMemory> {
    const memory: SharedMemory = {
      ...memoryData,
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now()
    }

    const memories = await this.getSharedMemories()
    memories.push(memory)
    
    // Keep only the most recent 100 memories
    if (memories.length > 100) {
      memories.sort((a, b) => b.timestamp - a.timestamp)
      memories.splice(100)
    }

    try {
      localStorage.setItem(this.STORAGE_KEYS.MEMORIES, JSON.stringify(memories))
    } catch (error) {
      console.error('Failed to save shared memory:', error)
      throw new Error('Failed to save memory')
    }

    return memory
  }

  // Export all couples data
  async exportAllData(): Promise<CouplesData> {
    const [
      goals, 
      insights, 
      preferences, 
      milestones, 
      progressHistory, 
      memories, 
      analytics, 
      healthMetrics
    ] = await Promise.all([
      this.getGoals(),
      this.getSharedInsights(),
      this.getPreferences(),
      this.getMilestones(),
      this.getProgressHistory(),
      this.getSharedMemories(),
      this.generateCouplesAnalytics(),
      this.calculateHealthMetrics()
    ])

    return {
      goals,
      insights,
      preferences,
      milestones,
      progressHistory,
      memories,
      analytics,
      healthMetrics,
      lastUpdated: Date.now()
    }
  }

  // Clear all couples data
  async clearAllData(): Promise<void> {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // Helper methods
  private calculateGoalStreak(goals: RelationshipGoal[]): number {
    const sortedGoals = goals
      .filter(g => g.status === 'completed')
      .sort((a, b) => b.lastUpdated - a.lastUpdated)

    let streak = 0
    let lastCompletionDate = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    for (const goal of sortedGoals) {
      if (lastCompletionDate - goal.lastUpdated <= oneWeek) {
        streak++
        lastCompletionDate = goal.lastUpdated
      } else {
        break
      }
    }

    return streak
  }

  private calculateBestGoalStreak(goals: RelationshipGoal[]): number {
    const completedGoals = goals
      .filter(g => g.status === 'completed')
      .sort((a, b) => a.lastUpdated - b.lastUpdated)

    let bestStreak = 0
    let currentStreak = 0
    let lastDate = 0
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    for (const goal of completedGoals) {
      if (lastDate === 0 || goal.lastUpdated - lastDate <= oneWeek) {
        currentStreak++
      } else {
        bestStreak = Math.max(bestStreak, currentStreak)
        currentStreak = 1
      }
      lastDate = goal.lastUpdated
    }

    return Math.max(bestStreak, currentStreak)
  }

  private calculateGoalSettingTrend(goals: RelationshipGoal[]): 'increasing' | 'stable' | 'decreasing' {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000

    const recentGoals = goals.filter(g => g.createdAt > thirtyDaysAgo).length
    const olderGoals = goals.filter(g => g.createdAt > sixtyDaysAgo && g.createdAt <= thirtyDaysAgo).length

    if (recentGoals > olderGoals) return 'increasing'
    if (recentGoals < olderGoals) return 'decreasing'
    return 'stable'
  }

  private calculateCompletionTrend(goals: RelationshipGoal[]): 'improving' | 'stable' | 'declining' {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000

    const recentCompletions = goals.filter(g => 
      g.status === 'completed' && g.lastUpdated > thirtyDaysAgo
    ).length

    const olderCompletions = goals.filter(g => 
      g.status === 'completed' && g.lastUpdated > sixtyDaysAgo && g.lastUpdated <= thirtyDaysAgo
    ).length

    if (recentCompletions > olderCompletions) return 'improving'
    if (recentCompletions < olderCompletions) return 'declining'
    return 'stable'
  }

  private calculateCollaborationTrend(progressHistory: GoalProgress[]): 'strengthening' | 'stable' | 'weakening' {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentProgress = progressHistory.filter(p => p.timestamp > thirtyDaysAgo)

    if (recentProgress.length === 0) return 'stable'

    const player1Updates = recentProgress.filter(p => p.updatedBy === 'player1').length
    const player2Updates = recentProgress.filter(p => p.updatedBy === 'player2').length

    const collaborationBalance = Math.min(player1Updates, player2Updates) / recentProgress.length

    if (collaborationBalance > 0.4) return 'strengthening'
    if (collaborationBalance < 0.2) return 'weakening'
    return 'stable'
  }
}

export const couplesService = new CouplesService()