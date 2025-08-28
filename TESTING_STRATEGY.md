# MixitFixit Testing Strategy & Implementation Plan

## Current Testing Status: 🚨 ZERO COVERAGE

The MixitFixit application currently has **NO TESTS WHATSOEVER**. This is a critical production readiness blocker.

## Critical Testing Infrastructure Setup

### Phase 1: Foundation Setup (Day 1)

#### Install Testing Dependencies
```bash
npm install --save-dev \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  msw \
  @types/jest
```

#### Configure Vitest
```typescript
// vite.config.ts additions
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
})
```

#### Setup Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── integration/
├── __mocks__/
│   ├── spark.ts
│   └── services/
└── test/
    ├── setup.ts
    └── helpers.ts
```

## Priority Testing Targets

### 🚨 CRITICAL (Must Test First)

#### 1. Machine Learning Service (1,188 lines, 0 tests)
```typescript
// Tests needed:
describe('MachineLearningService', () => {
  describe('Pattern Prediction', () => {
    test('should predict manipulation patterns correctly')
    test('should handle unknown patterns gracefully')
    test('should update confidence scores based on feedback')
  })
  
  describe('Model Training', () => {
    test('should learn from user feedback')
    test('should not overfit with limited data')
    test('should maintain model performance over time')
  })
  
  describe('Optimization', () => {
    test('should optimize weights without breaking model')
    test('should handle gradient calculation errors')
    test('should prevent model corruption during updates')
  })
})
```

#### 2. AI Analysis Service (283 lines, 0 tests)
```typescript
describe('AIAnalysisService', () => {
  test('should analyze messages for manipulation tactics')
  test('should provide fallback analysis when LLM fails')
  test('should generate contextual interventions')
  test('should handle malformed AI responses')
  test('should rate-limit API calls')
})
```

#### 3. Session Data Validation (354 lines, 0 tests)
```typescript
describe('Session Validation', () => {
  test('should validate complete session data')
  test('should detect corrupted session state')
  test('should handle missing required fields')
  test('should sanitize user inputs')
})
```

### ⚠️ HIGH PRIORITY 

#### 4. Core Components
```typescript
// App.tsx (608 lines) - Split into testable parts first
describe('Session Flow', () => {
  test('should progress through all phases correctly')
  test('should handle phase transitions with validation')
  test('should recover from session corruption')
  test('should maintain state consistency')
})

// Discussion Phase (711 lines)
describe('DiscussionPhase', () => {
  test('should handle AI interventions correctly')
  test('should prevent manipulation tactics')
  test('should maintain message ordering')
  test('should handle offline/online transitions')
})
```

#### 5. Session History Service (952 lines, 0 tests)
```typescript
describe('SessionHistoryService', () => {
  test('should save session data correctly')
  test('should retrieve historical patterns')
  test('should handle storage quota limits')
  test('should migrate old data formats')
})
```

### 📋 MEDIUM PRIORITY

#### 6. Analytics & Pattern Recognition
```typescript
describe('Analytics', () => {
  test('should generate accurate session metrics')
  test('should detect communication improvements')
  test('should track pattern evolution over time')
})

describe('PatternRecognition', () => {
  test('should identify recurring relationship issues')
  test('should suggest appropriate interventions')
  test('should adapt to user feedback')
})
```

## Mock Strategy

### Critical Mocks Needed

#### 1. Spark API Mock
```typescript
// src/__mocks__/spark.ts
const mockSpark = {
  llm: vi.fn().mockResolvedValue('Mocked AI response'),
  llmPrompt: vi.fn((strings, ...values) => strings.join('')),
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn().mockResolvedValue([])
  },
  user: vi.fn().mockResolvedValue({
    id: 'test-user',
    login: 'testuser',
    avatarUrl: 'https://example.com/avatar.png',
    email: 'test@example.com',
    isOwner: true
  })
}

global.spark = mockSpark
```

#### 2. LocalStorage Mock
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock
```

#### 3. Service Mocks
```typescript
// Mock complex ML computations
vi.mock('@/services/machineLearning', () => ({
  machineLearningService: {
    predictPatterns: vi.fn().mockResolvedValue([]),
    learnFromFeedback: vi.fn(),
    getModelMetrics: vi.fn().mockReturnValue({ accuracy: 0.85 })
  }
}))
```

## Integration Testing Strategy

### User Journey Tests

#### Complete Session Flow
```typescript
describe('Complete Session Journey', () => {
  test('should complete relationship conflict resolution', async () => {
    // 1. Welcome screen → Context selection
    render(<App />)
    fireEvent.click(screen.getByText('Enter the Digital Thunderdome'))
    
    // 2. Select relationship context
    fireEvent.click(screen.getByText('Relationship'))
    
    // 3. Issue agreement flow
    const issueInput = screen.getByPlaceholderText('Describe the issue')
    fireEvent.change(issueInput, { target: { value: 'Communication problems' } })
    // ... continue through all phases
    
    // 4. Verify resolution reached
    expect(screen.getByText('Resolution achieved!')).toBeInTheDocument()
  })
})
```

#### Error Recovery Scenarios
```typescript
describe('Error Recovery', () => {
  test('should recover from AI service failure', async () => {
    // Mock AI service failure
    mockSpark.llm.mockRejectedValue(new Error('API timeout'))
    
    // Verify fallback behavior
    // Verify user can continue session
    // Verify data is preserved
  })
  
  test('should recover from localStorage corruption', async () => {
    // Mock corrupted session data
    localStorage.getItem.mockReturnValue('invalid-json')
    
    // Verify graceful degradation
    // Verify clean session start
  })
})
```

## Performance Testing

### Critical Performance Tests

#### 1. ML Model Performance
```typescript
describe('ML Performance', () => {
  test('should predict patterns within acceptable time', async () => {
    const startTime = Date.now()
    await machineLearningService.predictPatterns(mockMessage, mockContext)
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(500) // 500ms limit
  })
  
  test('should not block main thread during optimization', async () => {
    // Test that auto-optimization doesn't freeze UI
    const isMainThreadBlocked = await testMainThreadResponsiveness()
    expect(isMainThreadBlocked).toBe(false)
  })
})
```

#### 2. Memory Leak Detection
```typescript
describe('Memory Management', () => {
  test('should not accumulate memory with long sessions', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0
    
    // Simulate long session with many messages
    for (let i = 0; i < 1000; i++) {
      await simulateMessage()
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc()
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB limit
  })
})
```

## Security Testing

### Input Validation Tests
```typescript
describe('Security', () => {
  test('should sanitize user inputs', () => {
    const maliciousInput = '<script>alert("xss")</script>'
    const sanitized = sanitizeUserInput(maliciousInput)
    expect(sanitized).not.toContain('<script>')
  })
  
  test('should not expose sensitive data in localStorage', () => {
    const sessionData = { sensitiveToken: 'secret123' }
    saveSessionData(sessionData)
    
    const stored = localStorage.getItem('mixitfixit-session')
    expect(stored).not.toContain('secret123')
  })
})
```

## Test Data Management

### Mock Session Data
```typescript
export const mockSessionData = {
  valid: {
    phase: 'discussion',
    conflictContext: 'relationship',
    agreedIssue: 'Communication breakdown',
    messages: [
      {
        id: '1',
        author: 'player1',
        content: 'I feel unheard when you interrupt me',
        timestamp: Date.now(),
        aiAnalysis: {
          toxicityScore: 0.2,
          emotionalTone: { primary: 'hurt', intensity: 0.6 }
        }
      }
    ]
  },
  corrupted: {
    phase: 'invalid-phase',
    messages: 'not-an-array'
  },
  largeset: generateLargeSessionData(10000) // For performance testing
}
```

## Coverage Targets

### Minimum Coverage Requirements
- **Overall**: 80%
- **Services**: 90% (critical business logic)
- **Components**: 70% (UI components)
- **Utils**: 95% (pure functions)
- **Types**: 100% (type definitions)

### Coverage Exclusions
```javascript
// vitest.config.ts coverage exclude
exclude: [
  'src/test/**',
  'src/**/*.stories.ts',
  'src/**/*.test.ts',
  'src/types/**', // Type definitions
  'src/assets/**', // Static assets
]
```

## Continuous Integration

### GitHub Actions Testing Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      
      - name: Coverage Report
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Install testing dependencies
- [ ] Set up basic test structure  
- [ ] Create essential mocks
- [ ] Write first 10 critical tests

### Week 2: Core Services
- [ ] Complete ML service tests
- [ ] Complete AI analysis tests
- [ ] Complete session validation tests
- [ ] Achieve 50% overall coverage

### Week 3: Components & Integration
- [ ] Major component tests
- [ ] Integration test suite
- [ ] Error recovery tests
- [ ] Achieve 70% overall coverage

### Week 4: Performance & Security
- [ ] Performance benchmarks
- [ ] Security validation tests
- [ ] Memory leak detection
- [ ] Achieve 80% overall coverage

## Testing Best Practices

### Test Organization
```typescript
// Good: Descriptive test names
describe('MachineLearningService', () => {
  describe('when learning from incorrect feedback', () => {
    test('should increase learning rate for surprising mistakes', () => {
      // Test implementation
    })
  })
})

// Bad: Vague test names
describe('ML', () => {
  test('should work', () => {
    // Test implementation
  })
})
```

### Mock Management
- Keep mocks close to tests that use them
- Reset mocks between tests
- Use factory functions for complex mock data
- Mock at the service boundary, not implementation details

### Performance Considerations
- Use `vi.fn()` instead of full mock implementations
- Clean up resources in `afterEach`
- Avoid real network calls in tests
- Use fake timers for time-dependent tests

## Monitoring & Reporting

### Test Metrics to Track
- Coverage percentage by file/function
- Test execution time trends
- Flaky test detection
- Performance benchmark trends
- Error rate in different test environments

### Quality Gates
- All tests must pass before merge
- Coverage cannot decrease below 80%
- No new files without corresponding tests
- Performance tests must pass benchmarks
- Security tests must validate input sanitization

This testing strategy addresses the critical gap in the current codebase and provides a roadmap for achieving production-ready test coverage.