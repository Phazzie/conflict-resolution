/**
 * Unified session persistence - No more localStorage/useKV mixing bullshit
 * 
 * This module centralizes all session storage operations to prevent the current
 * clusterfuck of mixed storage patterns that cause data loss.
 */

import { useKV } from '@github/spark/hooks'
import { SessionData, PlayerRole, Message } from '@/types/session'
import { validateSessionData, attemptSessionRecovery } from '@/utils/validation'
import { useMultiplayerSession } from './useMultiplayerSession'
import { useCallback } from 'react'

// RULE: Everything session-related goes through useKV. No exceptions.
// localStorage is only for truly ephemeral shit that doesn't matter if lost.

export interface SessionPersistenceState {
  sessionData: SessionData | null
  playerRole: PlayerRole
  multiplayer: {
    sessionId?: string
    isHost: boolean
    isConnected: boolean
  }
}

/**
 * The One True Session Hook - replaces all the scattered session management
 */
export function useUnifiedSession() {
  // Main session data - persists between browser sessions
  const [sessionData, setSessionData] = useKV<SessionData>('mixitfixit-session', {
    phase: 'welcome',
    conflictContext: 'relationship',
    agreedIssue: '',
    playerOneSteelMan: '',
    playerTwoSteelMan: '',
    playerOneStatement: '',
    playerTwoStatement: '',
    messages: [],
    proposedResolution: '',
    finalResolution: '',
    sessionStarted: Date.now()
  })

  // Player role - should persist but can be regenerated if lost
  const [playerRole, setPlayerRole] = useKV<PlayerRole>('mixitfixit-player-role', () => {
    return Math.random() > 0.5 ? 'player1' : 'player2'
  })

  // Multiplayer state - persists for session sharing
  const [multiplayerState, setMultiplayerState] = useKV<{
    sessionId?: string
    isHost: boolean
    isConnected: boolean
    enabled: boolean
  }>('mixitfixit-multiplayer', {
    isHost: false,
    isConnected: false,
    enabled: false
  })

  /**
   * Handle incoming multiplayer session updates
   */
  const handleMultiplayerUpdate = useCallback((updates: Partial<SessionData>) => {
    setSessionData(current => {
      if (!current) return current
      
      const newData = { ...current, ...updates }
      const validation = validateSessionData(newData)
      
      if (!validation.isValid) {
        console.error('Multiplayer update blocked:', validation.error)
        return current
      }
      
      return newData
    })
  }, [])

  /**
   * Handle new multiplayer messages
   */
  const handleMultiplayerMessage = useCallback((message: Message) => {
    setSessionData(current => {
      if (!current) return current
      
      const existingMessage = current.messages.find(m => m.id === message.id)
      if (existingMessage) {
        return current // Already have this message
      }
      
      const updatedMessages = [...current.messages, message]
        .sort((a, b) => a.timestamp - b.timestamp)
      
      return {
        ...current,
        messages: updatedMessages
      }
    })
  }, [])

  // Initialize multiplayer functionality after callbacks are defined
  const multiplayerSync = useMultiplayerSession({
    sessionData,
    onSessionUpdate: handleMultiplayerUpdate,
    onNewMessage: handleMultiplayerMessage,
    enabled: multiplayerState.enabled
  })

  /**
   * Update session data with validation and multiplayer sync
   */
  const updateSession = useCallback((updates: Partial<SessionData>) => {
    setSessionData(current => {
      if (!current) return current
      
      const newData = { ...current, ...updates }
      const validation = validateSessionData(newData)
      
      if (!validation.isValid) {
        console.error('Session update blocked:', validation.error)
        // Don't update if it would corrupt the session
        return current
      }
      
      // Sync to multiplayer if enabled
      if (multiplayerState.enabled && multiplayerSync.syncSessionData) {
        multiplayerSync.syncSessionData(updates)
      }
      
      return newData
    })
  }, [multiplayerState.enabled, multiplayerSync])



  /**
   * Reset everything to clean state
   */
  const resetSession = () => {
    // Disconnect from multiplayer first
    if (multiplayerState.enabled && multiplayerSync.disconnectFromSession) {
      multiplayerSync.disconnectFromSession()
    }
    
    setSessionData({
      phase: 'welcome',
      conflictContext: 'relationship',
      agreedIssue: '',
      playerOneSteelMan: '',
      playerTwoSteelMan: '',
      playerOneStatement: '',
      playerTwoStatement: '',
      messages: [],
      proposedResolution: '',
      finalResolution: '',
      sessionStarted: Date.now()
    })
    
    setMultiplayerState({
      isHost: false,
      isConnected: false,
      enabled: false
    })
    
    // Don't reset player role - let them keep their assigned role
  }

  /**
   * Enable multiplayer hosting
   */
  const enableMultiplayer = async (): Promise<string | null> => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    
    try {
      // Connect to WebSocket first
      const connected = await multiplayerSync.connectToSession(sessionId, playerRole)
      
      if (!connected) {
        throw new Error('Failed to establish multiplayer connection')
      }
      
      setMultiplayerState({
        sessionId,
        isHost: true,
        isConnected: true,
        enabled: true
      })
      
      updateSession({
        isMultiplayer: true,
        sessionId,
        participants: [{
          playerId: playerRole,
          isOnline: true,
          lastSeen: Date.now(),
          isTyping: false
        }]
      })
      
      return sessionId
    } catch (error) {
      console.error('Failed to enable multiplayer:', error)
      return null
    }
  }

  /**
   * Join existing multiplayer session
   */
  const joinSession = async (sessionId: string): Promise<boolean> => {
    // Basic session ID validation
    if (!sessionId || !sessionId.match(/^session-\d+-[a-z0-9]{6}$/)) {
      return false
    }

    try {
      // Connect to WebSocket first
      const connected = await multiplayerSync.connectToSession(sessionId, playerRole)
      
      if (!connected) {
        throw new Error('Failed to join multiplayer session')
      }

      setMultiplayerState({
        sessionId,
        isHost: false,
        isConnected: true,
        enabled: true
      })
      
      updateSession({
        isMultiplayer: true,
        sessionId,
        participants: [
          { playerId: 'player1', isOnline: true, lastSeen: Date.now(), isTyping: false },
          { playerId: 'player2', isOnline: true, lastSeen: Date.now(), isTyping: false }
        ]
      })
      
      return true
    } catch (error) {
      console.error('Failed to join session:', error)
      return false
    }
  }

  /**
   * Validate current session and attempt recovery if corrupted
   */
  const validateAndRecoverSession = (): {
    isValid: boolean
    warnings?: string[]
    error?: string
  } => {
    if (!sessionData) {
      return { isValid: false, error: 'No session data found' }
    }

    const validation = validateSessionData(sessionData)
    
    if (!validation.isValid) {
      // Attempt recovery
      const recovery = attemptSessionRecovery(sessionData)
      
      if (recovery.recovered && recovery.sessionData) {
        setSessionData(recovery.sessionData)
        return {
          isValid: true,
          warnings: [
            'Session was recovered from corrupted data',
            ...(recovery.warnings || [])
          ]
        }
      }
      
      return {
        isValid: false,
        error: validation.error || 'Session validation failed'
      }
    }
    
    return {
      isValid: true,
      warnings: validation.warnings
    }
  }

  return {
    // State
    sessionData,
    playerRole,
    isMultiplayer: !!multiplayerState.sessionId,
    sessionId: multiplayerState.sessionId,
    isHost: multiplayerState.isHost,
    isConnected: multiplayerState.isConnected,
    
    // Multiplayer connection state
    multiplayerConnectionState: {
      isConnected: multiplayerSync.isConnected,
      isReconnecting: multiplayerSync.isReconnecting,
      participants: multiplayerSync.participants,
      connectionError: multiplayerSync.connectionError
    },
    
    // Actions
    updateSession,
    resetSession,
    enableMultiplayer,
    joinSession,
    validateAndRecoverSession,
    
    // Multiplayer actions
    sendMessage: multiplayerSync.sendMessage,
    setTypingStatus: multiplayerSync.setTypingStatus,
    disconnectMultiplayer: multiplayerSync.disconnectFromSession,
    
    // Utilities
    hasActiveSession: sessionData && sessionData.phase !== 'welcome' && 
      (sessionData.agreedIssue || sessionData.messages.length > 0)
  }
}

/**
 * Clean up any legacy localStorage data
 * Call this during app initialization to migrate old data
 */
export function migrateLegacySessionData() {
  try {
    // Check for old localStorage session data
    const legacySessionData = localStorage.getItem('mixitfixit-session')
    const legacyPlayerRole = localStorage.getItem('mixitfixit-player-role')
    
    if (legacySessionData || legacyPlayerRole) {
      console.log('Found legacy session data, cleaning up...')
      
      // Don't try to migrate - just clean up
      localStorage.removeItem('mixitfixit-session')
      localStorage.removeItem('mixitfixit-player-role')
      
      // Clean up any shared session data too
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('mixitfixit-shared-')) {
          localStorage.removeItem(key)
        }
      }
      
      console.log('Legacy session data cleaned up')
    }
  } catch (error) {
    console.warn('Failed to clean legacy session data:', error)
  }
}

/**
 * Export session data for debugging/support
 */
export function exportSessionDiagnostics() {
  return {
    timestamp: Date.now(),
    sessionValid: !!sessionData,
    sessionPhase: sessionData?.phase || 'unknown',
    hasActiveSession: sessionData && sessionData.phase !== 'welcome',
    messageCount: sessionData?.messages?.length || 0,
    isMultiplayer: !!sessionData?.isMultiplayer,
    storageKeys: Object.keys(localStorage).filter(k => k.startsWith('mixitfixit')),
    userAgent: navigator.userAgent,
    storageQuota: (() => {
      try {
        return 'localStorage' in window && window.localStorage !== null
      } catch {
        return false
      }
    })()
  }
}