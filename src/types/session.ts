import { AIAnalysisResult, ManipulationTactic } from '../services/aiAnalyzer'

export type SessionPhase = 'welcome' | 'issue-agreement' | 'steel-manning' | 'statement-locking' | 'discussion' | 'resolution' | 'summary' | 'analytics' | 'history' | 'couples-dashboard' | 'pattern-recognition' | 'ml-insights'

export interface Message {
  id: string
  author: 'player1' | 'player2' | 'ai'
  content: string
  timestamp: number
  aiAnalysis?: AIAnalysisResult
  detectedPatterns?: string[] // ML-detected patterns
  mlConfidence?: number // Confidence score from ML model
  mlEnhanced?: boolean // Whether message includes ML-enhanced suggestions
}

export interface SessionData {
  phase: SessionPhase
  agreedIssue: string
  playerOneSteelMan: string
  playerTwoSteelMan: string
  playerOneStatement: string
  playerTwoStatement: string
  messages: Message[]
  proposedResolution: string
  finalResolution: string
  sessionStarted: number
  analytics?: SessionAnalytics
  participants?: SessionParticipant[]
  isMultiplayer?: boolean
  sessionId?: string
  patternAnalysis?: PatternAnalysisResult
}

export interface PatternAnalysisResult {
  detectedPatterns: string[]
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
  analyzedAt: number
}

export interface SessionParticipant {
  playerId: PlayerRole
  isOnline: boolean
  lastSeen: number
  isTyping: boolean
}

export interface SessionAnalytics {
  totalMessages: number
  manipulationDetected: ManipulationTactic[]
  aiInterventions: number
  successMetrics: {
    issueResolved: boolean
    consensusReached: boolean
    communicationImproved: boolean
    manipulationReduced: boolean
  }
  timeSpent: {
    total: number
    perPhase: Record<SessionPhase, number>
  }
  patterns: {
    dominantSpeaker: PlayerRole | 'balanced'
    escalationPoints: number[]
    breakthroughMoments: number[]
    toneProgression: Array<{timestamp: number, tone: string}>
  }
}

export type PlayerRole = 'player1' | 'player2'

export interface PhaseProps {
  sessionData: SessionData
  currentPlayer: PlayerRole
  updateSessionData: (updates: Partial<SessionData>) => void
}

export const PHASE_PROGRESS: Record<SessionPhase, number> = {
  'welcome': 0,
  'issue-agreement': 20,
  'steel-manning': 40,
  'statement-locking': 60,
  'discussion': 80,
  'resolution': 90,
  'summary': 100,
  'analytics': 100,
  'history': 100,
  'couples-dashboard': 100,
  'pattern-recognition': 100,
  'ml-insights': 100
}

export const PHASE_NAMES: Record<SessionPhase, string> = {
  'welcome': 'Digital Thunderdome Entry',
  'issue-agreement': 'Issue Agreement',
  'steel-manning': 'Steel-Manning Phase',
  'statement-locking': 'Statement Locking',
  'discussion': 'Moderated Discussion', 
  'resolution': 'Resolution Negotiation',
  'summary': 'Battle Report',
  'analytics': 'Analytics Dashboard',
  'history': 'Session History',
  'couples-dashboard': 'Couples Dashboard',
  'pattern-recognition': 'Pattern Recognition',
  'ml-insights': 'ML Insights'
}