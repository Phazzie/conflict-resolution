import { SessionData, SessionAnalytics, PlayerRole } from './session'
import { ManipulationTactic } from '../services/aiAnalyzer'

export interface SessionHistoryEntry {
  id: string
  sessionData: SessionData
  completedAt: number
  outcome: 'resolved' | 'stalemate' | 'abandoned'
  participants: PlayerRole[]
  duration: number
  issueCategory: string
  satisfactionRating?: {
    player1: number
    player2: number
  }
}

export interface RelationshipPattern {
  patternId: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high'
  frequency: number
  lastOccurrence: number
  examples: string[]
  trend: 'improving' | 'stable' | 'worsening'
}

export interface RecurringIssue {
  issueId: string
  normalizedIssue: string
  originalIssues: string[]
  frequency: number
  resolutionRate: number
  averageDuration: number
  lastDiscussed: number
  patterns: {
    commonTriggers: string[]
    escalationPoints: string[]
    successfulResolutions: string[]
  }
}

export interface CommunicationMetrics {
  averageResponseTime: number
  messageLength: number
  emotionalTone: {
    positive: number
    negative: number
    neutral: number
  }
  manipulationTactics: {
    tactic: ManipulationTactic
    frequency: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }[]
  aiInterventionEffectiveness: number
  steelManningAccuracy: number
}

export interface ProgressMetrics {
  resolutionRate: number
  consensusRate: number
  sessionCompletionRate: number
  averageSatisfaction: number
  improvementTrend: 'improving' | 'stable' | 'declining'
  streaks: {
    current: number
    best: number
    type: 'resolution' | 'completion' | 'satisfaction'
  }
}

export interface TimeBasedAnalysis {
  weeklyTrends: {
    week: string
    sessionsCount: number
    resolutionRate: number
    averageSatisfaction: number
  }[]
  monthlyPatterns: {
    month: string
    commonIssues: string[]
    progressScore: number
  }[]
  seasonalTrends: {
    season: 'spring' | 'summer' | 'fall' | 'winter'
    conflictFrequency: number
    resolutionSuccess: number
  }[]
}

export interface RelationshipInsights {
  overallHealth: 'excellent' | 'good' | 'concerning' | 'critical'
  strengthAreas: string[]
  growthAreas: string[]
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    action: string
    reasoning: string
    expectedImpact: string
  }[]
  riskFactors: {
    factor: string
    severity: 'low' | 'medium' | 'high'
    trend: 'improving' | 'stable' | 'worsening'
    interventions: string[]
  }[]
}

export interface HistoryAnalytics {
  totalSessions: number
  dateRange: {
    first: number
    last: number
  }
  recurringIssues: RecurringIssue[]
  relationshipPatterns: RelationshipPattern[]
  communicationMetrics: CommunicationMetrics
  progressMetrics: ProgressMetrics
  timeBasedAnalysis: TimeBasedAnalysis
  insights: RelationshipInsights
  generatedAt: number
}

export interface PatternRecognitionResult {
  confidence: number
  patternType: 'communication' | 'behavioral' | 'temporal' | 'thematic'
  description: string
  evidence: string[]
  recommendations: string[]
}

export interface TrendAnalysis {
  metric: string
  direction: 'upward' | 'downward' | 'stable'
  strength: number
  significance: 'high' | 'medium' | 'low'
  dataPoints: Array<{
    timestamp: number
    value: number
  }>
  projection?: {
    nextMonth: number
    confidence: number
  }
}