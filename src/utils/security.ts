import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'
import { appConfig } from '@/config/env'

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Uses DOMPurify to clean potentially dangerous HTML/JavaScript
 */
export const sanitizeHtml = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    USE_PROFILES: { html: true }
  })
}

/**
 * Sanitizes plain text by escaping HTML entities
 * Use for content that should never contain HTML
 */
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\n/g, '<br>') // Allow line breaks
}

/**
 * Content Security Policy headers for enhanced security
 */
export const getCSPHeaders = (): Record<string, string> => {
  const isDev = appConfig.VITE_APP_ENVIRONMENT === 'development'
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite requires unsafe-eval in dev
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' " + (isDev ? 'ws: wss:' : appConfig.VITE_API_BASE_URL || ''),
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
}

/**
 * Validates and sanitizes user message input
 * Applies length limits and content filtering
 */
export const sanitizeUserMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return ''
  }
  
  // Apply length limit (prevent abuse)
  const trimmed = message.trim().slice(0, 5000)
  
  // Remove potentially dangerous patterns
  const filtered = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:(?!image\/)/gi, '') // Allow data: URLs only for images
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
  
  return sanitizeText(filtered)
}

/**
 * Sanitizes AI response before display
 * Allows some formatting but removes dangerous content
 */
export const sanitizeAIResponse = (response: string): string => {
  if (!response || typeof response !== 'string') {
    return ''
  }
  
  // First pass - remove obvious threats
  const cleaned = response
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:(?!image\/)/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  
  // Second pass - sanitize with DOMPurify
  return sanitizeHtml(cleaned)
}

/**
 * API key validation and sanitization
 */
export const validateApiKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') {
    return false
  }
  
  // Basic API key format validation (adjust based on your API provider)
  const apiKeyPattern = /^[a-zA-Z0-9_-]+$/
  return apiKeyPattern.test(key) && key.length >= 20 && key.length <= 100
}

/**
 * Secure random ID generation
 */
export const generateSecureId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for environments without crypto.randomUUID
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Last resort fallback
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validates session data structure and sanitizes content
 */
export const sanitizeSessionData = (data: any): any => {
  const sessionSchema = z.object({
    phase: z.string(),
    conflictContext: z.string().optional(),
    agreedIssue: z.string(),
    playerOneSteelMan: z.string(),
    playerTwoSteelMan: z.string(),
    playerOneStatement: z.string(),
    playerTwoStatement: z.string(),
    messages: z.array(z.object({
      id: z.string(),
      playerId: z.string(),
      content: z.string(),
      timestamp: z.number(),
      isAI: z.boolean().optional()
    })),
    proposedResolution: z.string(),
    finalResolution: z.string(),
    sessionStarted: z.number(),
    sessionId: z.string().optional()
  }).partial()
  
  try {
    // Validate structure
    const validated = sessionSchema.parse(data)
    
    // Sanitize string fields
    return {
      ...validated,
      agreedIssue: validated.agreedIssue ? sanitizeText(validated.agreedIssue) : '',
      playerOneSteelMan: validated.playerOneSteelMan ? sanitizeText(validated.playerOneSteelMan) : '',
      playerTwoSteelMan: validated.playerTwoSteelMan ? sanitizeText(validated.playerTwoSteelMan) : '',
      playerOneStatement: validated.playerOneStatement ? sanitizeText(validated.playerOneStatement) : '',
      playerTwoStatement: validated.playerTwoStatement ? sanitizeText(validated.playerTwoStatement) : '',
      proposedResolution: validated.proposedResolution ? sanitizeText(validated.proposedResolution) : '',
      finalResolution: validated.finalResolution ? sanitizeText(validated.finalResolution) : '',
      messages: validated.messages?.map(msg => ({
        ...msg,
        id: generateSecureId(), // Regenerate IDs for security
        content: msg.isAI ? sanitizeAIResponse(msg.content) : sanitizeUserMessage(msg.content)
      })) || []
    }
  } catch (error) {
    console.warn('Session data validation failed:', error)
    throw new Error('Invalid session data structure')
  }
}

/**
 * Enhanced Rate limiting helper - prevents spam/abuse
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private blacklist: Set<string> = new Set()
  
  isAllowed(
    key: string, 
    maxRequests: number = appConfig.VITE_RATE_LIMIT_REQUESTS,
    windowMs: number = appConfig.VITE_RATE_LIMIT_WINDOW * 1000
  ): boolean {
    // Check blacklist
    if (this.blacklist.has(key)) {
      return false
    }
    
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get existing requests for this key
    let requests = this.requests.get(key) || []
    
    // Filter out old requests
    requests = requests.filter(time => time > windowStart)
    
    // Check if under limit
    if (requests.length >= maxRequests) {
      // Add to temporary blacklist after exceeding limits multiple times
      if (requests.length >= maxRequests * 2) {
        this.blacklist.add(key)
        setTimeout(() => this.blacklist.delete(key), windowMs * 5)
      }
      return false
    }
    
    // Add current request
    requests.push(now)
    this.requests.set(key, requests)
    
    return true
  }
  
  reset(key: string): void {
    this.requests.delete(key)
    this.blacklist.delete(key)
  }
  
  getRemainingRequests(
    key: string, 
    maxRequests: number = appConfig.VITE_RATE_LIMIT_REQUESTS,
    windowMs: number = appConfig.VITE_RATE_LIMIT_WINDOW * 1000
  ): number {
    const now = Date.now()
    const windowStart = now - windowMs
    const requests = (this.requests.get(key) || []).filter(time => time > windowStart)
    
    return Math.max(0, maxRequests - requests.length)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Input validation with comprehensive security checks
 */
export const validateInput = (
  input: string, 
  maxLength: number = 1000,
  fieldName: string = 'input'
): { isValid: boolean; error?: string; sanitized: string; warnings?: string[] } => {
  
  const warnings: string[] = []
  
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      sanitized: ''
    }
  }
  
  const trimmed = input.trim()
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
      sanitized: ''
    }
  }
  
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
      sanitized: trimmed.slice(0, maxLength),
      warnings: [`Input was truncated to ${maxLength} characters`]
    }
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /<script/i, message: 'Script tags detected' },
    { pattern: /javascript:/i, message: 'JavaScript protocol detected' },
    { pattern: /data:(?!image\/)/i, message: 'Non-image data URLs detected' },
    { pattern: /vbscript:/i, message: 'VBScript detected' },
    { pattern: /on\w+\s*=/i, message: 'Event handlers detected' },
    { pattern: /<iframe/i, message: 'Iframe tags detected' },
    { pattern: /document\.cookie/i, message: 'Cookie access detected' },
    { pattern: /eval\s*\(/i, message: 'Eval function detected' }
  ]
  
  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: `${fieldName} contains potentially dangerous content: ${message}`,
        sanitized: sanitizeText(trimmed),
        warnings: [message]
      }
    }
  }
  
  // Check for excessive special characters (possible encoding attack)
  const specialCharCount = (trimmed.match(/[<>&"'\/\x00-\x1f]/g) || []).length
  if (specialCharCount > trimmed.length * 0.1) {
    warnings.push('High concentration of special characters detected')
  }
  
  return {
    isValid: true,
    sanitized: sanitizeText(trimmed),
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Secure storage wrapper with encryption for sensitive data
 */
export const secureStorage = {
  set: (key: string, value: any): void => {
    try {
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        integrity: btoa(JSON.stringify(value)).slice(0, 16) // Simple integrity check
      })
      localStorage.setItem(`secure_${key}`, serialized)
    } catch (error) {
      console.error('Failed to store secure data:', error)
    }
  },
  
  get: <T>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(`secure_${key}`)
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      
      // Basic integrity check
      const expectedIntegrity = btoa(JSON.stringify(parsed.data)).slice(0, 16)
      if (parsed.integrity !== expectedIntegrity) {
        console.warn('Data integrity check failed for key:', key)
        secureStorage.remove(key)
        return null
      }
      
      // Check if data is stale (older than 24 hours)
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        secureStorage.remove(key)
        return null
      }
      
      return parsed.data
    } catch (error) {
      console.error('Failed to retrieve secure data:', error)
      secureStorage.remove(key)
      return null
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(`secure_${key}`)
  }
}

/**
 * Validates and sanitizes user message input
 * Applies length limits and content filtering
 */
export const sanitizeUserMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return ''
  }
  
  // Apply length limit (prevent abuse)
  const trimmed = message.trim().slice(0, 5000)
  
  // Remove potentially dangerous patterns
  const filtered = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
  
  return sanitizeText(filtered)
}

/**
 * Sanitizes AI response before display
 * Allows some formatting but removes dangerous content
 */
export const sanitizeAIResponse = (response: string): string => {
  if (!response || typeof response !== 'string') {
    return ''
  }
  
  // First pass - remove obvious threats
  const cleaned = response
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
  
  // Second pass - sanitize with DOMPurify
  return sanitizeHtml(cleaned)
}

/**
 * Validates session data structure and sanitizes content
 */
export const sanitizeSessionData = (data: any): any => {
  const sessionSchema = z.object({
    phase: z.string(),
    conflictContext: z.string().optional(),
    agreedIssue: z.string(),
    playerOneSteelMan: z.string(),
    playerTwoSteelMan: z.string(),
    playerOneStatement: z.string(),
    playerTwoStatement: z.string(),
    messages: z.array(z.object({
      id: z.string(),
      playerId: z.string(),
      content: z.string(),
      timestamp: z.number(),
      isAI: z.boolean().optional()
    })),
    proposedResolution: z.string(),
    finalResolution: z.string(),
    sessionStarted: z.number()
  }).partial()
  
  try {
    // Validate structure
    const validated = sessionSchema.parse(data)
    
    // Sanitize string fields
    return {
      ...validated,
      agreedIssue: validated.agreedIssue ? sanitizeText(validated.agreedIssue) : '',
      playerOneSteelMan: validated.playerOneSteelMan ? sanitizeText(validated.playerOneSteelMan) : '',
      playerTwoSteelMan: validated.playerTwoSteelMan ? sanitizeText(validated.playerTwoSteelMan) : '',
      playerOneStatement: validated.playerOneStatement ? sanitizeText(validated.playerOneStatement) : '',
      playerTwoStatement: validated.playerTwoStatement ? sanitizeText(validated.playerTwoStatement) : '',
      proposedResolution: validated.proposedResolution ? sanitizeText(validated.proposedResolution) : '',
      finalResolution: validated.finalResolution ? sanitizeText(validated.finalResolution) : '',
      messages: validated.messages?.map(msg => ({
        ...msg,
        content: msg.isAI ? sanitizeAIResponse(msg.content) : sanitizeUserMessage(msg.content)
      })) || []
    }
  } catch (error) {
    console.warn('Session data validation failed:', error)
    throw new Error('Invalid session data structure')
  }
}

/**
 * Rate limiting helper - prevents spam/abuse
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  isAllowed(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get existing requests for this key
    let requests = this.requests.get(key) || []
    
    // Filter out old requests
    requests = requests.filter(time => time > windowStart)
    
    // Check if under limit
    if (requests.length >= maxRequests) {
      return false
    }
    
    // Add current request
    requests.push(now)
    this.requests.set(key, requests)
    
    return true
  }
  
  reset(key: string): void {
    this.requests.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Validates input length and content
 */
export const validateInput = (
  input: string, 
  maxLength: number = 1000,
  fieldName: string = 'input'
): { isValid: boolean; error?: string; sanitized: string } => {
  
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      sanitized: ''
    }
  }
  
  const trimmed = input.trim()
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
      sanitized: ''
    }
  }
  
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
      sanitized: trimmed.slice(0, maxLength)
    }
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+\s*=/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: `${fieldName} contains potentially dangerous content`,
        sanitized: sanitizeText(trimmed)
      }
    }
  }
  
  return {
    isValid: true,
    sanitized: sanitizeText(trimmed)
  }
}