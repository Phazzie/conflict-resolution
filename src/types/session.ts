export type SessionPhase = 'welcome' | 'issue-agreement' | 'steel-manning' | 'statement-locking' | 'discussion' | 'resolution' | 'summary' | 'analytics'

export interface Message {
  id: string
  author: 'player1' | 'player2' | 'ai'
  content: string
  timestamp: number
  aiAnalysis?: AIAnalysis
}

export interface AIAnalysis {
  manipulationTactics: ManipulationTactic[]
  toxicityScore: number
  emotionalTone: EmotionalTone
  suggestions: AISuggestion[]
  confidence: number
}

export interface ManipulationTactic {
  type: 'gaslighting' | 'blame-shifting' | 'stonewalling' | 'projection' | 'triangulation' | 'love-bombing' | 'guilt-tripping' | 'deflection' | 'minimizing' | 'dismissing'
  severity: 'low' | 'medium' | 'high'
  evidence: string
  description: string
}

export interface EmotionalTone {
  primary: 'angry' | 'defensive' | 'hurt' | 'frustrated' | 'dismissive' | 'caring' | 'confused' | 'hopeful'
  intensity: number // 0-1
  secondaryEmotions: string[]
}

export interface AISuggestion {
  type: 'rephrase' | 'question' | 'reflection' | 'validation' | 'boundary'
  content: string
  rationale: string
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
  emotionalProgression: EmotionalTone[]
  aiInterventions: number
  successMetrics: {
    issueResolved: boolean
    consensusReached: boolean
    communicationImproved: boolean
    toxicityReduced: boolean
  }
  timeSpent: {
    total: number
    perPhase: Record<SessionPhase, number>
  }
  patterns: {
    dominantSpeaker: PlayerRole | 'balanced'
    escalationPoints: number[]
    breakthroughMoments: number[]
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
  'analytics': 100
}

export const PHASE_NAMES: Record<SessionPhase, string> = {
  'welcome': 'Digital Thunderdome Entry',
  'issue-agreement': 'Issue Agreement',
  'steel-manning': 'Steel-Manning Phase',
  'statement-locking': 'Statement Locking',
  'discussion': 'Moderated Discussion', 
  'resolution': 'Resolution Negotiation',
  'summary': 'Battle Report',
  'analytics': 'Analytics Dashboard'
}