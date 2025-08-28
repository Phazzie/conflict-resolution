import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'

// Mock the spark hooks and external dependencies
vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn(() => [
    {
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
    },
    vi.fn(),
    vi.fn()
  ])
}))

// Mock all the complex services to prevent crashes
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

vi.mock('../services/machineLearning', () => ({
  machineLearningService: {
    learnFromSessionOutcome: vi.fn(() => Promise.resolve())
  }
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('MixitFixit')).toBeInTheDocument()
  })

  it('shows welcome screen initially', () => {
    render(<App />)
    expect(screen.getByText('Digital Thunderdome for All Your Conflicts')).toBeInTheDocument()
  })

  it('displays enter thunderdome button', () => {
    render(<App />)
    expect(screen.getByText('Enter the Digital Thunderdome')).toBeInTheDocument()
  })
})