/**
 * WebSocket Service for Real-Time Multiplayer Synchronization
 * 
 * Handles bi-directional communication, connection management, and state sync
 * between participants in conflict resolution sessions.
 */

import { SessionData, PlayerRole, Message, SessionParticipant } from '@/types/session'

export interface WebSocketMessage {
  type: 'session_update' | 'message' | 'typing' | 'participant_update' | 'phase_change' | 'connection' | 'error'
  sessionId: string
  playerId: PlayerRole
  timestamp: number
  data?: any
}

export interface ConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  lastPingTime?: number
  reconnectAttempts: number
  connectionId?: string
}

export interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  pingInterval: number
  timeout: number
}

// Default config for local development
const DEFAULT_CONFIG: WebSocketConfig = {
  url: 'ws://localhost:3001',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  pingInterval: 30000,
  timeout: 5000
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private connectionState: ConnectionState = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0
  }
  
  private sessionId: string | null = null
  private playerId: PlayerRole | null = null
  private messageQueue: WebSocketMessage[] = []
  private pingTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  
  // Event callbacks
  private onSessionUpdate?: (sessionData: Partial<SessionData>) => void
  private onMessage?: (message: Message) => void
  private onParticipantUpdate?: (participants: SessionParticipant[]) => void
  private onConnectionChange?: (state: ConnectionState) => void
  private onError?: (error: Error) => void

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize WebSocket connection for a session
   */
  async connect(sessionId: string, playerId: PlayerRole): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected')
      return true
    }

    this.sessionId = sessionId
    this.playerId = playerId

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}?sessionId=${sessionId}&playerId=${playerId}`
        this.ws = new WebSocket(wsUrl)
        
        const timeout = setTimeout(() => {
          this.ws?.close()
          reject(new Error('WebSocket connection timeout'))
        }, this.config.timeout)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.connectionState = {
            isConnected: true,
            isReconnecting: false,
            reconnectAttempts: 0,
            connectionId: `${sessionId}-${playerId}-${Date.now()}`
          }
          
          this.startPingTimer()
          this.processMessageQueue()
          this.onConnectionChange?.(this.connectionState)
          
          console.log('WebSocket connected to session:', sessionId)
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          this.stopPingTimer()
          
          if (!event.wasClean && this.connectionState.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.attemptReconnect()
          } else {
            this.connectionState = {
              isConnected: false,
              isReconnecting: false,
              reconnectAttempts: 0
            }
            this.onConnectionChange?.(this.connectionState)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          console.error('WebSocket error:', error)
          this.onError?.(new Error('WebSocket connection error'))
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    this.stopPingTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.connectionState = {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0
    }
    
    this.onConnectionChange?.(this.connectionState)
  }

  /**
   * Send session update to other participants
   */
  sendSessionUpdate(updates: Partial<SessionData>): void {
    this.sendMessage({
      type: 'session_update',
      sessionId: this.sessionId!,
      playerId: this.playerId!,
      timestamp: Date.now(),
      data: updates
    })
  }

  /**
   * Send a chat message
   */
  sendChatMessage(message: Message): void {
    this.sendMessage({
      type: 'message',
      sessionId: this.sessionId!,
      playerId: this.playerId!,
      timestamp: Date.now(),
      data: message
    })
  }

  /**
   * Send typing indicator
   */
  sendTypingStatus(isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      sessionId: this.sessionId!,
      playerId: this.playerId!,
      timestamp: Date.now(),
      data: { isTyping }
    })
  }

  /**
   * Send phase change notification
   */
  sendPhaseChange(newPhase: string, data?: any): void {
    this.sendMessage({
      type: 'phase_change',
      sessionId: this.sessionId!,
      playerId: this.playerId!,
      timestamp: Date.now(),
      data: { phase: newPhase, ...data }
    })
  }

  /**
   * Register event callbacks
   */
  onSessionUpdateReceived(callback: (sessionData: Partial<SessionData>) => void): void {
    this.onSessionUpdate = callback
  }

  onMessageReceived(callback: (message: Message) => void): void {
    this.onMessage = callback
  }

  onParticipantUpdateReceived(callback: (participants: SessionParticipant[]) => void): void {
    this.onParticipantUpdate = callback
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionChange = callback
  }

  onErrorReceived(callback: (error: Error) => void): void {
    this.onError = callback
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Check if connected and ready
   */
  isReady(): boolean {
    return this.connectionState.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  // Private methods

  private sendMessage(message: WebSocketMessage): void {
    if (!this.sessionId || !this.playerId) {
      console.error('Cannot send message: session not initialized')
      return
    }

    if (this.isReady()) {
      try {
        this.ws!.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        this.messageQueue.push(message)
      }
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(message)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      // Ignore messages from this client
      if (message.playerId === this.playerId) {
        return
      }

      switch (message.type) {
        case 'session_update':
          this.onSessionUpdate?.(message.data)
          break

        case 'message':
          this.onMessage?.(message.data)
          break

        case 'participant_update':
          this.onParticipantUpdate?.(message.data)
          break

        case 'typing':
          // Handle typing indicators
          break

        case 'phase_change':
          this.onSessionUpdate?.(message.data)
          break

        case 'connection':
          // Handle connection status updates
          break

        case 'error':
          this.onError?.(new Error(message.data?.error || 'Server error'))
          break

        default:
          console.warn('Unknown message type:', message.type)
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isReady()) {
      const message = this.messageQueue.shift()!
      try {
        this.ws!.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send queued message:', error)
        // Put it back at the front of the queue
        this.messageQueue.unshift(message)
        break
      }
    }
  }

  private startPingTimer(): void {
    this.stopPingTimer()
    
    this.pingTimer = setInterval(() => {
      if (this.isReady()) {
        this.sendMessage({
          type: 'connection',
          sessionId: this.sessionId!,
          playerId: this.playerId!,
          timestamp: Date.now(),
          data: { type: 'ping' }
        })
        this.connectionState.lastPingTime = Date.now()
      }
    }, this.config.pingInterval)
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private attemptReconnect(): void {
    if (this.connectionState.isReconnecting) {
      return
    }

    this.connectionState.isReconnecting = true
    this.connectionState.reconnectAttempts++
    this.onConnectionChange?.(this.connectionState)

    console.log(`Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.config.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (this.sessionId && this.playerId) {
          await this.connect(this.sessionId, this.playerId)
        }
      } catch (error) {
        console.error('Reconnection failed:', error)
        
        if (this.connectionState.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.attemptReconnect()
        } else {
          this.connectionState = {
            isConnected: false,
            isReconnecting: false,
            reconnectAttempts: this.connectionState.reconnectAttempts
          }
          this.onConnectionChange?.(this.connectionState)
          this.onError?.(new Error('Maximum reconnection attempts exceeded'))
        }
      }
    }, this.config.reconnectInterval)
  }
}

// Singleton instance
export const websocketService = new WebSocketService()