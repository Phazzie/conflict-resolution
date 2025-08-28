import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { machineLearningService } from '../mlServiceOptimized'

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: ErrorEvent) => void) | null = null
  
  postMessage(message: any) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            id: message.id,
            type: 'success',
            result: this.getMockResult(message.type, message.payload)
          }
        } as MessageEvent)
      }
    }, 10)
  }
  
  terminate() {
    // Mock termination
  }
  
  private getMockResult(type: string, payload: any) {
    switch (type) {
      case 'predict':
        return {
          patterns: [{
            pattern: 'test-pattern',
            confidence: 0.8,
            reasoning: 'Mock prediction'
          }]
        }
      case 'optimize':
        return {
          ...payload,
          accuracy: 0.9,
          lastOptimized: Date.now()
        }
      case 'train':
        return {
          ...payload.model,
          accuracy: payload.model.accuracy + 0.1
        }
      case 'evaluate':
        return { accuracy: 0.85, loss: 0.15 }
      default:
        return {}
    }
  }
}

// Mock the Worker constructor
global.Worker = vi.fn().mockImplementation(() => new MockWorker()) as any
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  setTimeout(() => callback({ timeRemaining: () => 2000 }), 0)
}) as any

describe('MLServiceOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    machineLearningService.cleanup()
  })

  it('initializes without errors', () => {
    expect(machineLearningService).toBeDefined()
  })

  it('predicts patterns using worker', async () => {
    const result = await machineLearningService.predictPatterns('you always do this')
    
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('learns from session outcomes', async () => {
    const sessionData = {
      phase: 'resolved' as const,
      conflictContext: 'relationship' as const,
      messages: [
        {
          id: 'test-msg',
          content: 'test message',
          sender: 'player1' as const,
          timestamp: Date.now()
        }
      ],
      agreedIssue: 'test issue',
      playerOneSteelMan: '',
      playerTwoSteelMan: '',
      playerOneStatement: '',
      playerTwoStatement: '',
      proposedResolution: '',
      finalResolution: 'resolved',
      sessionStarted: Date.now()
    }

    await expect(
      machineLearningService.learnFromSessionOutcome(sessionData, 'resolved')
    ).resolves.not.toThrow()
  })

  it('optimizes model without blocking UI', async () => {
    const startTime = Date.now()
    
    await machineLearningService.optimizeModel()
    
    const endTime = Date.now()
    // Should complete quickly (not actually do heavy computation)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  it('evaluates model performance', async () => {
    const result = await machineLearningService.evaluateModel()
    
    expect(result).toBeDefined()
    expect(typeof result.accuracy).toBe('number')
  })

  it('gets training progress', async () => {
    const progress = await machineLearningService.getTrainingProgress()
    
    expect(progress).toBeDefined()
    expect(typeof progress.accuracy).toBe('number')
    expect(typeof progress.trainingExamples).toBe('number')
  })

  it('handles worker errors gracefully', async () => {
    // Mock worker error
    const workerInstance = new MockWorker()
    vi.mocked(Worker).mockImplementationOnce(() => {
      const errorWorker = new MockWorker()
      setTimeout(() => {
        if (errorWorker.onerror) {
          errorWorker.onerror(new ErrorEvent('error', { message: 'Worker failed' }))
        }
      }, 5)
      return errorWorker
    })

    // Should not throw even if worker fails
    const result = await machineLearningService.predictPatterns('test')
    expect(result).toBeDefined()
  })

  it('provides fallback when workers not supported', async () => {
    // Mock Worker as undefined to simulate unsupported environment
    const originalWorker = global.Worker
    ;(global as any).Worker = undefined

    // Service should still work with fallbacks
    const result = await machineLearningService.predictPatterns('you always test')
    expect(result).toBeDefined()

    // Restore Worker
    global.Worker = originalWorker
  })
})