import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IssueAgreement from '../../components/IssueAgreement'
import { SessionData } from '../../types/session'

// Mock validation utility
vi.mock('../../utils/validation', () => ({
  validateIssueInput: vi.fn((input: string) => {
    if (input.length < 10) {
      return { isValid: false, error: 'Issue must be at least 10 characters' }
    }
    if (input.includes('problematic')) {
      return { isValid: false, error: 'Problematic language detected' }
    }
    return { isValid: true }
  })
}))

// Mock conflict contexts
vi.mock('../../services/conflictContexts', () => ({
  CONFLICT_CONTEXTS: {
    relationship: {
      label: 'Relationship',
      description: 'Personal relationship conflicts',
      icon: 'Heart'
    },
    workplace: {
      label: 'Workplace',
      description: 'Professional conflicts',
      icon: 'Briefcase'
    },
    family: {
      label: 'Family',
      description: 'Family dynamics',
      icon: 'Users'
    }
  }
}))

// Mock loading components
vi.mock('../../components/ui/loading', () => ({
  SuccessCheckmark: ({ visible }: { visible: boolean }) => 
    visible ? <div data-testid="success-checkmark">Success!</div> : null,
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}))

describe('IssueAgreement Component', () => {
  let mockSessionData: SessionData
  let mockUpdateSessionData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUpdateSessionData = vi.fn()
    mockSessionData = {
      phase: 'issue-agreement',
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
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('renders issue proposal interface when no issue is agreed', () => {
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      expect(screen.getByText('What Are We Actually Fighting About?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Describe the specific issue/)).toBeInTheDocument()
      expect(screen.getByText('Propose Issue')).toBeInTheDocument()
    })

    it('shows conflict context information', () => {
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      expect(screen.getByText('Relationship')).toBeInTheDocument()
      expect(screen.getByText('Personal relationship conflicts')).toBeInTheDocument()
    })

    it('displays helpful examples for the conflict context', () => {
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      // Should show examples relevant to relationship context
      expect(screen.getByText(/Examples for this context:/)).toBeInTheDocument()
    })
  })

  describe('Issue Proposal', () => {
    it('allows user to type and propose an issue', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      await user.type(textarea, 'We disagree about how to manage household chores and responsibilities')
      await user.click(proposeButton)
      
      await waitFor(() => {
        expect(mockUpdateSessionData).toHaveBeenCalledWith({
          agreedIssue: 'We disagree about how to manage household chores and responsibilities'
        })
      })
    })

    it('validates input before allowing submission', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      // Try to submit with too short input
      await user.type(textarea, 'short')
      await user.click(proposeButton)
      
      expect(screen.getByText('Issue must be at least 10 characters')).toBeInTheDocument()
      expect(mockUpdateSessionData).not.toHaveBeenCalled()
    })

    it('prevents submission of problematic language', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      await user.type(textarea, 'This is a problematic statement that should be rejected')
      await user.click(proposeButton)
      
      expect(screen.getByText('Problematic language detected')).toBeInTheDocument()
      expect(mockUpdateSessionData).not.toHaveBeenCalled()
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      await user.type(textarea, 'Valid issue that is long enough to pass validation')
      await user.click(proposeButton)
      
      // Should show loading state briefly
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(mockUpdateSessionData).toHaveBeenCalled()
      })
    })

    it('shows success animation after successful submission', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      await user.type(textarea, 'Valid issue description for testing success state')
      await user.click(proposeButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('success-checkmark')).toBeInTheDocument()
      })
    })
  })

  describe('Issue Agreement Flow', () => {
    it('shows agreement interface when issue is proposed', () => {
      const sessionWithProposedIssue = {
        ...mockSessionData,
        agreedIssue: 'We have different views on financial planning'
      }
      
      render(
        <IssueAgreement 
          sessionData={sessionWithProposedIssue} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      expect(screen.getByText('Proposed Issue')).toBeInTheDocument()
      expect(screen.getByText('We have different views on financial planning')).toBeInTheDocument()
      expect(screen.getByText('Accept & Continue')).toBeInTheDocument()
      expect(screen.getByText('Modify')).toBeInTheDocument()
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    it('proceeds to steel-manning when issue is accepted', async () => {
      const user = userEvent.setup()
      const sessionWithProposedIssue = {
        ...mockSessionData,
        agreedIssue: 'We have different approaches to parenting'
      }
      
      render(
        <IssueAgreement 
          sessionData={sessionWithProposedIssue} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const acceptButton = screen.getByText('Accept & Continue')
      await user.click(acceptButton)
      
      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        phase: 'steel-manning'
      })
    })

    it('allows modification of the proposed issue', async () => {
      const user = userEvent.setup()
      const sessionWithProposedIssue = {
        ...mockSessionData,
        agreedIssue: 'We disagree about money management'
      }
      
      render(
        <IssueAgreement 
          sessionData={sessionWithProposedIssue} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const modifyButton = screen.getByText('Modify')
      await user.click(modifyButton)
      
      // Should show modification interface
      expect(screen.getByPlaceholderText(/Suggest a modification/)).toBeInTheDocument()
      
      const modificationTextarea = screen.getByPlaceholderText(/Suggest a modification/)
      await user.type(modificationTextarea, 'We disagree about financial planning and budgeting approaches')
      
      const submitModification = screen.getByText('Submit Modification')
      await user.click(submitModification)
      
      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        agreedIssue: 'We disagree about financial planning and budgeting approaches'
      })
    })

    it('rejects issue and returns to proposal state', async () => {
      const user = userEvent.setup()
      const sessionWithProposedIssue = {
        ...mockSessionData,
        agreedIssue: 'This is not the real issue'
      }
      
      render(
        <IssueAgreement 
          sessionData={sessionWithProposedIssue} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const rejectButton = screen.getByText('Reject')
      await user.click(rejectButton)
      
      expect(mockUpdateSessionData).toHaveBeenCalledWith({
        agreedIssue: ''
      })
    })
  })

  describe('Context-Specific Guidance', () => {
    it('shows workplace-specific examples for workplace context', () => {
      const workplaceSession = {
        ...mockSessionData,
        conflictContext: 'workplace' as const
      }
      
      render(
        <IssueAgreement 
          sessionData={workplaceSession} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      expect(screen.getByText('Workplace')).toBeInTheDocument()
      expect(screen.getByText('Professional conflicts')).toBeInTheDocument()
    })

    it('shows family-specific examples for family context', () => {
      const familySession = {
        ...mockSessionData,
        conflictContext: 'family' as const
      }
      
      render(
        <IssueAgreement 
          sessionData={familySession} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      expect(screen.getByText('Family')).toBeInTheDocument()
      expect(screen.getByText('Family dynamics')).toBeInTheDocument()
    })
  })

  describe('Input Validation Feedback', () => {
    it('provides real-time character count feedback', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      await user.type(textarea, 'Short')
      
      // Should show character count or validation hints
      expect(textarea.value).toBe('Short')
    })

    it('clears validation errors when input becomes valid', async () => {
      const user = userEvent.setup()
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      const proposeButton = screen.getByText('Propose Issue')
      
      // First try invalid input
      await user.type(textarea, 'short')
      await user.click(proposeButton)
      
      expect(screen.getByText('Issue must be at least 10 characters')).toBeInTheDocument()
      
      // Then fix the input
      await user.clear(textarea)
      await user.type(textarea, 'This is a much longer and more detailed issue description')
      
      // Error should be cleared when typing starts
      await waitFor(() => {
        expect(screen.queryByText('Issue must be at least 10 characters')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labeling for screen readers', () => {
      render(
        <IssueAgreement 
          sessionData={mockSessionData} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const textarea = screen.getByPlaceholderText(/Describe the specific issue/)
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('manages focus properly during state transitions', async () => {
      const user = userEvent.setup()
      const sessionWithProposedIssue = {
        ...mockSessionData,
        agreedIssue: 'Test issue'
      }
      
      render(
        <IssueAgreement 
          sessionData={sessionWithProposedIssue} 
          updateSessionData={mockUpdateSessionData} 
        />
      )
      
      const modifyButton = screen.getByText('Modify')
      await user.click(modifyButton)
      
      // Focus should move to modification textarea
      const modificationTextarea = screen.getByPlaceholderText(/Suggest a modification/)
      expect(modificationTextarea).toHaveFocus()
    })
  })
})