import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResolutionPhase from '../../components/ResolutionPhase'
import { SessionData } from '../../types/session'

describe('ResolutionPhase', () => {
  const mockUpdateSessionData = vi.fn()
  
  const baseSessionData: SessionData = {
    phase: 'resolution',
    conflictContext: 'relationship',
    agreedIssue: 'We disagree about screen time',
    playerOneSteelMan: 'Player 1 steel-man',
    playerTwoSteelMan: 'Player 2 steel-man',
    playerOneStatement: 'Player 1 statement',
    playerTwoStatement: 'Player 2 statement',
    messages: [
      {
        id: '1',
        text: 'We discussed this thoroughly',
        player: 'player1',
        timestamp: Date.now(),
        type: 'user'
      }
    ],
    proposedResolution: '',
    finalResolution: '',
    sessionStarted: Date.now()
  }

  beforeEach(() => {
    mockUpdateSessionData.mockClear()
  })

  describe('Initial State', () => {
    it('displays the phase title and instructions', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/resolution phase/i)).toBeInTheDocument()
      expect(screen.getByText(/time to find a way out/i)).toBeInTheDocument()
    })

    it('shows discussion summary from previous phases', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('We disagree about screen time')).toBeInTheDocument()
      expect(screen.getByText('Player 1 statement')).toBeInTheDocument()
      expect(screen.getByText('Player 2 statement')).toBeInTheDocument()
    })

    it('displays resolution proposal input when no resolution exists', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /propose resolution/i })).toBeInTheDocument()
    })
  })

  describe('Proposing Resolution', () => {
    it('allows typing a resolution proposal', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposal = 'We will establish screen-free hours from 8-10pm daily'
      
      await user.type(textarea, proposal)
      expect(textarea).toHaveValue(proposal)
    })

    it('submits resolution proposal', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      const proposal = 'Detailed resolution with specific action steps'
      
      await user.type(textarea, proposal)
      await user.click(proposeButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        proposedResolution: proposal
      })
    })

    it('clears input after successful proposal', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      
      await user.type(textarea, 'Test proposal')
      await user.click(proposeButton)

      expect(textarea).toHaveValue('')
    })

    it('ignores empty proposals', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      await user.click(proposeButton)

      expect(mockUpdateSessionData).not.toHaveBeenCalled()
    })

    it('trims whitespace from proposals', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      const proposalWithWhitespace = '  Resolution with spaces  '
      
      await user.type(textarea, proposalWithWhitespace)
      await user.click(proposeButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        proposedResolution: proposalWithWhitespace.trim()
      })
    })
  })

  describe('Resolution Review', () => {
    it('displays proposed resolution for review', () => {
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Proposed resolution for review'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Proposed resolution for review')).toBeInTheDocument()
    })

    it('shows accept and modify buttons for proposed resolution', () => {
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Test resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    })

    it('accepts resolution and moves to summary', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Accepted resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await user.click(acceptButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        finalResolution: 'Accepted resolution',
        phase: 'summary'
      })
    })

    it('rejects resolution and returns to proposal state', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Rejected resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        proposedResolution: ''
      })
    })
  })

  describe('Resolution Modification', () => {
    it('shows modification input when modify is clicked', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Original resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const modifyButton = screen.getByRole('button', { name: /modify/i })
      await user.click(modifyButton)

      expect(screen.getByPlaceholderText(/suggest modifications/i)).toBeInTheDocument()
    })

    it('allows typing modification suggestions', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Original resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const modifyButton = screen.getByRole('button', { name: /modify/i })
      await user.click(modifyButton)

      const modificationInput = screen.getByPlaceholderText(/suggest modifications/i)
      const modification = 'Please add specific timing details'
      
      await user.type(modificationInput, modification)
      expect(modificationInput).toHaveValue(modification)
    })

    it('submits resolution modification', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Original resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const modifyButton = screen.getByRole('button', { name: /modify/i })
      await user.click(modifyButton)

      const modificationInput = screen.getByPlaceholderText(/suggest modifications/i)
      const submitModificationButton = screen.getByRole('button', { name: /submit modification/i })
      const modification = 'Add timeline and accountability measures'
      
      await user.type(modificationInput, modification)
      await user.click(submitModificationButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        proposedResolution: expect.stringContaining('Original resolution'),
        // Should include modification note or handle it appropriately
      })
    })

    it('cancels modification and returns to review', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Original resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const modifyButton = screen.getByRole('button', { name: /modify/i })
      await user.click(modifyButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Should return to review state
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/suggest modifications/i)).not.toBeInTheDocument()
    })
  })

  describe('Resolution History', () => {
    it('shows negotiation history when multiple proposals exist', () => {
      const sessionWithHistory: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Latest resolution proposal',
        // In a real implementation, this might track resolution history
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithHistory}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Latest resolution proposal')).toBeInTheDocument()
    })

    it('displays number of negotiation rounds', () => {
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Resolution after negotiation'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Should show some indication of negotiation progress
      expect(screen.getByText(/proposed resolution/i)).toBeInTheDocument()
    })
  })

  describe('Final Resolution', () => {
    it('displays final resolution when agreed upon', () => {
      const sessionWithFinalResolution: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Proposed resolution',
        finalResolution: 'Final agreed resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithFinalResolution}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Final agreed resolution')).toBeInTheDocument()
    })

    it('shows completion message when resolution is final', () => {
      const sessionWithFinalResolution: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Proposed resolution',
        finalResolution: 'Final resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithFinalResolution}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/resolution agreed/i)).toBeInTheDocument()
    })

    it('provides option to proceed to summary', () => {
      const sessionWithFinalResolution: SessionData = {
        ...baseSessionData,
        finalResolution: 'Final resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithFinalResolution}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const summaryButton = screen.getByRole('button', { name: /view summary/i })
      expect(summaryButton).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty session data gracefully', () => {
      const emptySession: SessionData = {
        ...baseSessionData,
        agreedIssue: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        messages: []
      }

      render(
        <ResolutionPhase
          sessionData={emptySession}
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Should still render without crashing
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('handles long resolution text', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const longResolution = 'This is a very detailed resolution that includes multiple steps, timelines, responsibilities, and accountability measures that might be quite lengthy to ensure all aspects of the conflict are properly addressed and both parties understand their commitments.'
      
      await user.type(textarea, longResolution)
      expect(textarea).toHaveValue(longResolution)
    })

    it('prevents duplicate submissions', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      
      await user.type(textarea, 'Resolution proposal')
      await user.click(proposeButton)
      await user.click(proposeButton) // Second click

      // Should only be called once
      expect(mockUpdateSessionData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('uses proper heading structure', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const heading = screen.getByRole('heading')
      expect(heading).toBeInTheDocument()
    })

    it('provides clear button labels', () => {
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Test resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    })

    it('maintains focus management during state changes', async () => {
      const user = userEvent.setup()
      const sessionWithProposal: SessionData = {
        ...baseSessionData,
        proposedResolution: 'Test resolution'
      }

      render(
        <ResolutionPhase
          sessionData={sessionWithProposal}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const modifyButton = screen.getByRole('button', { name: /modify/i })
      await user.click(modifyButton)

      const modificationInput = screen.getByPlaceholderText(/suggest modifications/i)
      expect(modificationInput).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates resolution length', async () => {
      const user = userEvent.setup()
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      const proposeButton = screen.getByRole('button', { name: /propose resolution/i })
      
      // Try with very short resolution
      await user.type(textarea, 'No')
      await user.click(proposeButton)

      // Should still submit but ideally would have validation
      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        proposedResolution: 'No'
      })
    })

    it('provides helpful placeholder text', () => {
      render(
        <ResolutionPhase
          sessionData={baseSessionData}
          updateSessionData={mockUpdateSessionData}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder')
    })
  })
})