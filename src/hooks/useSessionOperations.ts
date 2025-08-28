import { useState, useCallback } from 'react'
import { PlayerRole, SessionData } from '@/types/session'
import { analyticsService } from '@/services/analytics'
import { sessionHistoryService } from '@/services/sessionHistory'
import { machineLearningService } from '@/services/mlServiceOptimized'

/**
 * Custom hook for player role management and session operations
 */
export function usePlayerManagement() {
  const [currentPlayer] = useState<PlayerRole>(() => {
    // Try to recover existing player role, or assign new one
    const savedPlayer = localStorage.getItem('mixitfixit-player-role')
    if (savedPlayer && (savedPlayer === 'player1' || savedPlayer === 'player2')) {
      return savedPlayer as PlayerRole
    }
    const newPlayer = Math.random() > 0.5 ? 'player1' : 'player2'
    localStorage.setItem('mixitfixit-player-role', newPlayer)
    return newPlayer
  })

  return {
    currentPlayer
  }
}

/**
 * Custom hook for session analytics and operations
 */
export function useSessionOperations(
  sessionData: SessionData,
  updateSessionData: (updates: Partial<SessionData>) => void
) {
  const viewAnalytics = useCallback(async () => {
    // Generate analytics for current session before showing dashboard
    if (sessionData && sessionData.messages.length > 0) {
      try {
        const analytics = await analyticsService.generateSessionAnalytics(sessionData)
        console.log('Generated session analytics:', analytics)
      } catch (error) {
        console.error('Failed to generate session analytics:', error)
      }
    }
    updateSessionData({ phase: 'analytics' })
  }, [sessionData, updateSessionData])

  const viewHistory = useCallback(() => {
    updateSessionData({ phase: 'history' })
  }, [updateSessionData])

  const viewCouplesDashboard = useCallback(() => {
    updateSessionData({ phase: 'couples-dashboard' })
  }, [updateSessionData])

  const viewPatternRecognition = useCallback(() => {
    updateSessionData({ phase: 'pattern-recognition' })
  }, [updateSessionData])

  const viewMLInsights = useCallback(() => {
    updateSessionData({ phase: 'ml-insights' })
  }, [updateSessionData])

  const saveCurrentSession = useCallback(async (outcome: 'resolved' | 'stalemate' | 'abandoned') => {
    if (sessionData && (sessionData.agreedIssue || sessionData.messages.length > 0)) {
      try {
        // Save to session history
        await sessionHistoryService.saveSession(sessionData, outcome)
        console.log(`Session saved to history with outcome: ${outcome}`)
        
        // Learn from session outcome in ML model
        await machineLearningService.learnFromSessionOutcome(sessionData, outcome)
        console.log(`ML model updated with session outcome: ${outcome}`)
      } catch (error) {
        console.error('Failed to save session or update ML model:', error)
      }
    }
  }, [sessionData])

  const exportAnalytics = useCallback((data: string) => {
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mixitfixit-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return {
    viewAnalytics,
    viewHistory,
    viewCouplesDashboard,
    viewPatternRecognition,
    viewMLInsights,
    saveCurrentSession,
    exportAnalytics
  }
}

/**
 * Custom hook for multiplayer session management
 */
export function useMultiplayerSession(
  currentPlayer: PlayerRole,
  updateSessionData: (updates: Partial<SessionData>) => void
) {
  const enableMultiplayer = useCallback(() => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    updateSessionData({
      isMultiplayer: true,
      sessionId,
      participants: [{
        playerId: currentPlayer,
        isOnline: true,
        lastSeen: Date.now(),
        isTyping: false
      }]
    })
  }, [currentPlayer, updateSessionData])

  const joinSession = useCallback(async (sessionId: string): Promise<boolean> => {
    // TODO: Implement actual session joining logic
    // For now, simulate joining
    updateSessionData({
      isMultiplayer: true,
      sessionId,
      participants: [
        { playerId: 'player1', isOnline: true, lastSeen: Date.now(), isTyping: false },
        { playerId: 'player2', isOnline: true, lastSeen: Date.now(), isTyping: false }
      ]
    })
    return true
  }, [updateSessionData])

  return {
    enableMultiplayer,
    joinSession
  }
}