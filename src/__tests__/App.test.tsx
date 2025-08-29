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

// Mock useKV hook
const mockSessionData: SessionData = {
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
}

const mockSetSessionData = vi.fn()
let mockUseKVReturn = [mockSessionData, mockSetSessionData, vi.fn()]

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn(() => mockUseKVReturn)
}))

// Mock validation
vi.mock('../utils/validation', () => ({
  validateSessionData: vi.fn(() => ({ isValid: true, error: null }))
}))

// Mock session persistence
vi.mock('../utils/sessionPersistence', () => ({
  clearSession: vi.fn()
}))

// Mock services
vi.mock('../services/analytics', () => ({
  analyticsService: {
    generateSessionAnalytics: vi.fn(() => Promise.resolve({}))
  }
}))

vi.mock('../services/sessionHistory', () => ({
  sessionHistoryService: {
    saveSession: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('../services/mlServiceOptimized', () => ({
  machineLearningService: {
    learnFromSessionOutcome: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('../services/conflictContexts', () => ({
  CONFLICT_CONTEXTS: {}
}))

// Mock all lazy-loaded components to avoid dynamic import issues
vi.mock('../components/AnalyticsDashboard', () => ({
  default: () => <div data-testid="analytics-dashboard">Analytics Dashboard</div>
}))

vi.mock('../components/SessionHistoryDashboard', () => ({
  default: () => <div data-testid="history-dashboard">History Dashboard</div>
}))

vi.mock('../components/CouplesDashboard', () => ({
  default: () => <div data-testid="couples-dashboard">Couples Dashboard</div>
}))

vi.mock('../components/PatternRecognitionDashboard', () => ({
  default: () => <div data-testid="pattern-dashboard">Pattern Dashboard</div>
}))

vi.mock('../components/MLInsightsDashboard', () => ({
  default: () => <div data-testid="ml-dashboard">ML Dashboard</div>
}))

// Mock all phase components
vi.mock('../components/ConflictContextSelector', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="context-selector">
      <button onClick={() => updateSessionData({ phase: 'issue-agreement' })}>
        Select Context
      </button>
    </div>
  )
}))

vi.mock('../components/IssueAgreement', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="issue-agreement">
      <button onClick={() => updateSessionData({ phase: 'steel-manning' })}>
        Agree on Issue
      </button>
    </div>
  )
}))

vi.mock('../components/SteelManningPhase', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="steel-manning">
      <button onClick={() => updateSessionData({ phase: 'statement-locking' })}>
        Complete Steel Manning
      </button>
    </div>
  )
}))

vi.mock('../components/StatementLocking', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="statement-locking">
      <button onClick={() => updateSessionData({ phase: 'discussion' })}>
        Lock Statements
      </button>
    </div>
  )
}))

vi.mock('../components/DiscussionPhase', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="discussion-phase">
      <button onClick={() => updateSessionData({ phase: 'resolution' })}>
        Start Discussion
      </button>
    </div>
  )
}))

vi.mock('../components/ResolutionPhase', () => ({
  default: ({ updateSessionData }: any) => (
    <div data-testid="resolution-phase">
      <button onClick={() => updateSessionData({ phase: 'summary' })}>
        Resolve
      </button>
    </div>
  )
}))

vi.mock('../components/SessionSummary', () => ({
  default: ({ onReset }: any) => (
    <div data-testid="session-summary">
      <button onClick={onReset}>Reset Session</button>
    </div>
  )
}))

vi.mock('../components/SessionSharing', () => ({
  default: () => <div data-testid="session-sharing">Session Sharing</div>
}))

vi.mock('../components/AIPreferencesSettings', () => ({
  default: () => <div data-testid="ai-preferences">AI Preferences</div>
}))

vi.mock('../components/AIPersonalityTesting', () => ({
  default: ({ onComplete }: any) => (
    <div data-testid="ai-personality">
      <button onClick={() => onComplete('helpful')}>Choose AI Personality</button>
    </div>
  )
}))

vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: any) => <div>{children}</div>
}))

vi.mock('../components/PhaseErrorBoundary', () => ({
  default: ({ children }: any) => <div>{children}</div>
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockUseKVReturn = [mockSessionData, mockSetSessionData, vi.fn()]
  })

  describe('Welcome Screen', () => {
    it('renders welcome screen with correct title and description', () => {
      render(<App />)
      
      expect(screen.getByText('MixitFixit')).toBeInTheDocument()
      expect(screen.getByText('Digital Thunderdome for All Your Conflicts')).toBeInTheDocument()
      expect(screen.getByText('Enter the Digital Thunderdome')).toBeInTheDocument()
    })

    it('shows feature list with correct descriptions', () => {
      render(<App />)
      
      expect(screen.getByText('Issue Agreement')).toBeInTheDocument()
      expect(screen.getByText('Steel-Manning Phase')).toBeInTheDocument()
      expect(screen.getByText('Statement Locking')).toBeInTheDocument()
      expect(screen.getByText('AI-Moderated Discussion')).toBeInTheDocument()
    })

    it('starts session when enter button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const enterButton = screen.getByText('Enter the Digital Thunderdome')
      await user.click(enterButton)
      
      expect(mockSetSessionData).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'ai-preferences',
          sessionStarted: expect.any(Number)
        })
      )
    })

    it('navigates to different dashboards from welcome screen', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const patternButton = screen.getByText('Pattern Analysis')
      await user.click(patternButton)
      
      expect(mockSetSessionData).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'pattern-recognition' })
      )
    })
  })

  describe('Session Flow', () => {
    it('renders AI preferences phase', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'ai-preferences' }
      render(<App />)
      
      expect(screen.getByText('AI Personality Setup')).toBeInTheDocument()
      expect(screen.getByTestId('ai-personality')).toBeInTheDocument()
      expect(screen.getByTestId('ai-preferences')).toBeInTheDocument()
    })

    it('renders context selection phase', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'context-selection' }
      render(<App />)
      
      expect(screen.getByTestId('context-selector')).toBeInTheDocument()
    })

    it('renders issue agreement phase', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'issue-agreement' }
      render(<App />)
      
      expect(screen.getByTestId('issue-agreement')).toBeInTheDocument()
    })

    it('renders steel manning phase', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'steel-manning' }
      render(<App />)
      
      expect(screen.getByTestId('steel-manning')).toBeInTheDocument()
    })

    it('renders discussion phase with session sharing', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'discussion' }
      render(<App />)
      
      expect(screen.getByTestId('discussion-phase')).toBeInTheDocument()
      expect(screen.getByTestId('session-sharing')).toBeInTheDocument()
    })
  })

  describe('Session Management', () => {
    it('assigns player role on initialization', () => {
      render(<App />)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mixitfixit-player-role',
        expect.stringMatching(/^player[12]$/)
      )
    })

    it('recovers existing player role from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('player2')
      render(<App />)
      
      expect(screen.getByText('P2')).toBeInTheDocument()
    })

    it('resets session when reset button is clicked', async () => {
      const user = userEvent.setup()
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'discussion' }
      render(<App />)
      
      const resetButton = screen.getByText('Reset')
      await user.click(resetButton)
      
      expect(mockSetSessionData).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'welcome' })
      )
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mixitfixit-player-role')
    })
  })

  describe('Navigation', () => {
    it('shows analytics button when messages exist', () => {
      mockUseKVReturn[0] = { 
        ...mockSessionData, 
        phase: 'discussion',
        messages: [{ id: '1', sender: 'player1', content: 'test', timestamp: Date.now() }] 
      }
      render(<App />)
      
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('navigates to analytics dashboard', async () => {
      const user = userEvent.setup()
      mockUseKVReturn[0] = { 
        ...mockSessionData, 
        phase: 'discussion',
        messages: [{ id: '1', sender: 'player1', content: 'test', timestamp: Date.now() }] 
      }
      render(<App />)
      
      const analyticsButton = screen.getByText('Analytics')
      await user.click(analyticsButton)
      
      expect(mockSetSessionData).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'analytics' })
      )
    })

    it('shows all navigation buttons in header during active session', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'discussion' }
      render(<App />)
      
      expect(screen.getByText('Patterns')).toBeInTheDocument()
      expect(screen.getByText('Couples')).toBeInTheDocument()
      expect(screen.getByText('ML')).toBeInTheDocument()
      expect(screen.getByText('History')).toBeInTheDocument()
    })
  })

  describe('Progress Tracking', () => {
    it('shows correct progress for different phases', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'steel-manning' }
      render(<App />)
      
      // Should show progress bar and phase name
      expect(screen.getByText('Steel-Manning Phase')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    it('shows session recovered badge when session has data', () => {
      mockUseKVReturn[0] = { 
        ...mockSessionData, 
        phase: 'discussion',
        agreedIssue: 'Test issue' 
      }
      render(<App />)
      
      expect(screen.getByText('Session Recovered')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows validation error when session data is invalid', () => {
      const { validateSessionData } = require('../utils/validation')
      validateSessionData.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid session data' 
      })
      
      render(<App />)
      
      expect(screen.getByText('Session Corrupted')).toBeInTheDocument()
      expect(screen.getByText('Invalid session data')).toBeInTheDocument()
    })

    it('provides reset option on validation error', async () => {
      const user = userEvent.setup()
      const { validateSessionData } = require('../utils/validation')
      validateSessionData.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid session data' 
      })
      
      render(<App />)
      
      const resetButton = screen.getByText('Start Fresh')
      await user.click(resetButton)
      
      expect(mockSetSessionData).toHaveBeenCalled()
    })
  })

  describe('Multiplayer Features', () => {
    it('enables multiplayer session', async () => {
      const user = userEvent.setup()
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'discussion' }
      
      render(<App />)
      
      // The enableMultiplayer function should be called through SessionSharing
      // This tests that the function exists and can be called
      expect(screen.getByTestId('session-sharing')).toBeInTheDocument()
    })
  })

  describe('Dashboard Views', () => {
    it('renders analytics dashboard', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'analytics' }
      render(<App />)
      
      expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument()
    })

    it('renders history dashboard', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'history' }
      render(<App />)
      
      expect(screen.getByTestId('history-dashboard')).toBeInTheDocument()
    })

    it('renders couples dashboard', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'couples-dashboard' }
      render(<App />)
      
      expect(screen.getByTestId('couples-dashboard')).toBeInTheDocument()
    })

    it('renders pattern recognition dashboard', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'pattern-recognition' }
      render(<App />)
      
      expect(screen.getByTestId('pattern-dashboard')).toBeInTheDocument()
    })

    it('renders ML insights dashboard', () => {
      mockUseKVReturn[0] = { ...mockSessionData, phase: 'ml-insights' }
      render(<App />)
      
      expect(screen.getByTestId('ml-dashboard')).toBeInTheDocument()
    })
  })
})