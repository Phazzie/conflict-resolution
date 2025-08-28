import { SessionData, SessionParticipant, PlayerRole, Message } from '@/types/session'

/**
 * Real-time session management service
 * Handles WebSocket connections, session synchronization, and multiplayer state
 */
export class RealTimeSessionService {
  private static instance: RealTimeSessionService
  private ws: WebSocket | null = null
  private sessionId: string | null = null
  private currentPlayer: PlayerRole | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private typingTimeout: NodeJS.Timeout | null = null

  // Event callbacks
  private onSessionUpdate: ((data: Partial<SessionData>) => void) | null = null
  private onParticipantUpdate: ((participants: SessionParticipant[]) => void) | null = null
  private onError: ((error: string) => void) | null = null
  private onConnectionStatus: ((connected: boolean) => void) | null = null

  public static getInstance(): RealTimeSessionService {
    if (!RealTimeSessionService.instance) {
      RealTimeSessionService.instance = new RealTimeSessionService()
    }
    return RealTimeSessionService.instance
  }

  /**
   * Initialize real-time session
   */
  async initializeSession(
    sessionId: string,
    playerRole: PlayerRole,
    callbacks: {
      onSessionUpdate: (data: Partial<SessionData>) => void
      onParticipantUpdate: (participants: SessionParticipant[]) => void
      onError: (error: string) => void
      onConnectionStatus: (connected: boolean) => void
    }
  ): Promise<void> {
    this.sessionId = sessionId
    this.currentPlayer = playerRole
    this.onSessionUpdate = callbacks.onSessionUpdate
    this.onParticipantUpdate = callbacks.onParticipantUpdate
    this.onError = callbacks.onError
    this.onConnectionStatus = callbacks.onConnectionStatus

    // For now, simulate WebSocket with localStorage events
    // TODO: Replace with actual WebSocket when backend is ready
    await this.initializeLocalStorageSync()
  }

  /**
   * Temporary implementation using localStorage events for cross-tab communication
   * This simulates real-time updates until proper WebSocket backend is implemented
   */
  private async initializeLocalStorageSync(): Promise<void> {
    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', this.handleStorageChange.bind(this))

    // Set up participant tracking
    this.updateParticipantStatus(true, false)

    // Simulate connection
    this.onConnectionStatus?.(true)

    // Set up heartbeat to maintain participant status
    this.heartbeatInterval = setInterval(() => {
      this.updateParticipantStatus(true, false)
    }, 30000) // Update every 30 seconds

    console.log('Local storage sync initialized for session:', this.sessionId)
  }

  /**
   * Handle storage changes from other tabs (simulating WebSocket messages)
   */
  private handleStorageChange(event: StorageEvent): void {
    if (!event.key?.startsWith(`mixitfixit-sync-${this.sessionId}-`)) return

    try {
      const data = event.newValue ? JSON.parse(event.newValue) : null
      if (!data) return

      const eventType = event.key.split('-').pop()

      switch (eventType) {
        case 'session':
          this.onSessionUpdate?.(data)
          break
        case 'participants':
          this.onParticipantUpdate?.(data)
          break
        case 'typing':
          this.handleTypingUpdate(data)
          break
      }
    } catch (error) {
      console.error('Error handling storage change:', error)
    }
  }

  /**
   * Update session data across all participants
   */
  async updateSession(updates: Partial<SessionData>): Promise<void> {
    if (!this.sessionId) {
      console.error('No active session')
      return
    }

    try {
      // Store in localStorage for persistence
      const currentSession = this.getCurrentSession()
      const updatedSession = { ...currentSession, ...updates }
      localStorage.setItem(`mixitfixit-session`, JSON.stringify(updatedSession))

      // Broadcast to other participants via localStorage event
      localStorage.setItem(
        `mixitfixit-sync-${this.sessionId}-session`,
        JSON.stringify(updates)
      )

      console.log('Session updated:', updates)
    } catch (error) {
      console.error('Failed to update session:', error)
      this.onError?.('Failed to sync session updates')
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now()
    }

    const currentSession = this.getCurrentSession()
    const updatedMessages = [...(currentSession.messages || []), fullMessage]

    await this.updateSession({ messages: updatedMessages })
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(isTyping: boolean): Promise<void> {
    if (!this.currentPlayer || !this.sessionId) return

    // Clear existing typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }

    // Update participant status
    this.updateParticipantStatus(true, isTyping)

    // Auto-clear typing status after 3 seconds
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.updateParticipantStatus(true, false)
      }, 3000)
    }
  }

  /**
   * Update participant status
   */
  private updateParticipantStatus(isOnline: boolean, isTyping: boolean): void {
    if (!this.currentPlayer || !this.sessionId) return

    const participants = this.getParticipants()
    const updatedParticipants = participants.map(p => 
      p.playerId === this.currentPlayer 
        ? { ...p, isOnline, isTyping, lastSeen: Date.now() }
        : p
    )

    // Add current participant if not exists
    if (!updatedParticipants.find(p => p.playerId === this.currentPlayer)) {
      updatedParticipants.push({
        playerId: this.currentPlayer,
        isOnline,
        isTyping,
        lastSeen: Date.now()
      })
    }

    localStorage.setItem(
      `mixitfixit-participants-${this.sessionId}`,
      JSON.stringify(updatedParticipants)
    )

    // Broadcast participant update
    localStorage.setItem(
      `mixitfixit-sync-${this.sessionId}-participants`,
      JSON.stringify(updatedParticipants)
    )
  }

  /**
   * Get current participants
   */
  private getParticipants(): SessionParticipant[] {
    if (!this.sessionId) return []

    try {
      const stored = localStorage.getItem(`mixitfixit-participants-${this.sessionId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get current session data
   */
  private getCurrentSession(): SessionData {
    try {
      const stored = localStorage.getItem('mixitfixit-session')
      return stored ? JSON.parse(stored) : this.getDefaultSession()
    } catch {
      return this.getDefaultSession()
    }
  }

  /**
   * Get default session structure
   */
  private getDefaultSession(): SessionData {
    return {
      phase: 'welcome',
      agreedIssue: '',
      playerOneSteelMan: '',
      playerTwoSteelMan: '',
      playerOneStatement: '',
      playerTwoStatement: '',
      messages: [],
      proposedResolution: '',
      finalResolution: '',
      sessionStarted: Date.now(),
      isMultiplayer: true,
      sessionId: this.sessionId || undefined
    }
  }

  /**
   * Handle typing updates from other participants
   */
  private handleTypingUpdate(data: SessionParticipant[]): void {
    const otherParticipants = data.filter(p => p.playerId !== this.currentPlayer)
    this.onParticipantUpdate?.(data)
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create or join a session
   */
  async createSession(): Promise<string> {
    const sessionId = this.generateSessionId()
    this.sessionId = sessionId
    
    // Initialize session data
    const sessionData: SessionData = {
      ...this.getDefaultSession(),
      sessionId,
      isMultiplayer: true,
      participants: []
    }

    localStorage.setItem('mixitfixit-session', JSON.stringify(sessionData))
    
    return sessionId
  }

  /**
   * Join existing session
   */
  async joinSession(sessionId: string, playerRole: PlayerRole): Promise<boolean> {
    // Check if session exists (in real implementation, would check backend)
    const sessionKey = `mixitfixit-session-${sessionId}`
    const existingSession = localStorage.getItem(sessionKey)
    
    if (!existingSession) {
      this.onError?.('Session not found')
      return false
    }

    this.sessionId = sessionId
    this.currentPlayer = playerRole

    return true
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Get session invitation link
   */
  getSessionInviteLink(): string | null {
    if (!this.sessionId) return null
    
    const baseUrl = window.location.origin + window.location.pathname
    return `${baseUrl}?session=${this.sessionId}&join=true`
  }

  /**
   * Cleanup and disconnect
   */
  disconnect(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }

    // Update participant status to offline
    if (this.currentPlayer) {
      this.updateParticipantStatus(false, false)
    }

    // Remove event listener
    window.removeEventListener('storage', this.handleStorageChange.bind(this))

    // Close WebSocket if exists
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Update connection status
    this.onConnectionStatus?.(false)

    // Clear session data
    this.sessionId = null
    this.currentPlayer = null
    this.onSessionUpdate = null
    this.onParticipantUpdate = null
    this.onError = null
    this.onConnectionStatus = null

    console.log('Real-time session disconnected')
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.sessionId !== null
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Check if session supports multiple participants
   */
  isMultiplayerSession(): boolean {
    const session = this.getCurrentSession()
    return session.isMultiplayer || false
  }
}

// Export singleton instance
export const realTimeSessionService = RealTimeSessionService.getInstance()