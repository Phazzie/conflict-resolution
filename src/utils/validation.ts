import DOMPurify from 'isomorphic-dompurify'
import { SessionData, SessionPhase } from '@/types/session'

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input.trim())
}

/**
 * Validates session data integrity
 */
export function validateSessionData(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Session data is corrupted' }
  }

  const validPhases: SessionPhase[] = ['welcome', 'issue-agreement', 'steel-manning', 'statement-locking', 'discussion', 'resolution', 'summary']
  
  if (!validPhases.includes(data.phase)) {
    return { isValid: false, error: 'Invalid session phase' }
  }

  // Phase-specific validation
  if (data.phase === 'steel-manning' && !data.agreedIssue) {
    return { isValid: false, error: 'Cannot be in steel-manning phase without agreed issue' }
  }

  if (data.phase === 'statement-locking' && (!data.playerOneSteelMan || !data.playerTwoSteelMan)) {
    return { isValid: false, error: 'Cannot be in statement-locking without completed steel-manning' }
  }

  if (data.phase === 'discussion' && (!data.playerOneStatement || !data.playerTwoStatement)) {
    return { isValid: false, error: 'Cannot be in discussion without locked statements' }
  }

  return { isValid: true }
}

/**
 * Validates that input meets minimum requirements
 */
export function validateIssueInput(input: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 10) {
    return { isValid: false, error: "Issue must be at least 10 characters. Try being more specific." }
  }
  
  if (sanitized.length > 500) {
    return { isValid: false, error: "Keep it under 500 characters. We're resolving conflicts, not writing novels." }
  }
  
  // Check for obviously unhelpful input
  const unhelpfulPatterns = [
    /^you('re| are) (always|never|just)/i,
    /^they('re| are) (always|never|just)/i,
    /^everything/i
  ]
  
  if (unhelpfulPatterns.some(pattern => pattern.test(sanitized))) {
    return { isValid: false, error: "Try being more specific. Absolute statements like 'always/never' aren't helpful." }
  }
  
  return { isValid: true }
}

/**
 * Validates steel-manning attempt
 */
export function validateSteelManInput(input: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 20) {
    return { isValid: false, error: "Steel-man must be at least 20 characters. Show you actually understand their perspective." }
  }
  
  if (sanitized.length > 1000) {
    return { isValid: false, error: "Keep it under 1000 characters. Concise understanding is better." }
  }
  
  return { isValid: true }
}

/**
 * Validates personal statement
 */
export function validateStatementInput(input: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 15) {
    return { isValid: false, error: "Statement must be at least 15 characters. This is your locked-in truth." }
  }
  
  if (sanitized.length > 800) {
    return { isValid: false, error: "Keep it under 800 characters. Brevity is the soul of wit." }
  }
  
  return { isValid: true }
}

/**
 * Validates discussion message
 */
export function validateMessageInput(input: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 1) {
    return { isValid: false, error: "Message cannot be empty." }
  }
  
  if (sanitized.length > 1000) {
    return { isValid: false, error: "Messages must be under 1000 characters. Keep it focused." }
  }
  
  return { isValid: true }
}