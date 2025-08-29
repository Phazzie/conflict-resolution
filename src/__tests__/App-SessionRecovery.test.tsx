import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { SessionData } from '../types/session'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock validation with errors and warnings
let mockValidationResult = { isValid: true, error: null, warnings: null }
vi.mock('../utils/validation', () => ({
  validateSessionData: vi.fn(() => mockValidationResult)
}))

// Mock session persistence
const mockClearSession = vi.fn()
vi.mock('../utils/sessionPersistence', () => ({
  clearSession: mockClearSession
}))

// Mock useKV hook with functional updates
let mockSessionData: SessionData | null = null
const mockSetSessionData = vi.fn((updater) => {
  if (typeof updater === 'function') {
    mockSessionData = updater(mockSessionData)
  } else {
    mockSessionData = updater
  }
})
const mockDeleteSessionData = vi.fn()

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn(() => [mockSessionData, mockSetSessionData, mockDeleteSessionData])
}))

// Mock all other dependencies
vi.mock('../services/analytics', () => ({
  analyticsService: { generateSessionAnalytics: vi.fn(() => Promise.resolve({})) }
}))

vi.mock('../services/sessionHistory', () => ({
  sessionHistoryService: { saveSession: vi.fn(() => Promise.resolve()) }
}))

vi.mock('../services/mlServiceOptimized', () => ({
  machineLearningService: { learnFromSessionOutcome: vi.fn(() => Promise.resolve()) }
}))

vi.mock('../services/conflictContexts', () => ({ CONFLICT_CONTEXTS: {} }))

// Mock components
vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: any) => <div data-testid="error-boundary">{children}</div>
}))

vi.mock('../components/PhaseErrorBoundary', () => ({
  default: ({ children }: any) => <div data-testid="phase-error-boundary">{children}</div>
}))

// Mock all phase and dashboard components with minimal implementations
const mockComponents = [
  'ConflictContextSelector', 'IssueAgreement', 'SteelManningPhase', 
  'StatementLocking', 'DiscussionPhase', 'ResolutionPhase', 'SessionSummary',
  'SessionSharing', 'AIPreferencesSettings', 'AIPersonalityTesting'
]

mockComponents.forEach(componentName => {
  vi.mock(`../components/${componentName}`, () => ({
    default: () => <div data-testid={componentName.toLowerCase()}>{componentName}</div>
  }))
})

// Mock lazy loaded dashboards
const dashboards = [
  'AnalyticsDashboard', 'SessionHistoryDashboard', 'CouplesDashboard',
  'PatternRecognitionDashboard', 'MLInsightsDashboard'
]

dashboards.forEach(dashboard => {
  vi.mock(`../components/${dashboard}`, () => ({
    default: () => <div data-testid={dashboard.toLowerCase()}>{dashboard}</div>
  }))
})

describe('App - Session Recovery and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionData = null
    mockValidationResult = { isValid: true, error: null, warnings: null }
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Session Initialization', () => {
    it('initializes with default session when no session exists', () => {
      render(<App />)
      
      expect(screen.getByText('MixitFixit')).toBeInTheDocument()
      expect(screen.getByText('Enter the Digital Thunderdome')).toBeInTheDocument()
    })

    it('shows loading state during initialization', () => {
      render(<App />)
      
      // Should show loading screen initially
      expect(screen.getByText('Loading MixitFixit')).toBeInTheDocument()
      expect(screen.getByText('Preparing your conflict resolution session...')).toBeInTheDocument()
    })

    it('recovers existing session with warnings', async () => {
      mockValidationResult = { 
        isValid: true, 
        error: null, 
        warnings: ['Session is older than 24 hours'] 
      }
      mockSessionData = {
        phase: 'discussion' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: 'Test issue',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      }
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/Session recovered with warnings/)).toBeInTheDocument()
        expect(screen.getByText(/Session is older than 24 hours/)).toBeInTheDocument()
      })
    })
  })

  describe('Session Validation Errors', () => {
    it('shows user-friendly error message for corrupted session', async () => {
      mockValidationResult = { 
        isValid: false, 
        error: 'Your session data got scrambled. This usually happens if your browser storage got corrupted.',
        warnings: null 
      }
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Session Issues Detected')).toBeInTheDocument()
        expect(screen.getByText(/Something went wrong with your session/)).toBeInTheDocument()
        expect(screen.getByText(/browser storage got corrupted/)).toBeInTheDocument()
      })
    })

    it('provides recovery options for session errors', async () => {
      mockValidationResult = { 
        isValid: false, 
        error: 'Session validation failed',
        warnings: null 
      }
      
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Start Fresh Session')).toBeInTheDocument()
        expect(screen.getByText('Refresh Page')).toBeInTheDocument()
      })
      
      // Test reset functionality
      const resetButton = screen.getByText('Start Fresh Session')
      await user.click(resetButton)
      
      expect(mockClearSession).toHaveBeenCalled()
      expect(mockSetSessionData).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'welcome',
          conflictContext: 'relationship'
        })
      )
    })

    it('handles reset button loading state', async () => {
      mockValidationResult = { 
        isValid: false, 
        error: 'Test error',
        warnings: null 
      }
      
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        const resetButton = screen.getByText('Start Fresh Session')
        expect(resetButton).not.toBeDisabled()
      })
      
      const resetButton = screen.getByText('Start Fresh Session')
      await user.click(resetButton)
      
      // Should show loading state briefly
      await waitFor(() => {
        expect(screen.getByText('Starting Fresh...')).toBeInTheDocument()
      })
    })
  })

  describe('Session State Management', () => {
    it('uses functional updates to avoid stale closure bugs', () => {
      mockSessionData = {
        phase: 'welcome' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: '',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      render(<App />)
      
      // Verify that setSessionData is called with a function for updates
      expect(mockSetSessionData).toHaveBeenCalledWith(expect.any(Function))
    })

    it('safely handles null/undefined session data', () => {
      mockSessionData = null
      
      render(<App />)
      
      // Should not crash and should show welcome screen
      expect(screen.getByText('MixitFixit')).toBeInTheDocument()
      expect(screen.getByText('Enter the Digital Thunderdome')).toBeInTheDocument()
    })

    it('handles session phase transitions correctly', async () => {
      mockSessionData = {
        phase: 'welcome' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: '',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      const user = userEvent.setup()
      render(<App />)
      
      const startButton = screen.getByText('Enter the Digital Thunderdome')
      await user.click(startButton)
      
      expect(mockSetSessionData).toHaveBeenCalledWith(expect.any(Function))
      
      // Verify the function updates the session correctly
      const updateFunction = mockSetSessionData.mock.calls[0][0]
      const updatedSession = updateFunction(mockSessionData)
      
      expect(updatedSession).toEqual(
        expect.objectContaining({
          phase: 'ai-preferences',
          sessionStarted: expect.any(Number)
        })
      )
    })
  })

  describe('Player Role Management', () => {
    it('assigns random player role when none exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(<App />)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mixitfixit-player-role',
        expect.stringMatching(/^player[12]$/)
      )
    })

    it('recovers existing valid player role', () => {
      localStorageMock.getItem.mockReturnValue('player2')
      
      render(<App />)
      
      // Should show P2 badge
      expect(screen.getByText('P2')).toBeInTheDocument()
    })

    it('handles invalid player role gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-role')
      
      render(<App />)
      
      // Should assign a new valid role
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mixitfixit-player-role',
        expect.stringMatching(/^player[12]$/)
      )
    })

    it('clears player role on session reset', async () => {
      mockSessionData = {
        phase: 'discussion' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: 'Test issue',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      const user = userEvent.setup()
      render(<App />)
      
      const resetButton = screen.getByText('Reset')
      await user.click(resetButton)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mixitfixit-player-role')
      expect(mockClearSession).toHaveBeenCalled()
    })
  })

  describe('Error Boundaries', () => {
    it('wraps entire app in error boundary', () => {
      render(<App />)
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    })

    it('wraps phase components in phase-specific error boundaries', () => {
      mockSessionData = {
        phase: 'ai-preferences' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: '',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      render(<App />)
      
      expect(screen.getByTestId('phase-error-boundary')).toBeInTheDocument()
    })
  })

  describe('Progressive Enhancement', () => {
    it('shows session recovery badge for existing sessions', () => {
      mockSessionData = {
        phase: 'discussion' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: 'Existing issue',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [{ 
          id: '1', 
          author: 'player1' as const, 
          content: 'Test message', 
          timestamp: Date.now() 
        }],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      render(<App />)
      
      expect(screen.getByText('Session Recovered')).toBeInTheDocument()
    })

    it('shows analytics button only when messages exist', () => {
      mockSessionData = {
        phase: 'discussion' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: 'Test issue',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [{ 
          id: '1', 
          author: 'player1' as const, 
          content: 'Test message', 
          timestamp: Date.now() 
        }],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      render(<App />)
      
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('hides analytics button when no messages exist', () => {
      mockSessionData = {
        phase: 'discussion' as const,
        conflictContext: 'relationship' as const,
        agreedIssue: 'Test issue',
        playerOneSteelMan: '',
        playerTwoSteelMan: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: [],
        proposedResolution: '',
        finalResolution: '',
        sessionStarted: Date.now()
      }
      
      render(<App />)
      
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
    })
  })
})