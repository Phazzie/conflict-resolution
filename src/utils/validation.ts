import { SessionData, SessionPhase } from '@/types/session'

/**
 * Comprehensive input sanitization to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    console.warn('sanitizeInput received non-string input:', typeof input)
    return ''
  }
  
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/&(?!#?\w+;)/g, '&amp;')
}

/**
 * Deep sanitization for objects containing user input
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key])
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => 
        typeof item === 'string' ? sanitizeInput(item) : item
      )
    }
  }
  
  return sanitized
}

/**
 * Enhanced session data validation with detailed error reporting
 */
export function validateSessionData(data: any): { isValid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = []
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Session data is corrupted or missing' }
  }

  const validPhases: SessionPhase[] = ['welcome', 'issue-agreement', 'steel-manning', 'statement-locking', 'discussion', 'resolution', 'summary']
  
  if (!data.phase || !validPhases.includes(data.phase)) {
    return { isValid: false, error: `Invalid session phase: ${data.phase}` }
  }

  // Check for required timestamps
  if (typeof data.sessionStarted !== 'number' || data.sessionStarted <= 0) {
    warnings.push('Session timestamp is invalid or missing')
  }

  // Phase-specific validation with more detailed checks
  switch (data.phase) {
    case 'steel-manning':
      if (!data.agreedIssue || data.agreedIssue.length < 10) {
        return { isValid: false, error: 'Cannot be in steel-manning phase without a properly agreed issue (min 10 chars)' }
      }
      break

    case 'statement-locking':
      if (!data.playerOneSteelMan || !data.playerTwoSteelMan) {
        return { isValid: false, error: 'Cannot be in statement-locking without completed steel-manning from both players' }
      }
      if (data.playerOneSteelMan.length < 20 || data.playerTwoSteelMan.length < 20) {
        warnings.push('Steel-manning statements seem unusually short')
      }
      break

    case 'discussion':
      if (!data.playerOneStatement || !data.playerTwoStatement) {
        return { isValid: false, error: 'Cannot be in discussion without locked statements from both players' }
      }
      if (!Array.isArray(data.messages)) {
        return { isValid: false, error: 'Discussion phase requires valid message array' }
      }
      break

    case 'resolution':
      if (!Array.isArray(data.messages) || data.messages.length === 0) {
        warnings.push('Resolution phase with no discussion messages')
      }
      break

    case 'summary':
      if (!data.finalResolution) {
        return { isValid: false, error: 'Cannot be in summary phase without final resolution' }
      }
      break
  }

  // Data integrity checks
  if (data.messages && !Array.isArray(data.messages)) {
    return { isValid: false, error: 'Messages must be an array' }
  }

  if (data.messages && data.messages.some((msg: any) => 
    !msg || typeof msg !== 'object' || !msg.content || !msg.author || !msg.timestamp
  )) {
    return { isValid: false, error: 'Invalid message format detected' }
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined }
}

/**
 * Enhanced issue input validation
 */
export function validateIssueInput(input: string): { isValid: boolean; error?: string; suggestions?: string[] } {
  const sanitized = sanitizeInput(input)
  const suggestions: string[] = []
  
  if (!sanitized || sanitized.length < 10) {
    return { 
      isValid: false, 
      error: "Issue must be at least 10 characters. Try being more specific about what's actually bothering you.",
      suggestions: ["What specifically happened?", "When does this occur?", "How does this affect you?"]
    }
  }
  
  if (sanitized.length > 500) {
    return { 
      isValid: false, 
      error: "Keep it under 500 characters. We're resolving conflicts, not writing manifestos.",
    }
  }
  
  // Enhanced pattern detection
  const problematicPatterns = [
    { pattern: /^you('re| are) (always|never|just)/i, message: "Absolute statements about the other person aren't helpful" },
    { pattern: /^they('re| are) (always|never|just)/i, message: "Focus on specific behaviors rather than character judgments" },
    { pattern: /^everything/i, message: "Try focusing on one specific issue rather than 'everything'" },
    { pattern: /\b(stupid|dumb|idiot|moron)\b/i, message: "Personal attacks won't help resolve anything" },
    { pattern: /\b(hate|disgusting|awful)\s+(you|them)\b/i, message: "Try describing the specific behavior that bothers you" }
  ]
  
  const problematic = problematicPatterns.find(p => p.pattern.test(sanitized))
  if (problematic) {
    suggestions.push("Try: 'I feel frustrated when...'")
    suggestions.push("Or: 'I need to understand why...'")
    return { 
      isValid: false, 
      error: `${problematic.message}. Try rephrasing this as an observable behavior or specific situation.`,
      suggestions
    }
  }
  
  return { isValid: true }
}

/**
 * Enhanced steel-manning validation
 */
export function validateSteelManInput(input: string): { isValid: boolean; error?: string; suggestions?: string[] } {
  const sanitized = sanitizeInput(input)
  const suggestions: string[] = []
  
  if (!sanitized || sanitized.length < 20) {
    return { 
      isValid: false, 
      error: "Steel-man must be at least 20 characters. Show you actually understand their perspective.",
      suggestions: [
        "What might they be feeling?",
        "What experiences might have led to this?", 
        "What are they trying to achieve?"
      ]
    }
  }
  
  if (sanitized.length > 1000) {
    return { 
      isValid: false, 
      error: "Keep it under 1000 characters. Concise understanding is better than rambling." 
    }
  }
  
  // Check for signs of bad faith steel-manning
  const badFaithPatterns = [
    /they think|they believe/i,
    /they want to/i,
    /obviously/i,
    /clearly they/i
  ]
  
  const hasBadFaith = badFaithPatterns.some(pattern => pattern.test(sanitized))
  if (hasBadFaith) {
    suggestions.push("Use 'from their perspective' language")
    suggestions.push("Try: 'They might feel that...'")
    suggestions.push("Avoid assumptions about their intentions")
  }
  
  return { isValid: true, suggestions: suggestions.length > 0 ? suggestions : undefined }
}

/**
 * Enhanced statement validation
 */
export function validateStatementInput(input: string): { isValid: boolean; error?: string; suggestions?: string[] } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 15) {
    return { 
      isValid: false, 
      error: "Statement must be at least 15 characters. This is your locked-in truth - make it count.",
      suggestions: ["What is your core feeling about this issue?", "What outcome do you want?"]
    }
  }
  
  if (sanitized.length > 800) {
    return { 
      isValid: false, 
      error: "Keep it under 800 characters. Brevity is the soul of wit (and avoiding overthinking)." 
    }
  }
  
  return { isValid: true }
}

/**
 * Enhanced message validation
 */
export function validateMessageInput(input: string): { isValid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeInput(input)
  
  if (!sanitized || sanitized.length < 1) {
    return { isValid: false, error: "Message cannot be empty. Even a grunt is more communicative." }
  }
  
  if (sanitized.length > 1000) {
    return { 
      isValid: false, 
      error: "Messages must be under 1000 characters. Keep it focused - we're not writing War and Peace." 
    }
  }
  
  return { isValid: true, sanitized }
}

/**
 * Atomic session update with rollback capability
 */
export function createAtomicUpdate<T extends SessionData>(
  currentData: T,
  updates: Partial<T>
): { success: boolean; newData?: T; error?: string } {
  try {
    // Validate that updates don't break session integrity
    const potentialNewData = { ...currentData, ...updates }
    const validation = validateSessionData(potentialNewData)
    
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Update would corrupt session: ${validation.error}` 
      }
    }
    
    // Sanitize any string fields in updates
    const sanitizedUpdates = sanitizeObject(updates)
    const finalData = { ...currentData, ...sanitizedUpdates }
    
    return { success: true, newData: finalData as T }
  } catch (error) {
    return { 
      success: false, 
      error: `Atomic update failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Session recovery with data repair
 */
export function attemptSessionRecovery(corruptedData: any): { recovered: boolean; sessionData?: SessionData; warnings?: string[] } {
  const warnings: string[] = []
  
  try {
    // Try to salvage what we can
    const defaultSession: SessionData = {
      phase: 'welcome',
      agreedIssue: '',
      playerOneSteelMan: '',
      playerTwoSteelMan: '',
      playerOneStatement: '',
      playerTwoStatement: '',
      messages: [],
      proposedResolution: '',
      finalResolution: '',
      sessionStarted: Date.now()
    }
    
    if (!corruptedData || typeof corruptedData !== 'object') {
      return { recovered: false }
    }
    
    // Attempt to recover valid fields
    const recovered: SessionData = { ...defaultSession }
    
    if (typeof corruptedData.agreedIssue === 'string' && corruptedData.agreedIssue.length > 0) {
      recovered.agreedIssue = sanitizeInput(corruptedData.agreedIssue)
      warnings.push('Recovered agreed issue')
    }
    
    if (typeof corruptedData.playerOneSteelMan === 'string' && corruptedData.playerOneSteelMan.length > 0) {
      recovered.playerOneSteelMan = sanitizeInput(corruptedData.playerOneSteelMan)
      warnings.push('Recovered player one steel-man')
    }
    
    if (typeof corruptedData.playerTwoSteelMan === 'string' && corruptedData.playerTwoSteelMan.length > 0) {
      recovered.playerTwoSteelMan = sanitizeInput(corruptedData.playerTwoSteelMan)
      warnings.push('Recovered player two steel-man')
    }
    
    // Reset to appropriate phase based on recovered data
    if (recovered.agreedIssue && recovered.playerOneSteelMan && recovered.playerTwoSteelMan) {
      recovered.phase = 'statement-locking'
      warnings.push('Reset to statement-locking phase')
    } else if (recovered.agreedIssue) {
      recovered.phase = 'steel-manning'
      warnings.push('Reset to steel-manning phase')
    } else {
      recovered.phase = 'issue-agreement'
      warnings.push('Reset to issue-agreement phase')
    }
    
    return { 
      recovered: true, 
      sessionData: recovered, 
      warnings: warnings.length > 0 ? warnings : undefined 
    }
  } catch (error) {
    return { recovered: false }
  }
}