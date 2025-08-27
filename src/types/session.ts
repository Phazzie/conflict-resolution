export type SessionPhase = 'welcome' | 'issue-agreement' | 'steel-manning' | 'statement-locking' | 'discussion' | 'resolution' | 'summary'

export interface Message {
  id: string
  author: 'player1' | 'player2' | 'ai'
  content: string
  timestamp: number
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
  'summary': 100
}

export const PHASE_NAMES: Record<SessionPhase, string> = {
  'welcome': 'Digital Thunderdome Entry',
  'issue-agreement': 'Issue Agreement',
  'steel-manning': 'Steel-Manning Phase',
  'statement-locking': 'Statement Locking',
  'discussion': 'Moderated Discussion', 
  'resolution': 'Resolution Negotiation',
  'summary': 'Battle Report'
}