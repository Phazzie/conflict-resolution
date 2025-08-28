/**
 * Real-time session service - localStorage-based implementation
 * Production version would use WebSockets, but this provides basic functionality
 */

export interface RealTimeCallbacks {
  onSessionUpdate?: (updates: any) => void
  onParticipantUpdate?: (participants: any[]) => void
  onError?: (error: Error) => void
  onConnectionStatus?: (connected: boolean) => void
}

export interface SessionParticipant {
  playerId: string
  isOnline: boolean
  lastSeen: number
  isTyping: boolean
}

class RealTimeSessionService {
  private callbacks: RealTimeCallbacks = {}
  private isConnected = false
  private currentSessionId: string | null = null
  private currentPlayerId: string | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL_MS = 1000 // Poll every second

  initializeSession(sessionId: string, playerId: string, callbacks: RealTimeCallbacks) {
    this.callbacks = callbacks
    this.currentSessionId = sessionId
    this.currentPlayerId = playerId
    this.isConnected = true
    
    // Start syncing with localStorage-based "real-time" updates
    this.startSyncLoop()
    
    // Update our presence
    this.updateParticipantPresence(true, false)
    
    this.callbacks.onConnectionStatus?.(true)
    console.log('Real-time session initialized', { sessionId, playerId })
  }

  disconnect() {
    this.isConnected = false
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    // Mark ourselves as offline
    if (this.currentSessionId && this.currentPlayerId) {
      this.updateParticipantPresence(false, false)
    }
    
    this.callbacks.onConnectionStatus?.(false)
    this.callbacks = {}
    this.currentSessionId = null
    this.currentPlayerId = null
    
    console.log('Real-time session disconnected')
  }

  updateTypingStatus(isTyping: boolean) {
    if (!this.currentSessionId || !this.currentPlayerId) return
    
    this.updateParticipantPresence(true, isTyping)
    console.log('Typing status updated', { isTyping })
  }

  async sendMessage(message: any) {
    if (!this.currentSessionId) {
      throw new Error('No active session')
    }
    
    try {
      // Store message in shared session
      const sessionKey = `mixitfixit-shared-${this.currentSessionId}`
      const existingData = localStorage.getItem(sessionKey)
      
      if (existingData) {
        const sessionData = JSON.parse(existingData)
        sessionData.messages = sessionData.messages || []
        sessionData.messages.push(message)
        sessionData.lastUpdated = Date.now()
        
        localStorage.setItem(sessionKey, JSON.stringify(sessionData))
        console.log('Message sent to shared session', message)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  private startSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    this.syncInterval = setInterval(() => {
      this.syncWithSharedSession()
    }, this.SYNC_INTERVAL_MS)
  }

  private syncWithSharedSession() {
    if (!this.currentSessionId || !this.isConnected) return
    
    try {
      const sessionKey = `mixitfixit-shared-${this.currentSessionId}`
      const sharedData = localStorage.getItem(sessionKey)
      
      if (sharedData) {
        const sessionData = JSON.parse(sharedData)
        
        // Check for updates from other participants
        const lastUpdated = sessionData.lastUpdated || 0
        const lastSyncTime = parseInt(localStorage.getItem(`${sessionKey}_last_sync`) || '0')
        
        if (lastUpdated > lastSyncTime) {
          // Notify about session updates
          this.callbacks.onSessionUpdate?.(sessionData)
          localStorage.setItem(`${sessionKey}_last_sync`, lastUpdated.toString())
        }
        
        // Update participant status
        this.callbacks.onParticipantUpdate?.(sessionData.participants || [])
      }
    } catch (error) {
      console.error('Sync error:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  private updateParticipantPresence(isOnline: boolean, isTyping: boolean) {
    if (!this.currentSessionId || !this.currentPlayerId) return
    
    try {
      const sessionKey = `mixitfixit-shared-${this.currentSessionId}`
      const existingData = localStorage.getItem(sessionKey)
      
      if (existingData) {
        const sessionData = JSON.parse(existingData)
        sessionData.participants = sessionData.participants || []
        
        // Update or add our participant record
        const participantIndex = sessionData.participants.findIndex(
          (p: SessionParticipant) => p.playerId === this.currentPlayerId
        )
        
        const participantData: SessionParticipant = {
          playerId: this.currentPlayerId,
          isOnline,
          lastSeen: Date.now(),
          isTyping
        }
        
        if (participantIndex >= 0) {
          sessionData.participants[participantIndex] = participantData
        } else {
          sessionData.participants.push(participantData)
        }
        
        sessionData.lastUpdated = Date.now()
        localStorage.setItem(sessionKey, JSON.stringify(sessionData))
      }
    } catch (error) {
      console.error('Failed to update participant presence:', error)
    }
  }

  // Public method to get current session state
  getCurrentSessionState(): any {
    if (!this.currentSessionId) return null
    
    try {
      const sessionKey = `mixitfixit-shared-${this.currentSessionId}`
      const sharedData = localStorage.getItem(sessionKey)
      return sharedData ? JSON.parse(sharedData) : null
    } catch (error) {
      console.error('Failed to get current session state:', error)
      return null
    }
  }

  // Clean up old participants (offline for more than 5 minutes)
  cleanupOfflineParticipants() {
    if (!this.currentSessionId) return
    
    try {
      const sessionKey = `mixitfixit-shared-${this.currentSessionId}`
      const existingData = localStorage.getItem(sessionKey)
      
      if (existingData) {
        const sessionData = JSON.parse(existingData)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        
        sessionData.participants = (sessionData.participants || []).filter(
          (p: SessionParticipant) => p.isOnline || p.lastSeen > fiveMinutesAgo
        )
        
        localStorage.setItem(sessionKey, JSON.stringify(sessionData))
      }
    } catch (error) {
      console.error('Failed to cleanup offline participants:', error)
    }
  }
}

export const realTimeSessionService = new RealTimeSessionService()