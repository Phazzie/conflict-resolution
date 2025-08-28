// Types for couples dashboard functionality
export interface RelationshipGoal {
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

export interface SharedInsight {
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

export interface CouplesPreferences {
  goalReminders: boolean
  weeklyReports: boolean
  patternAlerts: boolean
  sharedGoalView: boolean
  notificationFrequency: 'daily' | 'weekly' | 'monthly' | 'off'
  privacyMode: 'shared' | 'individual' | 'selective'
}

export interface RelationshipMilestone {
  id: string
  goalId: string
  title: string
  description?: string
  targetDate?: number
  completed: boolean
  completedAt?: number
  completedBy?: 'player1' | 'player2' | 'both'
  evidence?: string
  celebrationNote?: string
}

export interface GoalProgress {
  goalId: string
  timestamp: number
  progress: number
  updatedBy: 'player1' | 'player2' | 'system'
  note?: string
  evidence?: string
}

export interface CouplesAnalytics {
  goalCompletionRate: number
  averageGoalDuration: number
  mostSuccessfulCategory: string
  streakData: {
    current: number
    best: number
    type: 'daily' | 'weekly' | 'goal-completion'
  }
  collaborationScore: number // How well they work together on goals
  growthAreas: string[]
  achievements: string[]
  trends: {
    goalSetting: 'increasing' | 'stable' | 'decreasing'
    completion: 'improving' | 'stable' | 'declining'
    collaboration: 'strengthening' | 'stable' | 'weakening'
  }
}

export interface SharedMemory {
  id: string
  title: string
  description: string
  category: 'achievement' | 'breakthrough' | 'challenge' | 'growth' | 'celebration'
  timestamp: number
  relatedGoals: string[]
  relatedSessions: string[]
  tags: string[]
  importance: 1 | 2 | 3 | 4 | 5
  addedBy: 'player1' | 'player2' | 'both'
  media?: {
    type: 'image' | 'video' | 'audio' | 'document'
    url: string
    caption?: string
  }[]
}

// Relationship health scoring system
export interface HealthMetrics {
  overall: number // 0-100
  communication: number
  trustAndSafety: number
  conflictResolution: number
  intimacyAndConnection: number
  sharedGoals: number
  individual Growth: number
  factors: {
    positive: string[]
    concerning: string[]
    improvements: string[]
  }
}

export interface CouplesData {
  goals: RelationshipGoal[]
  insights: SharedInsight[]
  preferences: CouplesPreferences
  milestones: RelationshipMilestone[]
  progressHistory: GoalProgress[]
  memories: SharedMemory[]
  analytics: CouplesAnalytics
  healthMetrics: HealthMetrics
  lastUpdated: number
}