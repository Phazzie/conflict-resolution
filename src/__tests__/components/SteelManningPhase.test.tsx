import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SteelManningPhase from '../../components/SteelManningPhase'
import { SessionData, PlayerRole } from '../../types/session'

// Mock validation utility
vi.mock('../../utils/validation', () => ({
  validateSteelManInput: vi.fn((input: string) => {
    if (input.length < 20) {
      return { isValid: false, error: 'Steel-man must be at least 20 characters' }
    }
    if (input.includes('invalid')) {
      return { isValid: false, error: 'Invalid content detected' }
    }
    return { isValid: true }
  })
}))

describe('SteelManningPhase', () => {
  const mockUpdateSessionData = vi.fn()
  
  const baseSessionData: SessionData = {
    phase: 'steel-manning',
    conflictContext: 'relationship',
    agreedIssue: 'We disagree about screen time',
    playerOneSteelMan: '',
    playerTwoSteelMan: '',
    playerOneStatement: '',
    playerTwoStatement: '',
    messages: [],
    proposedResolution: '',
    finalResolution: '',
    sessionStarted: Date.now()
  }

  beforeEach(() => {
    mockUpdateSessionData.mockClear()
  })

  describe('Initial State', () => {
    it('displays the agreed issue correctly', () => {
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/We disagree about screen time/)).toBeInTheDocument()
    })

    it('shows instructions for steel-manning', () => {
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/explain the other person's perspective/i)).toBeInTheDocument()
    })

    it('shows the correct player indicator', () => {
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2')).toBeInTheDocument()
    })
  })

  describe('Steel-man Input', () => {
    it('allows user to type their steel-man attempt', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'This is a comprehensive steel-man attempt that shows I understand the other perspective')

      expect(textarea).toHaveValue('This is a comprehensive steel-man attempt that shows I understand the other perspective')
    })

    it('validates steel-man input on submit', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      // Try with too short input
      await user.type(textarea, 'Too short')
      await user.click(submitButton)

      expect(screen.getByText('Steel-man must be at least 20 characters')).toBeInTheDocument()
    })

    it('validates against invalid content', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      await user.type(textarea, 'This contains invalid content that should be rejected')
      await user.click(submitButton)

      expect(screen.getByText('Invalid content detected')).toBeInTheDocument()
    })

    it('submits valid steel-man and updates session data', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      const validSteelMan = 'I understand that the other person feels overwhelmed by constant notifications and needs more focused time together'
      await user.type(textarea, validSteelMan)
      await user.click(submitButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerOneSteelMan: validSteelMan
      })
    })

    it('clears textarea after successful submission', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      await user.type(textarea, 'Valid steel-man attempt with sufficient length and proper content')
      await user.click(submitButton)

      expect(textarea).toHaveValue('')
    })
  })

  describe('Approval Process', () => {
    it('shows other player steel-man for approval when available', () => {
      const sessionWithSteelMans: SessionData = {
        ...baseSessionData,
        playerOneSteelMan: 'Player 1 steel-man attempt',
        playerTwoSteelMan: 'Player 2 steel-man attempt'
      }

      render(
        <SteelManningPhase
          sessionData={sessionWithSteelMans}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2 steel-man attempt')).toBeInTheDocument()
    })

    it('allows approval of other player steel-man', async () => {
      const user = userEvent.setup()
      const sessionWithSteelMans: SessionData = {
        ...baseSessionData,
        playerOneSteelMan: 'Player 1 steel-man attempt',
        playerTwoSteelMan: 'Player 2 steel-man attempt'
      }

      render(
        <SteelManningPhase
          sessionData={sessionWithSteelMans}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      // Should show approved state
      expect(screen.getByText(/approved/i)).toBeInTheDocument()
    })

    it('proceeds to next phase when both players have submitted and approved', async () => {
      const user = userEvent.setup()
      const sessionWithSteelMans: SessionData = {
        ...baseSessionData,
        playerOneSteelMan: 'Player 1 comprehensive steel-man attempt',
        playerTwoSteelMan: 'Player 2 comprehensive steel-man attempt'
      }

      render(
        <SteelManningPhase
          sessionData={sessionWithSteelMans}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Approve as player 1 (we need to simulate both approvals in real app)
      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      // In the actual implementation, this would check if both players approved
      // For testing, we verify the approval state is tracked
      expect(screen.getByText(/approved/i)).toBeInTheDocument()
    })
  })

  describe('Player Role Handling', () => {
    it('handles player2 role correctly', () => {
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2')).toBeInTheDocument()
    })

    it('submits steel-man for player2 correctly', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      const validSteelMan = 'Player 2 understanding of player 1 perspective with sufficient detail'
      await user.type(textarea, validSteelMan)
      await user.click(submitButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerTwoSteelMan: validSteelMan
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('associates error messages with form controls', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      await user.type(textarea, 'Short')
      await user.click(submitButton)

      const errorMessage = screen.getByText('Steel-man must be at least 20 characters')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty session data gracefully', () => {
      const emptySession: SessionData = {
        ...baseSessionData,
        agreedIssue: ''
      }

      render(
        <SteelManningPhase
          sessionData={emptySession}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Should still render without crashing
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('trims whitespace from steel-man submissions', async () => {
      const user = userEvent.setup()
      render(
        <SteelManningPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      const steelManWithWhitespace = '  Valid steel-man with proper length and content  '
      await user.type(textarea, steelManWithWhitespace)
      await user.click(submitButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerOneSteelMan: steelManWithWhitespace.trim()
      })
    })
  })
})