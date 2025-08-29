import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  withTimeout,
  withRetry,
  requestCache,
  debounce,
  throttle,
  CircuitBreaker,
  handleApiError,
  NetworkMonitor
} from '@/utils/apiResilience'

// Mock console methods to avoid noise in tests
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('API Resilience Utilities', () => {
  describe('withTimeout', () => {
    it('should resolve if promise completes within timeout', async () => {
      const fastPromise = Promise.resolve('success')
      const result = await withTimeout(fastPromise, 1000)
      expect(result).toBe('success')
    })

    it('should reject if promise exceeds timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 100))
      
      await expect(withTimeout(slowPromise, 50)).rejects.toThrow('Operation timed out')
    })

    it('should use custom error message', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('result'), 100))
      
      await expect(withTimeout(slowPromise, 50, 'Custom timeout')).rejects.toThrow('Custom timeout')
    })
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const successFn = vi.fn().mockResolvedValue('success')
      
      const result = await withRetry(successFn, { maxAttempts: 3 })
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const retryFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')
      
      const result = await withRetry(retryFn, { 
        maxAttempts: 3,
        baseDelay: 10 // Fast delay for testing
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(retryFn).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('persistent failure'))
      
      const result = await withRetry(failFn, { 
        maxAttempts: 2,
        baseDelay: 10
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('persistent failure')
      expect(result.attempts).toBe(2)
      expect(failFn).toHaveBeenCalledTimes(2)
    })

    it('should respect timeout', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(() => resolve('result'), 200))
      
      const result = await withRetry(slowFn, { 
        maxAttempts: 1,
        timeoutMs: 100
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })
  })

  describe('requestCache', () => {
    beforeEach(() => {
      requestCache.clear()
    })

    it('should cache successful results', async () => {
      const expensiveFn = vi.fn().mockResolvedValue('result')
      
      // First call
      const result1 = await requestCache.get('test-key', expensiveFn)
      expect(result1).toBe('result')
      expect(expensiveFn).toHaveBeenCalledTimes(1)
      
      // Second call should use cache
      const result2 = await requestCache.get('test-key', expensiveFn)
      expect(result2).toBe('result')
      expect(expensiveFn).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should not cache errors', async () => {
      const failingFn = vi.fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValue('success')
      
      // First call fails
      await expect(requestCache.get('test-key', failingFn)).rejects.toThrow('failure')
      expect(failingFn).toHaveBeenCalledTimes(1)
      
      // Second call should retry the function
      const result = await requestCache.get('test-key', failingFn)
      expect(result).toBe('success')
      expect(failingFn).toHaveBeenCalledTimes(2)
    })

    it('should deduplicate concurrent requests', async () => {
      const slowFn = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 50))
      )
      
      // Make multiple concurrent requests
      const promises = [
        requestCache.get('test-key', slowFn),
        requestCache.get('test-key', slowFn),
        requestCache.get('test-key', slowFn)
      ]
      
      const results = await Promise.all(promises)
      
      // All should get the same result
      results.forEach(result => expect(result).toBe('result'))
      
      // Function should only be called once
      expect(slowFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should delay function execution', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('arg1')
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('arg1')
    })

    it('should reset delay on repeated calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('arg1')
      vi.advanceTimersByTime(50)
      
      debouncedFn('arg2') // Should reset the timer
      vi.advanceTimersByTime(50)
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledWith('arg2')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should support cancel', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('arg1')
      debouncedFn.cancel()
      
      vi.advanceTimersByTime(100)
      expect(fn).not.toHaveBeenCalled()
    })

    it('should support flush', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('arg1')
      debouncedFn.flush()
      
      expect(fn).toHaveBeenCalledWith('arg1')
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should limit function calls', () => {
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)
      
      throttledFn('arg1')
      expect(fn).toHaveBeenCalledWith('arg1')
      
      throttledFn('arg2') // Should be ignored
      expect(fn).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(100)
      throttledFn('arg3') // Should be allowed
      expect(fn).toHaveBeenCalledWith('arg3')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('CircuitBreaker', () => {
    it('should remain closed on success', async () => {
      const breaker = new CircuitBreaker(2, 1000)
      const successFn = vi.fn().mockResolvedValue('success')
      
      const result = await breaker.execute(successFn)
      expect(result).toBe('success')
      expect(breaker.getState()).toBe('closed')
    })

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker(2, 1000)
      const failFn = vi.fn().mockRejectedValue(new Error('failure'))
      
      // First failure
      await expect(breaker.execute(failFn)).rejects.toThrow('failure')
      expect(breaker.getState()).toBe('closed')
      
      // Second failure should open circuit
      await expect(breaker.execute(failFn)).rejects.toThrow('failure')
      expect(breaker.getState()).toBe('open')
      
      // Third call should be blocked
      await expect(breaker.execute(failFn)).rejects.toThrow('Circuit breaker is open')
      expect(failFn).toHaveBeenCalledTimes(2) // Function not called when circuit is open
    })

    it('should transition to half-open after timeout', async () => {
      vi.useFakeTimers()
      
      const breaker = new CircuitBreaker(1, 1000)
      const failFn = vi.fn().mockRejectedValue(new Error('failure'))
      
      // Trigger circuit open
      await expect(breaker.execute(failFn)).rejects.toThrow('failure')
      expect(breaker.getState()).toBe('open')
      
      // Wait for recovery timeout
      vi.advanceTimersByTime(1000)
      
      // Next call should transition to half-open (and fail, going back to open)
      await expect(breaker.execute(failFn)).rejects.toThrow('failure')
      expect(breaker.getState()).toBe('open')
      
      vi.useRealTimers()
    })
  })

  describe('handleApiError', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      const result = handleApiError(new Error('test'), 'test context')
      expect(result).toContain('offline')
    })

    it('should handle timeout errors', () => {
      const result = handleApiError(new Error('request timeout'), 'test context')
      expect(result).toContain('took too long')
    })

    it('should handle network errors', () => {
      const result = handleApiError(new Error('network error'), 'test context')
      expect(result).toContain('Network error')
    })

    it('should handle rate limiting', () => {
      const result = handleApiError(new Error('HTTP 429'), 'test context')
      expect(result).toContain('Too many requests')
    })

    it('should handle authentication errors', () => {
      const result = handleApiError(new Error('HTTP 401'), 'test context')
      expect(result).toContain('Authentication error')
    })

    it('should handle server errors', () => {
      const result = handleApiError(new Error('HTTP 500'), 'test context')
      expect(result).toContain('Server error')
    })

    it('should provide generic message for unknown errors', () => {
      const result = handleApiError(new Error('unknown error'), 'test context')
      expect(result).toBe('Something went wrong. Please try again.')
    })
  })
})