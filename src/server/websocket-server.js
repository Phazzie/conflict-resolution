/**
 * Development WebSocket Server for Real-Time Multiplayer
 * 
 * Run with: node src/server/websocket-server.js
 */

const WebSocket = require('ws')
const url = require('url')

const PORT = process.env.PORT || 3001

// Store active sessions
const sessions = new Map()

// Session structure: { sessionId: { participants: Map(playerId -> ws), data: {} } }

class SessionManager {
  constructor() {
    this.sessions = new Map()
  }

  createSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        participants: new Map(),
        data: {},
        createdAt: Date.now(),
        lastActivity: Date.now()
      })
    }
    return this.sessions.get(sessionId)
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId)
  }

  addParticipant(sessionId, playerId, ws) {
    const session = this.createSession(sessionId)
    session.participants.set(playerId, {
      ws,
      playerId,
      isOnline: true,
      lastSeen: Date.now(),
      isTyping: false
    })
    session.lastActivity = Date.now()
    
    // Broadcast participant update
    this.broadcastToSession(sessionId, {
      type: 'participant_update',
      sessionId,
      playerId: 'system',
      timestamp: Date.now(),
      data: this.getParticipantsForSession(sessionId)
    }, playerId)
    
    console.log(`Player ${playerId} joined session ${sessionId}`)
  }

  removeParticipant(sessionId, playerId) {
    const session = this.getSession(sessionId)
    if (session) {
      session.participants.delete(playerId)
      
      // Clean up empty sessions
      if (session.participants.size === 0) {
        this.sessions.delete(sessionId)
        console.log(`Session ${sessionId} cleaned up`)
      } else {
        // Broadcast participant update
        this.broadcastToSession(sessionId, {
          type: 'participant_update',
          sessionId,
          playerId: 'system',
          timestamp: Date.now(),
          data: this.getParticipantsForSession(sessionId)
        })
      }
      
      console.log(`Player ${playerId} left session ${sessionId}`)
    }
  }

  broadcastToSession(sessionId, message, excludePlayerId = null) {
    const session = this.getSession(sessionId)
    if (!session) return

    const messageStr = JSON.stringify(message)
    
    session.participants.forEach((participant, playerId) => {
      if (playerId !== excludePlayerId && participant.ws.readyState === WebSocket.OPEN) {
        try {
          participant.ws.send(messageStr)
        } catch (error) {
          console.error(`Failed to send message to ${playerId}:`, error)
        }
      }
    })
  }

  getParticipantsForSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) return []

    return Array.from(session.participants.values()).map(p => ({
      playerId: p.playerId,
      isOnline: p.isOnline,
      lastSeen: p.lastSeen,
      isTyping: p.isTyping
    }))
  }

  updateParticipantTyping(sessionId, playerId, isTyping) {
    const session = this.getSession(sessionId)
    if (session && session.participants.has(playerId)) {
      const participant = session.participants.get(playerId)
      participant.isTyping = isTyping
      participant.lastSeen = Date.now()
      
      // Broadcast typing status
      this.broadcastToSession(sessionId, {
        type: 'participant_update',
        sessionId,
        playerId: 'system',
        timestamp: Date.now(),
        data: this.getParticipantsForSession(sessionId)
      })
    }
  }

  // Clean up old sessions periodically
  cleanupSessions() {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(sessionId)
        console.log(`Cleaned up inactive session: ${sessionId}`)
      }
    }
  }
}

const sessionManager = new SessionManager()

// Clean up sessions every hour
setInterval(() => {
  sessionManager.cleanupSessions()
}, 60 * 60 * 1000)

const wss = new WebSocket.Server({ 
  port: PORT,
  verifyClient: (info) => {
    const query = url.parse(info.req.url, true).query
    return query.sessionId && query.playerId
  }
})

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query
  const sessionId = query.sessionId
  const playerId = query.playerId

  console.log(`New connection: ${playerId} -> ${sessionId}`)

  // Add to session
  sessionManager.addParticipant(sessionId, playerId, ws)

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    sessionId,
    playerId: 'system',
    timestamp: Date.now(),
    data: { 
      status: 'connected',
      participants: sessionManager.getParticipantsForSession(sessionId)
    }
  }))

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data)
      
      console.log(`Message from ${playerId}:`, message.type)
      
      switch (message.type) {
        case 'session_update':
        case 'message':
        case 'phase_change':
          // Broadcast to all other participants in the session
          sessionManager.broadcastToSession(sessionId, message, playerId)
          break
          
        case 'typing':
          // Update typing status
          sessionManager.updateParticipantTyping(sessionId, playerId, message.data.isTyping)
          break
          
        case 'connection':
          if (message.data.type === 'ping') {
            // Respond with pong
            ws.send(JSON.stringify({
              type: 'connection',
              sessionId,
              playerId: 'system',
              timestamp: Date.now(),
              data: { type: 'pong' }
            }))
          }
          break
          
        default:
          console.warn(`Unknown message type: ${message.type}`)
      }
      
    } catch (error) {
      console.error('Error parsing message:', error)
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        playerId: 'system',
        timestamp: Date.now(),
        data: { error: 'Invalid message format' }
      }))
    }
  })

  ws.on('close', () => {
    console.log(`Connection closed: ${playerId} -> ${sessionId}`)
    sessionManager.removeParticipant(sessionId, playerId)
  })

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${playerId}:`, error)
  })
})

console.log(`WebSocket server running on port ${PORT}`)
console.log(`Sessions will be cleaned up after 24 hours of inactivity`)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...')
  wss.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

module.exports = { sessionManager, wss }