/**
 * React Hook for Real-Time Session Management
 * 
 * Integrates WebSocket communication with the existing session system.
 * Handles synchronization, conflict resolution, and connection management.
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { websocketService, ConnectionState } from '@/services/websocketService'
import { SessionData, PlayerRole, Message, SessionParticipant } from '@/types/session'
import { toast } from 'sonner'

export interface MultiplayerState {
  isConnected: boolean
  isReconnecting: boolean
  participants: SessionParticipant[]
  connectionError: string | null
  lastSync: number
}

export interface MultiplayerActions {
  connectToSession: (sessionId: string, playerId: PlayerRole) => Promise<boolean>
  disconnectFromSession: () => void
  syncSessionData: (updates: Partial<SessionData>) => void
  sendMessage: (message: Message) => void
  setTypingStatus: (isTyping: boolean) => void
}

interface UseMultiplayerSessionProps {
  sessionData: SessionData | null
  onSessionUpdate: (updates: Partial<SessionData>) => void
  onNewMessage: (message: Message) => void
  enabled?: boolean
}

export function useMultiplayerSession({
  sessionData,
  onSessionUpdate,
  onNewMessage,
  enabled = true
}: UseMultiplayerSessionProps): MultiplayerState & MultiplayerActions {
  
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>({
    isConnected: false,
    isReconnecting: false,
    participants: [],
    connectionError: null,
    lastSync: 0
  })
  
  const isInitialized = useRef(false)
  const lastUpdateTime = useRef(Date.now())
  const syncLock = useRef(false)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize WebSocket event handlers
  useEffect(() => {
    if (!enabled || isInitialized.current) return

    // Handle session updates from other clients
    websocketService.onSessionUpdateReceived((updates: Partial<SessionData>) => {
      // Prevent sync loops by checking if this is a recent local update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.current
      if (timeSinceLastUpdate < 1000 && syncLock.current) {
        return
      }

      console.log('Received session update from peer:', updates)
      
      // Merge updates intelligently to prevent conflicts
      const mergedUpdates = mergeSessionUpdates(sessionData, updates)
      if (mergedUpdates) {
        syncLock.current = true
        onSessionUpdate(mergedUpdates)
        
        setMultiplayerState(prev => ({
          ...prev,
          lastSync: Date.now()
        }))
        
        // Release sync lock after a brief delay
        setTimeout(() => {
          syncLock.current = false
        }, 500)
      }
    })

    // Handle incoming messages
    websocketService.onMessageReceived((message: Message) => {
      console.log('Received message from peer:', message)
      onNewMessage(message)
    })

    // Handle participant updates
    websocketService.onParticipantUpdateReceived((participants: SessionParticipant[]) => {
      setMultiplayerState(prev => ({
        ...prev,
        participants
      }))
    })

    // Handle connection state changes
    websocketService.onConnectionStateChange((state: ConnectionState) => {
      setMultiplayerState(prev => ({
        ...prev,
        isConnected: state.isConnected,
        isReconnecting: state.isReconnecting,
        connectionError: null
      }))

      if (state.isConnected && prev.isReconnecting) {
        toast.success('Reconnected to session')
      } else if (!state.isConnected && prev.isConnected) {
        toast.warning('Connection lost. Attempting to reconnect...')
      }
    })

    // Handle errors
    websocketService.onErrorReceived((error: Error) => {
      console.error('WebSocket error:', error)
      setMultiplayerState(prev => ({
        ...prev,
        connectionError: error.message
      }))
      
      toast.error(`Connection error: ${error.message}`)
    })

    isInitialized.current = true
  }, [enabled, sessionData, onSessionUpdate, onNewMessage])

  // Connect to multiplayer session
  const connectToSession = useCallback(async (sessionId: string, playerId: PlayerRole): Promise<boolean> => {
    if (!enabled) return false
    
    try {
      setMultiplayerState(prev => ({
        ...prev,
        connectionError: null,
        isReconnecting: true
      }))

      const connected = await websocketService.connect(sessionId, playerId)
      
      if (connected) {
        toast.success('Connected to multiplayer session')
        
        // Set up connection timeout monitoring
        connectionTimeoutRef.current = setTimeout(() => {
          if (!websocketService.isReady()) {
            setMultiplayerState(prev => ({
              ...prev,
              connectionError: 'Connection timeout'
            }))
          }
        }, 10000)
        
        return true
      } else {
        throw new Error('Failed to establish connection')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed'
      setMultiplayerState(prev => ({
        ...prev,
        connectionError: errorMsg,
        isConnected: false,
        isReconnecting: false
      }))
      
      toast.error(`Failed to connect: ${errorMsg}`)
      return false
    }
  }, [enabled])

  // Disconnect from session
  const disconnectFromSession = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
    
    websocketService.disconnect()
    
    setMultiplayerState({
      isConnected: false,
      isReconnecting: false,
      participants: [],
      connectionError: null,
      lastSync: 0
    })
    
    toast.info('Disconnected from multiplayer session')
  }, [])

  // Sync session data to other participants
  const syncSessionData = useCallback((updates: Partial<SessionData>) => {
    if (!enabled || !websocketService.isReady() || syncLock.current) {
      return
    }

    // Track when we send updates to prevent sync loops
    lastUpdateTime.current = Date.now()
    
    console.log('Syncing session updates to peers:', updates)
    websocketService.sendSessionUpdate(updates)
    
    setMultiplayerState(prev => ({
      ...prev,
      lastSync: Date.now()
    }))
  }, [enabled])

  // Send a message
  const sendMessage = useCallback((message: Message) => {
    if (!enabled || !websocketService.isReady()) {
      return
    }

    console.log('Sending message to peers:', message)
    websocketService.sendChatMessage(message)
  }, [enabled])

  // Set typing status
  const setTypingStatus = useCallback((isTyping: boolean) => {
    if (!enabled || !websocketService.isReady()) {
      return
    }

    websocketService.sendTypingStatus(isTyping)
  }, [enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      websocketService.disconnect()
    }
  }, [])

  return {
    // State
    ...multiplayerState,
    
    // Actions
    connectToSession,
    disconnectFromSession,
    syncSessionData,
    sendMessage,
    setTypingStatus
  }
}

/**
 * Intelligently merge session updates to prevent conflicts
 */
function mergeSessionUpdates(
  currentSession: SessionData | null,
  incomingUpdates: Partial<SessionData>
): Partial<SessionData> | null {
  
  if (!currentSession) {
    return incomingUpdates
  }

  const merged: Partial<SessionData> = {}
  let hasChanges = false

  // Handle phase changes carefully
  if (incomingUpdates.phase && incomingUpdates.phase !== currentSession.phase) {
    merged.phase = incomingUpdates.phase
    hasChanges = true
  }

  // Merge messages (append new ones, avoid duplicates)
  if (incomingUpdates.messages) {
    const currentMessages = currentSession.messages || []
    const incomingMessages = incomingUpdates.messages
    
    const mergedMessages = [...currentMessages]
    
    for (const incomingMsg of incomingMessages) {
      const exists = mergedMessages.some(msg => msg.id === incomingMsg.id)
      if (!exists) {
        mergedMessages.push(incomingMsg)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      // Sort by timestamp to maintain order
      mergedMessages.sort((a, b) => a.timestamp - b.timestamp)
      merged.messages = mergedMessages
    }
  }

  // Handle text fields - use timestamp-based conflict resolution
  const textFields: (keyof SessionData)[] = [
    'agreedIssue',
    'playerOneSteelMan', 
    'playerTwoSteelMan',
    'playerOneStatement',
    'playerTwoStatement',
    'proposedResolution',
    'finalResolution'
  ]

  for (const field of textFields) {
    const incomingValue = incomingUpdates[field]
    const currentValue = currentSession[field]
    
    if (incomingValue !== undefined && incomingValue !== currentValue) {
      merged[field] = incomingValue as any
      hasChanges = true
    }
  }

  // Merge participant updates
  if (incomingUpdates.participants) {
    merged.participants = incomingUpdates.participants
    hasChanges = true
  }

  // Copy other simple fields
  const simpleFields: (keyof SessionData)[] = [
    'conflictContext',
    'isMultiplayer',
    'sessionId'
  ]

  for (const field of simpleFields) {
    const incomingValue = incomingUpdates[field]
    if (incomingValue !== undefined && incomingValue !== currentSession[field]) {
      merged[field] = incomingValue as any
      hasChanges = true
    }
  }

  return hasChanges ? merged : null
}

export default useMultiplayerSession