/**
 * Error Prevention Utilities Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  safeAsync, 
  safeSync, 
  safeGet, 
  requireData, 
  safeJsonParse, 
  safeJsonStringify,
  safeEventHandler,
  debounce,
  RateLimiter,
  CircuitBreaker
} from '@/utils/errorPrevention'

describe('errorPrevention utilities', () => {
  describe('safeAsync', () => {
    it('should return success result for successful operations', async () => {
      const operation = () => Promise.resolve('success')
      const result = await safeAsync(operation)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.error).toBeUndefined()
    })

    it('should return error result for failed operations', async () => {
      const operation = () => Promise.reject(new Error('test error'))
      const result = await safeAsync(operation)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('test error')
      expect(result.data).toBeUndefined()
    })

    it('should use fallback value when provided', async () => {
      const operation = () => Promise.reject(new Error('test error'))
      const fallback = 'fallback value'
      const result = await safeAsync(operation, fallback)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('test error')
      expect(result.data).toBe(fallback)
      expect(result.recovered).toBe(true)
    })
  })

  describe('safeSync', () => {
    it('should return success result for successful operations', () => {
      const operation = () => 'success'
      const result = safeSync(operation)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.error).toBeUndefined()
    })

    it('should return error result for failed operations', () => {
      const operation = () => { throw new Error('test error') }
      const result = safeSync(operation)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('test error')
      expect(result.data).toBeUndefined()
    })

    it('should use fallback value when provided', () => {
      const operation = () => { throw new Error('test error') }
      const fallback = 'fallback value'
      const result = safeSync(operation, fallback)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('test error')
      expect(result.data).toBe(fallback)
      expect(result.recovered).toBe(true)
    })
  })

  describe('safeGet', () => {
    const testObj = {
      level1: {
        level2: {
          value: 'found'
        }
      }
    }

    it('should retrieve nested values correctly', () => {
      expect(safeGet(testObj, 'level1.level2.value')).toBe('found')
    })

    it('should return fallback for non-existent paths', () => {
      expect(safeGet(testObj, 'nonexistent.path', 'fallback')).toBe('fallback')
    })

    it('should return undefined for non-existent paths without fallback', () => {
      expect(safeGet(testObj, 'nonexistent.path')).toBeUndefined()
    })

    it('should handle null/undefined objects gracefully', () => {
      expect(safeGet(null, 'any.path', 'fallback')).toBe('fallback')
      expect(safeGet(undefined, 'any.path', 'fallback')).toBe('fallback')
    })
  })

  describe('requireData', () => {
    it('should return data when valid', () => {
      const data = 'valid data'
      expect(requireData(data, 'test')).toBe(data)
    })

    it('should throw error when data is null', () => {
      expect(() => requireData(null, 'test')).toThrow("Required data 'test' is missing")
    })

    it('should throw error when data is undefined', () => {
      expect(() => requireData(undefined, 'test')).toThrow("Required data 'test' is missing")
    })
  })

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should return fallback for invalid JSON', () => {
      const fallback = { error: true }
      const result = safeJsonParse('invalid json', fallback)
      expect(result).toEqual(fallback)
    })
  })

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      const obj = { key: 'value' }
      const result = safeJsonStringify(obj)
      expect(result).toBe('{"key":"value"}')
    })

    it('should return fallback for unstringifiable objects', () => {
      const circular: any = {}
      circular.self = circular
      const result = safeJsonStringify(circular, '{"error":true}')
      expect(result).toBe('{"error":true}')
    })

    it('should use default fallback when none provided', () => {
      const circular: any = {}
      circular.self = circular
      const result = safeJsonStringify(circular)
      expect(result).toBe('{}')
    })
  })

  describe('safeEventHandler', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    afterEach(() => {
      consoleSpy.mockClear()
    })

    it('should execute handler without error', () => {
      const handler = vi.fn()
      const safeHandler = safeEventHandler(handler)
      
      safeHandler('arg1', 'arg2')
      
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should catch and log errors', () => {
      const handler = vi.fn(() => { throw new Error('handler error') })
      const safeHandler = safeEventHandler(handler, 'test context')
      
      safeHandler()
      
      expect(handler).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Event handler failed in test context:',
        expect.any(Error)
      )
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
      
      debouncedFn()
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should cancel previous calls when called multiple times', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledOnce()
    })
  })

  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(2, 1000)
      
      expect(limiter.canMakeRequest()).toBe(true)
      expect(limiter.canMakeRequest()).toBe(true)
    })

    it('should block requests when limit exceeded', () => {
      const limiter = new RateLimiter(2, 1000)
      
      limiter.canMakeRequest()
      limiter.canMakeRequest()
      expect(limiter.canMakeRequest()).toBe(false)
    })

    it('should reset after time window', () => {
      const limiter = new RateLimiter(1, 100)
      
      expect(limiter.canMakeRequest()).toBe(true)
      expect(limiter.canMakeRequest()).toBe(false)
      
      // Simulate time passing
      vi.setSystemTime(Date.now() + 150)
      expect(limiter.canMakeRequest()).toBe(true)
    })
  })

  describe('CircuitBreaker', () => {
    it('should execute operations when closed', async () => {
      const breaker = new CircuitBreaker(3, 1000)
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await breaker.execute(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalled()
      expect(breaker.getState().state).toBe('closed')
    })

    it('should open after threshold failures', async () => {
      const breaker = new CircuitBreaker(2, 1000)
      const operation = vi.fn().mockRejectedValue(new Error('failure'))
      
      // Fail twice to reach threshold
      await expect(breaker.execute(operation)).rejects.toThrow('failure')
      await expect(breaker.execute(operation)).rejects.toThrow('failure')
      
      expect(breaker.getState().state).toBe('open')
      
      // Next call should be blocked
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is open')
    })

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker(1, 100)
      const operation = vi.fn().mockRejectedValue(new Error('failure'))
      
      // Trigger circuit breaker
      await expect(breaker.execute(operation)).rejects.toThrow('failure')
      expect(breaker.getState().state).toBe('open')
      
      // Wait for timeout
      vi.setSystemTime(Date.now() + 150)
      
      // Should be able to try again (half-open state)
      const successOperation = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(successOperation)
      
      expect(result).toBe('success')
      expect(breaker.getState().state).toBe('closed')
    })
  })
})