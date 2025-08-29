/**
 * API Resilience utilities - timeout, retry, and error handling
 * Prevents API calls from hanging and provides graceful fallbacks
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  timeoutMs: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  attempts: number
  totalTime: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000
}

/**
 * Adds timeout capability to any promise
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

/**
 * Implements exponential backoff retry logic
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<ApiResponse<T>> => {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const startTime = Date.now()
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await withTimeout(fn(), opts.timeoutMs)
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime
      }
    } catch (error) {
      console.warn(`API call attempt ${attempt}/${opts.maxAttempts} failed:`, error)
      
      // If this was the last attempt, return error
      if (attempt === opts.maxAttempts) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: attempt,
          totalTime: Date.now() - startTime
        }
      }
      
      // Calculate delay for next attempt
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * delay * 0.1
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: 'Unexpected error in retry logic',
    attempts: opts.maxAttempts,
    totalTime: Date.now() - startTime
  }
}

/**
 * Request deduplication - prevents identical concurrent requests
 */
class RequestCache {
  private cache = new Map<string, Promise<any>>()
  private results = new Map<string, { data: any; timestamp: number }>()
  private readonly TTL = 30000 // 30 seconds

  private generateKey(url: string, options?: any): string {
    return JSON.stringify({ url, options })
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheDuration: number = this.TTL
  ): Promise<T> {
    // Check if we have a cached result
    const cached = this.results.get(key)
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data
    }

    // Check if request is already in flight
    let request = this.cache.get(key)
    if (!request) {
      // Start new request
      request = fetcher().then(
        data => {
          // Cache successful result
          this.results.set(key, { data, timestamp: Date.now() })
          this.cache.delete(key)
          return data
        },
        error => {
          // Don't cache errors, just cleanup
          this.cache.delete(key)
          throw error
        }
      )
      
      this.cache.set(key, request)
    }

    return request
  }

  clear(): void {
    this.cache.clear()
    this.results.clear()
  }

  clearExpired(): void {
    for (const [key, { timestamp }] of this.results.entries()) {
      if (this.isExpired(timestamp)) {
        this.results.delete(key)
      }
    }
  }
}

export const requestCache = new RequestCache()

/**
 * Debounced function wrapper - prevents excessive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T>
  
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func(...lastArgs)
      timeoutId = null
    }, delay)
  }
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      func(...lastArgs)
      timeoutId = null
    }
  }
  
  return debounced as T & { cancel: () => void; flush: () => void }
}

/**
 * Throttled function wrapper - limits call frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle = false
  let timeoutId: NodeJS.Timeout | null = null
  
  const throttled = (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      timeoutId = setTimeout(() => {
        inThrottle = false
        timeoutId = null
      }, limit)
    }
  }
  
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      inThrottle = false
      timeoutId = null
    }
  }
  
  return throttled as T & { cancel: () => void }
}

/**
 * Network status detection
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor
  private isOnline: boolean = navigator.onLine
  private listeners: Set<(online: boolean) => void> = new Set()
  
  private constructor() {
    window.addEventListener('online', () => this.setOnline(true))
    window.addEventListener('offline', () => this.setOnline(false))
  }
  
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor()
    }
    return NetworkMonitor.instance
  }
  
  private setOnline(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online
      this.listeners.forEach(listener => listener(online))
    }
  }
  
  getStatus(): boolean {
    return this.isOnline
  }
  
  addListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

/**
 * Circuit breaker pattern - prevents cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open'
    }
  }
  
  getState(): string {
    return this.state
  }
  
  reset(): void {
    this.failureCount = 0
    this.state = 'closed'
    this.lastFailureTime = 0
  }
}

/**
 * Enhanced error handler with user-friendly messages
 */
export const handleApiError = (error: any, context: string = 'API call'): string => {
  console.error(`${context} failed:`, error)
  
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.'
  }
  
  if (error.message?.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  
  if (error.message?.includes('429')) {
    return 'Too many requests. Please wait a moment before trying again.'
  }
  
  if (error.message?.includes('401') || error.message?.includes('403')) {
    return 'Authentication error. Please refresh the page and try again.'
  }
  
  if (error.message?.includes('500')) {
    return 'Server error. Our team has been notified. Please try again later.'
  }
  
  return 'Something went wrong. Please try again.'
}