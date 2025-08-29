import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

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
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input']
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