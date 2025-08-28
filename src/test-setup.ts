import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global spark object
const mockSpark = {
  llmPrompt: vi.fn((strings, ...values) => strings.join('') + values.join('')),
  llm: vi.fn(() => Promise.resolve('{}')),
  user: vi.fn(() => Promise.resolve({ 
    login: 'testuser', 
    avatarUrl: '', 
    email: 'test@example.com',
    id: '123',
    isOwner: true 
  })),
  kv: {
    get: vi.fn(() => Promise.resolve(undefined)),
    set: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    keys: vi.fn(() => Promise.resolve([]))
  }
}

Object.defineProperty(window, 'spark', {
  value: mockSpark,
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})