import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatementLocking from '../../components/StatementLocking'
import { SessionData, PlayerRole } from '../../types/session'

// Mock validation utility
vi.mock('../../utils/validation', () => ({
  validateStatementInput: vi.fn((input: string) => {
    if (input.length < 25) {
      return { isValid: false, error: 'Statement must be at least 25 characters' }
    }
    if (input.includes('invalid')) {
      return { isValid: false, error: 'Statement contains invalid content' }
    }
    return { isValid: true }
  })
}))

describe('StatementLocking', () => {
  const mockUpdateSessionData = vi.fn()
  
  const baseSessionData: SessionData = {
    phase: 'statement-locking',
    conflictContext: 'relationship',
    agreedIssue: 'We disagree about screen time',
    playerOneSteelMan: 'Player 1 understands player 2 perspective',
    playerTwoSteelMan: 'Player 2 understands player 1 perspective',
    playerOneStatement: '',
    playerTwoStatement: '',
    messages: [],
    proposedResolution: '',
    finalResolution: '',
    sessionStarted: Date.now()
  }

  beforeEach(() => {
    mockUpdateSessionData.mockClear()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('displays the phase title and instructions', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/Statement Locking/)).toBeInTheDocument()
      expect(screen.getByText(/carve your truth in digital stone/i)).toBeInTheDocument()
      expect(screen.getByText(/once locked, there's no/i)).toBeInTheDocument()
    })

    it('shows the agreed issue and steel-man summaries', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('We disagree about screen time')).toBeInTheDocument()
      expect(screen.getByText('Player 1 understands player 2 perspective')).toBeInTheDocument()
      expect(screen.getByText('Player 2 understands player 1 perspective')).toBeInTheDocument()
    })

    it('shows current player indicator', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2')).toBeInTheDocument()
    })
  })

  describe('Statement Input', () => {
    it('allows user to type their statement', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statement = 'My definitive perspective on this issue with sufficient detail for validation'
      await user.type(textarea, statement)

      expect(textarea).toHaveValue(statement)
    })

    it('shows lock confirmation dialog before final submission', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statement = 'My comprehensive and final statement on this matter that cannot be changed'
      await user.type(textarea, statement)

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByText(/this cannot be changed/i)).toBeInTheDocument()
    })

    it('validates statement before showing confirmation', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const lockButton = screen.getByRole('button', { name: /lock statement/i })

      // Try with too short statement
      await user.type(textarea, 'Too short')
      await user.click(lockButton)

      // Should not show confirmation dialog due to validation failure
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('validates against invalid content', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const lockButton = screen.getByRole('button', { name: /lock statement/i })

      await user.type(textarea, 'This statement contains invalid content that should be rejected')
      await user.click(lockButton)

      // Should not show confirmation dialog
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('locks statement after confirmation', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statement = 'My comprehensive and validated statement that represents my final position'
      await user.type(textarea, statement)

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      // Confirm the lock
      const confirmButton = screen.getByRole('button', { name: /yes.*lock/i })
      await user.click(confirmButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerOneStatement: statement
      })
    })

    it('allows canceling the lock confirmation', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statement = 'My comprehensive statement that I might want to reconsider'
      await user.type(textarea, statement)

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockUpdateSessionData).not.toHaveBeenCalled()
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })
  })

  describe('Locked Statements Display', () => {
    it('displays player locked statement as immutable', () => {
      const sessionWithLockedStatement: SessionData = {
        ...baseSessionData,
        playerOneStatement: 'My locked statement that cannot be changed'
      }

      render(
        <StatementLocking
          sessionData={sessionWithLockedStatement}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('My locked statement that cannot be changed')).toBeInTheDocument()
      expect(screen.getByText(/locked/i)).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('shows other player locked statement when available', () => {
      const sessionWithBothStatements: SessionData = {
        ...baseSessionData,
        playerOneStatement: 'Player 1 locked statement',
        playerTwoStatement: 'Player 2 locked statement'
      }

      render(
        <StatementLocking
          sessionData={sessionWithBothStatements}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 1 locked statement')).toBeInTheDocument()
      expect(screen.getByText('Player 2 locked statement')).toBeInTheDocument()
    })

    it('shows proceed button when both statements are locked', () => {
      const sessionWithBothStatements: SessionData = {
        ...baseSessionData,
        playerOneStatement: 'Player 1 comprehensive final statement',
        playerTwoStatement: 'Player 2 comprehensive final statement'
      }

      render(
        <StatementLocking
          sessionData={sessionWithBothStatements}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const proceedButton = screen.getByRole('button', { name: /proceed to discussion/i })
      expect(proceedButton).toBeInTheDocument()
    })

    it('advances to discussion phase when proceed is clicked', async () => {
      const user = userEvent.setup()
      const sessionWithBothStatements: SessionData = {
        ...baseSessionData,
        playerOneStatement: 'Player 1 statement',
        playerTwoStatement: 'Player 2 statement'
      }

      render(
        <StatementLocking
          sessionData={sessionWithBothStatements}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const proceedButton = screen.getByRole('button', { name: /proceed to discussion/i })
      await user.click(proceedButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({ phase: 'discussion' })
    })
  })

  describe('Player Role Handling', () => {
    it('handles player2 correctly', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statement = 'Player 2 comprehensive statement that meets validation requirements'
      await user.type(textarea, statement)

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      const confirmButton = screen.getByRole('button', { name: /yes.*lock/i })
      await user.click(confirmButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerTwoStatement: statement
      })
    })

    it('shows correct locked statement for each player', () => {
      const sessionWithP2Statement: SessionData = {
        ...baseSessionData,
        playerTwoStatement: 'Player 2 locked statement'
      }

      render(
        <StatementLocking
          sessionData={sessionWithP2Statement}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2 locked statement')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty steel-man data gracefully', () => {
      const sessionWithoutSteelMans: SessionData = {
        ...baseSessionData,
        playerOneSteelMan: '',
        playerTwoSteelMan: ''
      }

      render(
        <StatementLocking
          sessionData={sessionWithoutSteelMans}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Should still render without crashing
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('trims whitespace from statement submissions', async () => {
      const user = userEvent.setup()
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const statementWithWhitespace = '  My statement with leading and trailing spaces  '
      await user.type(textarea, statementWithWhitespace)

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      const confirmButton = screen.getByRole('button', { name: /yes.*lock/i })
      await user.click(confirmButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        playerOneStatement: statementWithWhitespace.trim()
      })
    })

    it('clears input after successful lock', async () => {
      const user = userEvent.setup()
      const sessionBeforeLock: SessionData = {
        ...baseSessionData,
        playerOneStatement: ''
      }

      const { rerender } = render(
        <StatementLocking
          sessionData={sessionBeforeLock}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Valid statement that meets all requirements')

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      await user.click(lockButton)

      const confirmButton = screen.getByRole('button', { name: /yes.*lock/i })
      await user.click(confirmButton)

      // Simulate the component re-rendering with locked statement
      const sessionAfterLock: SessionData = {
        ...baseSessionData,
        playerOneStatement: 'Valid statement that meets all requirements'
      }

      rerender(
        <StatementLocking
          sessionData={sessionAfterLock}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Input should no longer be visible
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for form controls', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('uses proper heading structure', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('provides clear button labels', () => {
      render(
        <StatementLocking
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const lockButton = screen.getByRole('button', { name: /lock statement/i })
      expect(lockButton).toBeInTheDocument()
    })
  })
})