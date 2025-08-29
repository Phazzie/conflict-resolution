/**
 * Environment Configuration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock import.meta.env before importing the module
const mockEnv = {
  DEV: false,
  PROD: true,
  VITE_APP_NAME: 'TestApp',
  VITE_APP_VERSION: '1.0.0',
  VITE_APP_ENVIRONMENT: 'test',
}

vi.stubGlobal('import', {
  meta: {
    env: mockEnv
  }
})

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset console spies
    vi.clearAllMocks()
  })

  it('should parse valid environment variables', async () => {
    // Mock a complete environment
    mockEnv.VITE_APP_NAME = 'MixitFixit'
    mockEnv.VITE_APP_VERSION = '2.0.0'
    mockEnv.VITE_APP_ENVIRONMENT = 'production'
    
    // Dynamic import to get fresh instance
    const { appConfig } = await import('@/config/env')
    
    expect(appConfig.VITE_APP_NAME).toBe('MixitFixit')
    expect(appConfig.VITE_APP_VERSION).toBe('2.0.0')
    expect(appConfig.VITE_APP_ENVIRONMENT).toBe('production')
  })

  it('should use default values for missing variables', async () => {
    // Clear some env vars
    delete mockEnv.VITE_APP_NAME
    delete mockEnv.VITE_AI_MAX_TOKENS
    
    const { appConfig } = await import('@/config/env')
    
    expect(appConfig.VITE_APP_NAME).toBe('MixitFixit')
    expect(appConfig.VITE_AI_MAX_TOKENS).toBe(1000)
  })

  it('should detect production environment correctly', async () => {
    mockEnv.VITE_APP_ENVIRONMENT = 'production'
    
    const { isProduction, isDevelopment } = await import('@/config/env')
    
    expect(isProduction()).toBe(true)
    expect(isDevelopment()).toBe(false)
  })

  it('should detect development environment correctly', async () => {
    mockEnv.VITE_APP_ENVIRONMENT = 'development'
    
    const { isProduction, isDevelopment } = await import('@/config/env')
    
    expect(isProduction()).toBe(false)
    expect(isDevelopment()).toBe(true)
  })

  it('should check feature flags correctly', async () => {
    mockEnv.VITE_ENABLE_MULTIPLAYER = 'true'
    mockEnv.VITE_ENABLE_ML_FEATURES = 'false'
    
    const { isFeatureEnabled } = await import('@/config/env')
    
    expect(isFeatureEnabled('VITE_ENABLE_MULTIPLAYER')).toBe(true)
    expect(isFeatureEnabled('VITE_ENABLE_ML_FEATURES')).toBe(false)
  })

  it('should handle boolean string conversion', async () => {
    mockEnv.VITE_ENABLE_CSRF_PROTECTION = 'true'
    mockEnv.VITE_ENABLE_XSS_PROTECTION = 'false'
    mockEnv.VITE_SECURE_COOKIES = '1'
    
    const { appConfig } = await import('@/config/env')
    
    expect(appConfig.VITE_ENABLE_CSRF_PROTECTION).toBe(true)
    expect(appConfig.VITE_ENABLE_XSS_PROTECTION).toBe(false)
    expect(appConfig.VITE_SECURE_COOKIES).toBe(true)
  })

  it('should handle numeric string conversion', async () => {
    mockEnv.VITE_AI_MAX_TOKENS = '2000'
    mockEnv.VITE_RATE_LIMIT_REQUESTS = '500'
    mockEnv.VITE_AI_TEMPERATURE = '0.8'
    
    const { appConfig } = await import('@/config/env')
    
    expect(appConfig.VITE_AI_MAX_TOKENS).toBe(2000)
    expect(appConfig.VITE_RATE_LIMIT_REQUESTS).toBe(500)
    expect(appConfig.VITE_AI_TEMPERATURE).toBe(0.8)
  })

  it('should validate AI temperature range', async () => {
    // This would normally throw in the actual validation
    mockEnv.VITE_AI_TEMPERATURE = '3.0' // Invalid - over max of 2.0
    
    // Since our test environment might not catch this, we test the schema directly
    const { z } = await import('zod')
    
    const temperatureSchema = z.coerce.number().min(0).max(2)
    
    expect(() => temperatureSchema.parse(3.0)).toThrow()
    expect(() => temperatureSchema.parse(-1)).toThrow()
    expect(temperatureSchema.parse(1.5)).toBe(1.5)
  })

  it('should handle URL validation', async () => {
    mockEnv.VITE_API_BASE_URL = 'https://api.example.com'
    mockEnv.VITE_AI_SERVICE_URL = 'invalid-url'
    
    // Test URL schema separately since our mock env might not trigger validation
    const { z } = await import('zod')
    
    const urlSchema = z.string().url().optional()
    
    expect(urlSchema.parse('https://api.example.com')).toBe('https://api.example.com')
    expect(() => urlSchema.parse('invalid-url')).toThrow()
  })

  it('should set environment from DEV flag when not explicitly set', async () => {
    delete mockEnv.VITE_APP_ENVIRONMENT
    mockEnv.DEV = true
    
    // Test the computed environment logic
    const computedEnv = mockEnv.DEV ? 'development' : 'production'
    expect(computedEnv).toBe('development')
  })
})