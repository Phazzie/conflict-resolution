import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionSummary from '../../components/SessionSummary'
import { SessionData } from '../../types/session'

// Mock services
vi.mock('../../services/sessionHistory', () => ({
  sessionHistoryService: {
    saveSession: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock PDF generation
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn()
  }))
}))

describe('SessionSummary', () => {
  const mockOnReset = vi.fn()
  
  const completeSessionData: SessionData = {
    phase: 'summary',
    conflictContext: 'relationship',
    agreedIssue: 'We disagree about screen time usage',
    playerOneSteelMan: 'Player 1 understands that player 2 feels screen time interferes with quality time',
    playerTwoSteelMan: 'Player 2 understands that player 1 needs screen time for relaxation after work',
    playerOneStatement: 'I need some screen time to unwind after stressful work days',
    playerTwoStatement: 'I feel disconnected when we both stare at screens instead of talking',
    messages: [
      {
        id: '1',
        text: 'Maybe we can find a balance',
        player: 'player1',
        timestamp: Date.now() - 120000,
        type: 'user'
      },
      {
        id: '2',
        text: 'I agree, balance is important',
        player: 'player2', 
        timestamp: Date.now() - 60000,
        type: 'user'
      }
    ],
    proposedResolution: 'Initial resolution proposal',
    finalResolution: 'We will have screen-free hours from 8-10pm daily for quality conversation time',
    sessionStarted: Date.now() - 1800000
  }

  const incompleteSessionData: SessionData = {
    ...completeSessionData,
    finalResolution: '',
    messages: []
  }

  beforeEach(() => {
    mockOnReset.mockClear()
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('displays the phase title and completion message', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/session complete/i)).toBeInTheDocument()
      expect(screen.getByText(/battle report/i)).toBeInTheDocument()
    })

    it('shows session outcome badge for resolved sessions', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/resolved/i)).toBeInTheDocument()
    })

    it('shows session outcome badge for unresolved sessions', () => {
      render(
        <SessionSummary
          sessionData={incompleteSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/stalemate/i)).toBeInTheDocument()
    })

    it('displays session duration', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument()
    })
  })

  describe('Session Content Display', () => {
    it('displays the agreed issue', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText('We disagree about screen time usage')).toBeInTheDocument()
    })

    it('displays both player steel-man attempts', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/Player 1 understands that player 2 feels/)).toBeInTheDocument()
      expect(screen.getByText(/Player 2 understands that player 1 needs/)).toBeInTheDocument()
    })

    it('displays both player locked statements', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/I need some screen time to unwind/)).toBeInTheDocument()
      expect(screen.getByText(/I feel disconnected when we both stare/)).toBeInTheDocument()
    })

    it('displays message count from discussion phase', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/2 messages/i)).toBeInTheDocument()
    })

    it('displays final resolution when available', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/screen-free hours from 8-10pm daily/)).toBeInTheDocument()
    })

    it('shows appropriate message for unresolved sessions', () => {
      render(
        <SessionSummary
          sessionData={incompleteSessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/no resolution was reached/i)).toBeInTheDocument()
    })
  })

  describe('Session Statistics', () => {
    it('calculates and displays session duration correctly', () => {
      const sessionData = {
        ...completeSessionData,
        sessionStarted: Date.now() - 3600000 // 1 hour ago
      }

      render(
        <SessionSummary
          sessionData={sessionData}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
    })

    it('shows phase completion statistics', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      // Should show how many phases were completed
      expect(screen.getByText(/completed all phases/i)).toBeInTheDocument()
    })

    it('displays AI intervention count when available', () => {
      const sessionWithAI = {
        ...completeSessionData,
        messages: [
          ...completeSessionData.messages,
          {
            id: '3',
            text: 'AI suggestion about communication',
            player: 'ai' as const,
            timestamp: Date.now(),
            type: 'ai-suggestion' as const
          }
        ]
      }

      render(
        <SessionSummary
          sessionData={sessionWithAI}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/1 AI intervention/i)).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('provides reset button to start new session', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const resetButton = screen.getByRole('button', { name: /start new session/i })
      expect(resetButton).toBeInTheDocument()
    })

    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const resetButton = screen.getByRole('button', { name: /start new session/i })
      await user.click(resetButton)

      expect(mockOnReset).toHaveBeenCalledTimes(1)
    })

    it('provides download button for PDF export', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download pdf/i })
      expect(downloadButton).toBeInTheDocument()
    })

    it('generates PDF when download button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download pdf/i })
      await user.click(downloadButton)

      // Should attempt to generate PDF
      expect(screen.getByText(/generating pdf/i)).toBeInTheDocument()
    })

    it('shows sharing options', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const shareButton = screen.getByRole('button', { name: /share summary/i })
      expect(shareButton).toBeInTheDocument()
    })
  })

  describe('Session History Integration', () => {
    it('automatically saves session to history on mount', async () => {
      const { sessionHistoryService } = await import('../../services/sessionHistory')
      
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      await waitFor(() => {
        expect(sessionHistoryService.saveSession).toHaveBeenCalledWith(
          completeSessionData,
          'resolved'
        )
      })
    })

    it('saves unresolved sessions with correct outcome', async () => {
      const { sessionHistoryService } = await import('../../services/sessionHistory')
      
      render(
        <SessionSummary
          sessionData={incompleteSessionData}
          onReset={mockOnReset}
        />
      )

      await waitFor(() => {
        expect(sessionHistoryService.saveSession).toHaveBeenCalledWith(
          incompleteSessionData,
          'stalemate'
        )
      })
    })

    it('handles history save errors gracefully', async () => {
      const { sessionHistoryService } = await import('../../services/sessionHistory')
      vi.mocked(sessionHistoryService.saveSession).mockRejectedValueOnce(new Error('Save failed'))
      
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      // Should not crash and still render the summary
      expect(screen.getByText(/session complete/i)).toBeInTheDocument()
    })

    it('shows confirmation when session is saved to history', async () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/saved to history/i)).toBeInTheDocument()
      })
    })
  })

  describe('Pattern Analysis Display', () => {
    it('displays pattern analysis when available', () => {
      const sessionWithPatterns = {
        ...completeSessionData,
        patternAnalysis: {
          detectedPatterns: ['stonewalling', 'blame-shifting'],
          severity: 'medium' as const,
          recommendations: ['Practice active listening', 'Use I-statements'],
          analyzedAt: Date.now()
        }
      }

      render(
        <SessionSummary
          sessionData={sessionWithPatterns}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/pattern analysis/i)).toBeInTheDocument()
      expect(screen.getByText('stonewalling')).toBeInTheDocument()
      expect(screen.getByText('blame-shifting')).toBeInTheDocument()
    })

    it('shows pattern severity levels', () => {
      const sessionWithHighSeverity = {
        ...completeSessionData,
        patternAnalysis: {
          detectedPatterns: ['gaslighting'],
          severity: 'high' as const,
          recommendations: ['Consider professional help'],
          analyzedAt: Date.now()
        }
      }

      render(
        <SessionSummary
          sessionData={sessionWithHighSeverity}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/high severity/i)).toBeInTheDocument()
    })

    it('displays recommendations from pattern analysis', () => {
      const sessionWithRecommendations = {
        ...completeSessionData,
        patternAnalysis: {
          detectedPatterns: ['interrupting'],
          severity: 'low' as const,
          recommendations: ['Take turns speaking', 'Use a talking stick approach'],
          analyzedAt: Date.now()
        }
      }

      render(
        <SessionSummary
          sessionData={sessionWithRecommendations}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText('Take turns speaking')).toBeInTheDocument()
      expect(screen.getByText('Use a talking stick approach')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper heading structure', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
    })

    it('uses proper ARIA labels for actions', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const resetButton = screen.getByRole('button', { name: /start new session/i })
      expect(resetButton).toHaveAttribute('aria-label')
    })

    it('provides screen reader friendly session statistics', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const statsRegion = screen.getByRole('region')
      expect(statsRegion).toBeInTheDocument()
    })

    it('uses semantic HTML for content sections', () => {
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const articles = screen.getAllByRole('article')
      expect(articles.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles sessions with no messages', () => {
      const emptyMessageSession = {
        ...completeSessionData,
        messages: []
      }

      render(
        <SessionSummary
          sessionData={emptyMessageSession}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/0 messages/i)).toBeInTheDocument()
    })

    it('handles sessions with missing steel-man data', () => {
      const incompleteSteelMan = {
        ...completeSessionData,
        playerOneSteelMan: '',
        playerTwoSteelMan: ''
      }

      render(
        <SessionSummary
          sessionData={incompleteSteelMan}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/steel-man phase was skipped/i)).toBeInTheDocument()
    })

    it('handles very short session durations', () => {
      const shortSession = {
        ...completeSessionData,
        sessionStarted: Date.now() - 30000 // 30 seconds ago
      }

      render(
        <SessionSummary
          sessionData={shortSession}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/less than a minute/i)).toBeInTheDocument()
    })

    it('handles very long session durations', () => {
      const longSession = {
        ...completeSessionData,
        sessionStarted: Date.now() - 7200000 // 2 hours ago
      }

      render(
        <SessionSummary
          sessionData={longSession}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/2 hours/i)).toBeInTheDocument()
    })

    it('handles missing final resolution gracefully', () => {
      const noResolution = {
        ...completeSessionData,
        finalResolution: ''
      }

      render(
        <SessionSummary
          sessionData={noResolution}
          onReset={mockOnReset}
        />
      )

      expect(screen.getByText(/session ended without resolution/i)).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('formats PDF content correctly', async () => {
      const user = userEvent.setup()
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download pdf/i })
      await user.click(downloadButton)

      // Should show PDF generation in progress
      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeInTheDocument()
      })
    })

    it('includes all session data in export', async () => {
      const user = userEvent.setup()
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download pdf/i })
      await user.click(downloadButton)

      // PDF should include all major sections
      await waitFor(() => {
        expect(screen.getByText(completeSessionData.agreedIssue)).toBeInTheDocument()
      })
    })

    it('handles export errors gracefully', async () => {
      // Mock PDF generation to fail
      const mockJsPDF = vi.fn().mockImplementation(() => ({
        text: vi.fn(),
        save: vi.fn().mockImplementation(() => {
          throw new Error('Export failed')
        }),
        setFontSize: vi.fn(),
        setFont: vi.fn()
      }))

      const user = userEvent.setup()
      render(
        <SessionSummary
          sessionData={completeSessionData}
          onReset={mockOnReset}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download pdf/i })
      await user.click(downloadButton)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument()
      })
    })
  })
})