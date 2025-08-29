import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiscussionPhase from '../../components/DiscussionPhase'
import { SessionData, Message } from '../../types/session'

// Mock services
vi.mock('../../utils/validation', () => ({
  validateMessageInput: vi.fn((input: string) => {
    if (input.length === 0) {
      return { isValid: false, error: 'Message cannot be empty' }
    }
    if (input.length > 500) {
      return { isValid: false, error: 'Message too long' }
    }
    return { isValid: true }
  })
}))

vi.mock('../../services/aiServiceUnified', () => ({
  unifiedAIService: {
    analyzeMessage: vi.fn().mockResolvedValue({
      suggestions: ['Consider rephrasing this more constructively'],
      toxicPatterns: [],
      sentiment: 'neutral',
      confidence: 0.8
    })
  }
}))

vi.mock('../../services/patternRecognition', () => ({
  patternRecognitionService: {
    detectPatterns: vi.fn().mockResolvedValue([]),
    updateLearning: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('../../services/machineLearning', () => ({
  machineLearningService: {
    predictPatterns: vi.fn().mockResolvedValue([]),
    learnFromFeedback: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('DiscussionPhase', () => {
  const mockUpdateSessionData = vi.fn()
  
  const baseSessionData: SessionData = {
    phase: 'discussion',
    conflictContext: 'relationship',
    agreedIssue: 'We disagree about screen time',
    playerOneSteelMan: 'Player 1 steel-man',
    playerTwoSteelMan: 'Player 2 steel-man',
    playerOneStatement: 'Player 1 statement',
    playerTwoStatement: 'Player 2 statement',
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
    it('displays phase title and instructions', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/discussion phase/i)).toBeInTheDocument()
      expect(screen.getByText(/ai-moderated discussion/i)).toBeInTheDocument()
    })

    it('shows locked statements from previous phase', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 1 statement')).toBeInTheDocument()
      expect(screen.getByText('Player 2 statement')).toBeInTheDocument()
    })

    it('displays message input field', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      expect(messageInput).toBeInTheDocument()
    })

    it('shows current player indicator', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player2"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('Player 2')).toBeInTheDocument()
    })
  })

  describe('Message Input', () => {
    it('allows typing in message input', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'This is my message')

      expect(messageInput).toHaveValue('This is my message')
    })

    it('validates empty messages', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(screen.getByText('Message cannot be empty')).toBeInTheDocument()
    })

    it('validates message length', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const longMessage = 'a'.repeat(501)
      await user.type(messageInput, longMessage)

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(screen.getByText('Message too long')).toBeInTheDocument()
    })

    it('sends valid message', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(messageInput, 'This is a valid message')
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockUpdateSessionData).toHaveBeenCalledWith({
          messages: expect.arrayContaining([
            expect.objectContaining({
              text: 'This is a valid message',
              player: 'player1',
              type: 'user'
            })
          ])
        })
      })
    })

    it('clears input after sending message', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(messageInput, 'Test message')
      await user.click(sendButton)

      await waitFor(() => {
        expect(messageInput).toHaveValue('')
      })
    })

    it('allows sending message with Enter key', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      
      await user.type(messageInput, 'Message sent with enter')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockUpdateSessionData).toHaveBeenCalledWith({
          messages: expect.arrayContaining([
            expect.objectContaining({
              text: 'Message sent with enter',
              player: 'player1',
              type: 'user'
            })
          ])
        })
      })
    })
  })

  describe('Message Display', () => {
    it('displays existing messages in conversation', () => {
      const sessionWithMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'First message from player 1',
            player: 'player1',
            timestamp: Date.now() - 60000,
            type: 'user'
          },
          {
            id: '2',
            text: 'Response from player 2',
            player: 'player2',
            timestamp: Date.now() - 30000,
            type: 'user'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('First message from player 1')).toBeInTheDocument()
      expect(screen.getByText('Response from player 2')).toBeInTheDocument()
    })

    it('displays AI intervention messages', () => {
      const sessionWithAIMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'User message',
            player: 'player1',
            timestamp: Date.now() - 30000,
            type: 'user'
          },
          {
            id: '2',
            text: 'AI suggestion: Consider rephrasing this more constructively',
            player: 'ai',
            timestamp: Date.now(),
            type: 'ai-suggestion'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithAIMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText('User message')).toBeInTheDocument()
      expect(screen.getByText(/ai suggestion.*consider rephrasing/i)).toBeInTheDocument()
    })

    it('shows message timestamps', () => {
      const sessionWithMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'Timestamped message',
            player: 'player1',
            timestamp: Date.now() - 60000,
            type: 'user'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(screen.getByText(/minute ago/i)).toBeInTheDocument()
    })

    it('distinguishes between different player messages', () => {
      const sessionWithMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'Player 1 message',
            player: 'player1',
            timestamp: Date.now(),
            type: 'user'
          },
          {
            id: '2',
            text: 'Player 2 message', 
            player: 'player2',
            timestamp: Date.now(),
            type: 'user'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const p1Messages = screen.getAllByText(/player 1/i)
      const p2Messages = screen.getAllByText(/player 2/i)
      
      expect(p1Messages.length).toBeGreaterThan(0)
      expect(p2Messages.length).toBeGreaterThan(0)
    })
  })

  describe('AI Analysis', () => {
    it('shows AI analysis loading state', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(messageInput, 'Message that will trigger AI analysis')
      await user.click(sendButton)

      expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
    })

    it('handles AI analysis errors gracefully', async () => {
      const { unifiedAIService } = await import('../../services/aiServiceUnified')
      vi.mocked(unifiedAIService.analyzeMessage).mockRejectedValueOnce(new Error('API Error'))

      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(messageInput, 'Message that causes AI error')
      await user.click(sendButton)

      // Message should still be sent even if AI analysis fails
      await waitFor(() => {
        expect(mockUpdateSessionData).toHaveBeenCalledWith({
          messages: expect.arrayContaining([
            expect.objectContaining({
              text: 'Message that causes AI error',
              player: 'player1',
              type: 'user'
            })
          ])
        })
      })
    })
  })

  describe('Resolution Actions', () => {
    it('shows resolution button after sufficient discussion', () => {
      const sessionWithDiscussion: SessionData = {
        ...baseSessionData,
        messages: Array.from({ length: 5 }, (_, i) => ({
          id: `msg-${i}`,
          text: `Message ${i + 1}`,
          player: i % 2 === 0 ? 'player1' : 'player2',
          timestamp: Date.now() - (5 - i) * 60000,
          type: 'user' as const
        }))
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithDiscussion}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const resolutionButton = screen.getByRole('button', { name: /propose resolution/i })
      expect(resolutionButton).toBeInTheDocument()
    })

    it('advances to resolution phase when button clicked', async () => {
      const user = userEvent.setup()
      const sessionWithDiscussion: SessionData = {
        ...baseSessionData,
        messages: Array.from({ length: 5 }, (_, i) => ({
          id: `msg-${i}`,
          text: `Message ${i + 1}`,
          player: i % 2 === 0 ? 'player1' : 'player2',
          timestamp: Date.now() - (5 - i) * 60000,
          type: 'user' as const
        }))
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithDiscussion}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const resolutionButton = screen.getByRole('button', { name: /propose resolution/i })
      await user.click(resolutionButton)

      expect(mockUpdateSessionData).toHaveBeenCalledWith({ phase: 'resolution' })
    })
  })

  describe('ML Insights', () => {
    it('shows ML insights toggle when available', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const insightsButton = screen.getByRole('button', { name: /ml insights/i })
      expect(insightsButton).toBeInTheDocument()
    })

    it('toggles ML insights display', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const insightsButton = screen.getByRole('button', { name: /ml insights/i })
      await user.click(insightsButton)

      expect(screen.getByText(/pattern insights/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      expect(messageInput).toHaveAttribute('aria-label')
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      
      await user.click(messageInput)
      expect(messageInput).toHaveFocus()
    })

    it('provides screen reader friendly message list', () => {
      const sessionWithMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'Test message',
            player: 'player1',
            timestamp: Date.now(),
            type: 'user'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageList = screen.getByRole('log')
      expect(messageList).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid message sending', async () => {
      const user = userEvent.setup()
      render(
        <DiscussionPhase
          sessionData={baseSessionData}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      // Send multiple messages quickly
      await user.type(messageInput, 'First rapid message')
      await user.click(sendButton)
      
      await user.type(messageInput, 'Second rapid message')
      await user.click(sendButton)

      expect(mockUpdateSessionData).toHaveBeenCalledTimes(2)
    })

    it('scrolls to bottom when new messages arrive', () => {
      const mockScrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = mockScrollIntoView

      const sessionWithMessages: SessionData = {
        ...baseSessionData,
        messages: [
          {
            id: '1',
            text: 'New message',
            player: 'player1',
            timestamp: Date.now(),
            type: 'user'
          }
        ]
      }

      render(
        <DiscussionPhase
          sessionData={sessionWithMessages}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    })

    it('handles long message history without performance issues', () => {
      const longMessageHistory: SessionData = {
        ...baseSessionData,
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          text: `Message ${i + 1} with some content`,
          player: i % 2 === 0 ? 'player1' : 'player2',
          timestamp: Date.now() - (100 - i) * 1000,
          type: 'user' as const
        }))
      }

      const { container } = render(
        <DiscussionPhase
          sessionData={longMessageHistory}
          currentPlayer="player1"
          updateSessionData={mockUpdateSessionData}
        />
      )

      // Should render without throwing errors
      expect(container).toBeInTheDocument()
      
      // Should still show all messages
      expect(screen.getByText('Message 1 with some content')).toBeInTheDocument()
      expect(screen.getByText('Message 100 with some content')).toBeInTheDocument()
    })
  })
})