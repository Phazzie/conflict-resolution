/**
 * Runtime Error Prevention & Recovery
 * 
 * This module handles the most common runtime errors that would
 * crash the app in production.
 */

import { appConfig } from '@/config/env'

export interface SafeOperationResult<T> {
  success: boolean
  data?: T
  error?: string
  recovered?: boolean
}

/**
 * Safely executes operations that might throw
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  context?: string
): Promise<SafeOperationResult<T>> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log error in development
    if (appConfig.VITE_APP_ENVIRONMENT === 'development') {
      console.error(`Safe async operation failed in ${context || 'unknown context'}:`, error)
    }
    
    // Return fallback if provided
    if (fallback !== undefined) {
      return { success: false, error: errorMessage, data: fallback, recovered: true }
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Safely executes synchronous operations
 */
export function safeSync<T>(
  operation: () => T,
  fallback?: T,
  context?: string
): SafeOperationResult<T> {
  try {
    const data = operation()
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log error in development
    if (appConfig.VITE_APP_ENVIRONMENT === 'development') {
      console.error(`Safe sync operation failed in ${context || 'unknown context'}:`, error)
    }
    
    // Return fallback if provided
    if (fallback !== undefined) {
      return { success: false, error: errorMessage, data: fallback, recovered: true }
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Safely access nested object properties
 */
export function safeGet<T>(
  obj: any,
  path: string,
  fallback?: T
): T | undefined {
  try {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current == null) return fallback
      current = current[key]
    }
    
    return current !== undefined ? current : fallback
  } catch {
    return fallback
  }
}

/**
 * Validates that required data exists before proceeding
 */
export function requireData<T>(
  data: T | null | undefined,
  name: string
): T {
  if (data == null) {
    throw new Error(`Required data '${name}' is missing`)
  }
  return data
}

/**
 * Safely parses JSON with fallback
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Safely stringifies objects
 */
export function safeJsonStringify(
  obj: any,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return fallback
  }
}

/**
 * Creates a safe wrapper for event handlers
 */
export function safeEventHandler<T extends any[]>(
  handler: (...args: T) => void,
  context?: string
) {
  return (...args: T) => {
    try {
      handler(...args)
    } catch (error) {
      console.error(`Event handler failed in ${context || 'unknown context'}:`, error)
    }
  }
}

/**
 * Debounce utility to prevent rapid-fire operations
 */
export function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: T) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Rate limiter to prevent API abuse
 */
export class RateLimiter {
  private requests: number[] = []
  
  constructor(
    private maxRequests: number = appConfig.VITE_RATE_LIMIT_REQUESTS,
    private windowMs: number = appConfig.VITE_RATE_LIMIT_WINDOW * 1000
  ) {}
  
  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }
  
  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0
    const oldest = Math.min(...this.requests)
    return Math.max(0, this.windowMs - (Date.now() - oldest))
  }
}

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      canTry: this.state !== 'open' || Date.now() - this.lastFailTime > this.timeout
    }
  }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error)
    
    if (appConfig.VITE_ENABLE_ERROR_TRACKING) {
      // Here you would send to Sentry or other error tracking service
      // For now, just log it
      console.error('Global error captured:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })
    }
  })
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    if (appConfig.VITE_ENABLE_ERROR_TRACKING) {
      console.error('Promise rejection captured:', event.reason)
    }
    
    // Prevent the default browser behavior
    event.preventDefault()
  })
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling()
}