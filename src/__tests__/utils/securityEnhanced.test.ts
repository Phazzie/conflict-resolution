/**
 * Enhanced Security Features Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  getCSPHeaders,
  validateApiKey,
  generateSecureId,
  secureStorage,
  sanitizeUserMessage,
  sanitizeAIResponse
} from '@/utils/security'

// Mock the config
vi.mock('@/config/env', () => ({
  appConfig: {
    VITE_APP_ENVIRONMENT: 'development',
    VITE_API_BASE_URL: 'https://api.example.com',
    VITE_RATE_LIMIT_REQUESTS: 10,
    VITE_RATE_LIMIT_WINDOW: 60
  }
}))

describe('Enhanced Security Features', () => {
  describe('getCSPHeaders', () => {
    it('should return comprehensive CSP headers', () => {
      const headers = getCSPHeaders()
      
      expect(headers).toHaveProperty('Content-Security-Policy')
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff')
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY')
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block')
      expect(headers).toHaveProperty('Strict-Transport-Security')
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin')
    })

    it('should include development-specific CSP rules', () => {
      const headers = getCSPHeaders()
      const csp = headers['Content-Security-Policy']
      
      expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
      expect(csp).toContain('ws: wss:')
    })
  })

  describe('validateApiKey', () => {
    it('should accept valid API keys', () => {
      const validKey = 'sk-abcdefghijklmnopqrstuvwxyz1234567890'
      expect(validateApiKey(validKey)).toBe(true)
    })

    it('should reject short API keys', () => {
      const shortKey = 'short'
      expect(validateApiKey(shortKey)).toBe(false)
    })

    it('should reject keys with invalid characters', () => {
      const invalidKey = 'sk-key-with-spaces and-symbols!'
      expect(validateApiKey(invalidKey)).toBe(false)
    })

    it('should reject null/undefined keys', () => {
      expect(validateApiKey(null as any)).toBe(false)
      expect(validateApiKey(undefined as any)).toBe(false)
      expect(validateApiKey('')).toBe(false)
    })

    it('should reject excessively long keys', () => {
      const longKey = 'a'.repeat(200)
      expect(validateApiKey(longKey)).toBe(false)
    })
  })

  describe('generateSecureId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateSecureId()
      const id2 = generateSecureId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(10)
    })

    it('should generate hex-formatted IDs', () => {
      const id = generateSecureId()
      expect(id).toMatch(/^[a-f0-9-]+$/i)
    })
  })

  describe('sanitizeUserMessage', () => {
    it('should remove script tags', () => {
      const malicious = 'Hello <script>alert("xss")</script> world'
      const result = sanitizeUserMessage(malicious)
      
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('Hello')
      expect(result).toContain('world')
    })

    it('should remove javascript: protocols', () => {
      const malicious = 'Click <a href="javascript:alert(1)">here</a>'
      const result = sanitizeUserMessage(malicious)
      
      expect(result).not.toContain('javascript:')
    })

    it('should allow image data URLs but block others', () => {
      const withImageData = 'Image: data:image/png;base64,abc123'
      const withOtherData = 'Evil: data:text/html,<script>alert(1)</script>'
      
      const imageResult = sanitizeUserMessage(withImageData)
      const otherResult = sanitizeUserMessage(withOtherData)
      
      expect(imageResult).toContain('data:image/png')
      expect(otherResult).not.toContain('data:text/html')
    })

    it('should enforce length limits', () => {
      const longMessage = 'a'.repeat(6000)
      const result = sanitizeUserMessage(longMessage)
      
      expect(result.length).toBeLessThanOrEqual(5000)
    })

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeUserMessage(malicious)
      
      expect(result).not.toContain('onclick')
    })
  })

  describe('sanitizeAIResponse', () => {
    it('should allow basic formatting but remove dangerous content', () => {
      const aiResponse = 'Here is <strong>important</strong> info. <script>alert(1)</script>'
      const result = sanitizeAIResponse(aiResponse)
      
      expect(result).toContain('important')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should remove iframe tags', () => {
      const malicious = 'Content <iframe src="evil.com"></iframe> here'
      const result = sanitizeAIResponse(malicious)
      
      expect(result).not.toContain('<iframe>')
      expect(result).not.toContain('evil.com')
      expect(result).toContain('Content')
      expect(result).toContain('here')
    })
  })

  describe('secureStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should store and retrieve data', () => {
      const testData = { user: 'test', settings: { theme: 'dark' } }
      
      secureStorage.set('test-key', testData)
      const retrieved = secureStorage.get('test-key')
      
      expect(retrieved).toEqual(testData)
    })

    it('should handle data integrity checks', () => {
      const testData = { secret: 'value' }
      
      secureStorage.set('integrity-test', testData)
      
      // Manually corrupt the stored data
      const stored = localStorage.getItem('secure_integrity-test')
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.integrity = 'corrupted'
        localStorage.setItem('secure_integrity-test', JSON.stringify(parsed))
      }
      
      const retrieved = secureStorage.get('integrity-test')
      expect(retrieved).toBeNull()
    })

    it('should remove stale data', () => {
      const testData = { temp: 'data' }
      
      secureStorage.set('stale-test', testData)
      
      // Manually set old timestamp
      const stored = localStorage.getItem('secure_stale-test')
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.timestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        localStorage.setItem('secure_stale-test', JSON.stringify(parsed))
      }
      
      const retrieved = secureStorage.get('stale-test')
      expect(retrieved).toBeNull()
    })

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('secure_corrupted', 'invalid-json')
      
      const retrieved = secureStorage.get('corrupted')
      expect(retrieved).toBeNull()
      
      // Should clean up the corrupted entry
      expect(localStorage.getItem('secure_corrupted')).toBeNull()
    })

    it('should remove data when requested', () => {
      const testData = { remove: 'me' }
      
      secureStorage.set('remove-test', testData)
      expect(secureStorage.get('remove-test')).toEqual(testData)
      
      secureStorage.remove('remove-test')
      expect(secureStorage.get('remove-test')).toBeNull()
    })
  })
})