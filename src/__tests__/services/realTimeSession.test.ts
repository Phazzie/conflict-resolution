import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { realTimeSessionService, RealTimeCallbacks, SessionParticipant } from '../../services/realTimeSession'

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  })
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('RealTimeSessionService', () => {
  let callbacks: RealTimeCallbacks
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.store = {}
    
    callbacks = {
      onSessionUpdate: vi.fn(),
      onParticipantUpdate: vi.fn(),
      onError: vi.fn(),
      onConnectionStatus: vi.fn()
    }
    
    // Reset service state
    realTimeSessionService.disconnect()
  })

  afterEach(() => {
    realTimeSessionService.disconnect()
  })

  describe('Session Initialization', () => {
    it('initializes session with provided parameters', () => {
      realTimeSessionService.initializeSession('test-session-123', 'player1', callbacks)
      
      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith(true)
      expect(realTimeSessionService.isConnected()).toBe(true)
    })

    it('sets up participant presence on initialization', () => {
      realTimeSessionService.initializeSession('test-session-123', 'player1', callbacks)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mixitfixit-participants-test-session-123',
        expect.stringContaining('"playerId":"player1"')
      )
    })

    it('starts sync loop on initialization', () => {
      vi.useFakeTimers()
      
      realTimeSessionService.initializeSession('test-session-123', 'player1', callbacks)
      
      // Advance time to trigger sync
      vi.advanceTimersByTime(1000)
      
      expect(callbacks.onParticipantUpdate).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('Connection Management', () => {
    it('reports connected status correctly', () => {
      expect(realTimeSessionService.isConnected()).toBe(false)
      
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      expect(realTimeSessionService.isConnected()).toBe(true)
      
      realTimeSessionService.disconnect()
      expect(realTimeSessionService.isConnected()).toBe(false)
    })

    it('disconnects and cleans up resources', () => {
      vi.useFakeTimers()
      
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      realTimeSessionService.disconnect()
      
      expect(realTimeSessionService.isConnected()).toBe(false)
      expect(callbacks.onConnectionStatus).toHaveBeenCalledWith(false)
      
      vi.useRealTimers()
    })
  })

  describe('Session Updates', () => {
    it('broadcasts session updates', () => {
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      const updateData = { phase: 'discussion', messages: ['new message'] }
      realTimeSessionService.broadcastSessionUpdate(updateData)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mixitfixit-session-test-session',
        expect.stringContaining('"phase":"discussion"')
      )
    })

    it('handles session update errors gracefully', () => {
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      // Mock localStorage to throw error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })
      
      const updateData = { phase: 'discussion' }
      realTimeSessionService.broadcastSessionUpdate(updateData)
      
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Storage full') })
      )
    })
  })

  describe('Participant Management', () => {
    it('tracks participant presence updates', () => {
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      realTimeSessionService.updateParticipantPresence(true, true) // online and typing
      
      const participantData = JSON.parse(
        mockLocalStorage.store['mixitfixit-participants-test-session'] || '[]'
      )
      
      const player1 = participantData.find((p: SessionParticipant) => p.playerId === 'player1')
      expect(player1.isOnline).toBe(true)
      expect(player1.isTyping).toBe(true)
    })

    it('updates typing status', () => {
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      realTimeSessionService.setTypingStatus(true)
      
      const participantData = JSON.parse(
        mockLocalStorage.store['mixitfixit-participants-test-session'] || '[]'
      )
      
      const player1 = participantData.find((p: SessionParticipant) => p.playerId === 'player1')
      expect(player1.isTyping).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage quota exceeded', () => {
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })
      
      realTimeSessionService.broadcastSessionUpdate({ large: 'data'.repeat(1000) })
      
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('QuotaExceededError')
        })
      )
    })

    it('continues operating after non-critical errors', () => {
      vi.useFakeTimers()
      
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      // Cause an error
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Temporary error')
      })
      
      vi.advanceTimersByTime(1000) // Trigger error
      expect(callbacks.onError).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('Session Recovery', () => {
    it('can rejoin existing session', () => {
      // Set up existing session data
      const existingSessionData = {
        phase: 'discussion',
        messages: ['existing message'],
        timestamp: Date.now()
      }
      
      mockLocalStorage.store['mixitfixit-session-test-session'] = JSON.stringify(existingSessionData)
      
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      // Should detect existing session
      expect(callbacks.onSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'discussion',
          messages: ['existing message']
        })
      )
    })

    it('handles corrupted session data', () => {
      // Set up corrupted session data
      mockLocalStorage.store['mixitfixit-session-test-session'] = 'invalid-json-data'
      
      realTimeSessionService.initializeSession('test-session', 'player1', callbacks)
      
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('parse')
        })
      )
    })
  })
})