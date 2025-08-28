import { useState, useEffect, useCallback } from 'react'
import { sessionHistoryService } from '../services/sessionHistory'
import { HistoryAnalytics, SessionHistoryEntry } from '../types/history'
import { SessionData } from '../types/session'

export interface UseSessionHistoryReturn {
  history: SessionHistoryEntry[]
  analytics: HistoryAnalytics | null
  isLoading: boolean
  error: string | null
  saveSession: (sessionData: SessionData, outcome: 'resolved' | 'stalemate' | 'abandoned') => Promise<string>
  updateRating: (sessionId: string, player: 'player1' | 'player2', rating: number) => Promise<void>
  refreshHistory: () => Promise<void>
  clearHistory: () => Promise<void>
  exportHistory: () => Promise<string>
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([])
  const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [historyData, analyticsData] = await Promise.all([
        sessionHistoryService.getHistory(),
        sessionHistoryService.generateHistoryAnalytics()
      ])
      
      setHistory(historyData)
      setAnalytics(analyticsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session history'
      setError(errorMessage)
      console.error('Failed to load session history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const saveSession = useCallback(async (
    sessionData: SessionData, 
    outcome: 'resolved' | 'stalemate' | 'abandoned'
  ): Promise<string> => {
    try {
      const sessionId = await sessionHistoryService.saveSession(sessionData, outcome)
      await loadHistory() // Refresh data after saving
      return sessionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save session'
      setError(errorMessage)
      throw err
    }
  }, [loadHistory])

  const updateRating = useCallback(async (
    sessionId: string, 
    player: 'player1' | 'player2', 
    rating: number
  ): Promise<void> => {
    try {
      await sessionHistoryService.updateSatisfactionRating(sessionId, player, rating)
      await loadHistory() // Refresh data after rating update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save rating'
      setError(errorMessage)
      throw err
    }
  }, [loadHistory])

  const refreshHistory = useCallback(async (): Promise<void> => {
    await loadHistory()
  }, [loadHistory])

  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      await sessionHistoryService.clearHistory()
      setHistory([])
      setAnalytics(null)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history'
      setError(errorMessage)
      throw err
    }
  }, [])

  const exportHistory = useCallback(async (): Promise<string> => {
    try {
      return await sessionHistoryService.exportHistory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export history'
      setError(errorMessage)
      throw err
    }
  }, [])

  return {
    history,
    analytics,
    isLoading,
    error,
    saveSession,
    updateRating,
    refreshHistory,
    clearHistory,
    exportHistory
  }
}

export default useSessionHistory