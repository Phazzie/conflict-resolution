import DOMPurify from 'dompurify'

/**
 * Sanitize AI responses to prevent XSS attacks and ensure safe content
 */
export class AISanitizer {
  private static instance: AISanitizer
  private readonly allowedTags = [
    'b', 'i', 'u', 'strong', 'em', 'p', 'br', 
    'ul', 'ol', 'li', 'blockquote', 'code'
  ]
  private readonly maxLength = 2000 // Maximum length for AI responses
  
  static getInstance(): AISanitizer {
    if (!AISanitizer.instance) {
      AISanitizer.instance = new AISanitizer()
    }
    return AISanitizer.instance
  }

  /**
   * Sanitize AI response content
   */
  sanitizeResponse(content: string): string {
    if (!content || typeof content !== 'string') {
      return ''
    }

    // First, truncate if too long
    let sanitized = content.length > this.maxLength 
      ? content.substring(0, this.maxLength) + '...' 
      : content

    // Remove potential script injections and unsafe content
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: this.allowedTags,
      ALLOWED_ATTR: [], // No attributes allowed for maximum security
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false
    })

    // Additional custom sanitization for AI-specific risks
    sanitized = this.removePromptInjection(sanitized)
    sanitized = this.removePersonalInfo(sanitized)
    sanitized = this.validateTone(sanitized)

    return sanitized.trim()
  }

  /**
   * Sanitize entire AI analysis object
   */
  sanitizeAIAnalysis(analysis: any): any {
    if (!analysis || typeof analysis !== 'object') {
      return analysis
    }

    const sanitized = { ...analysis }

    // Sanitize string fields
    if (sanitized.content) {
      sanitized.content = this.sanitizeResponse(sanitized.content)
    }

    if (sanitized.suggestions && Array.isArray(sanitized.suggestions)) {
      sanitized.suggestions = sanitized.suggestions.map((suggestion: any) => ({
        ...suggestion,
        content: this.sanitizeResponse(suggestion.content || ''),
        rationale: this.sanitizeResponse(suggestion.rationale || '')
      }))
    }

    if (sanitized.manipulationTactics && Array.isArray(sanitized.manipulationTactics)) {
      sanitized.manipulationTactics = sanitized.manipulationTactics.map((tactic: any) => ({
        ...tactic,
        description: this.sanitizeResponse(tactic.description || ''),
        evidence: this.sanitizeResponse(tactic.evidence || '')
      }))
    }

    // Ensure numeric values are within reasonable bounds
    if (typeof sanitized.toxicityScore === 'number') {
      sanitized.toxicityScore = Math.max(0, Math.min(1, sanitized.toxicityScore))
    }

    if (sanitized.emotionalTone && typeof sanitized.emotionalTone.intensity === 'number') {
      sanitized.emotionalTone.intensity = Math.max(0, Math.min(1, sanitized.emotionalTone.intensity))
    }

    return sanitized
  }

  /**
   * Remove potential prompt injection attempts
   */
  private removePromptInjection(content: string): string {
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/gi,
      /system\s*:\s*/gi,
      /prompt\s*:\s*/gi,
      /\[SYSTEM\]/gi,
      /\[HUMAN\]/gi,
      /\[AI\]/gi,
      /<\|.*?\|>/g,
      /```[\s\S]*?```/g // Remove code blocks that might contain injection
    ]

    let sanitized = content
    injectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[CONTENT FILTERED]')
    })

    return sanitized
  }

  /**
   * Remove or mask potential personal information
   */
  private removePersonalInfo(content: string): string {
    const personalInfoPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card pattern
      /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/gi // Address
    ]

    let sanitized = content
    personalInfoPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[PERSONAL INFO REMOVED]')
    })

    return sanitized
  }

  /**
   * Validate that AI response maintains appropriate tone
   */
  private validateTone(content: string): string {
    // Check for inappropriate content that shouldn't come from our AI
    const inappropriatePatterns = [
      /kill\s+yourself/gi,
      /you\s+should\s+die/gi,
      /worthless/gi,
      /pathetic/gi
    ]

    let sanitized = content
    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        console.warn('AI response contained inappropriate content, filtering')
        sanitized = sanitized.replace(pattern, '[INAPPROPRIATE CONTENT FILTERED]')
      }
    })

    return sanitized
  }

  /**
   * Validate JSON response structure from AI
   */
  validateJSONResponse(jsonString: string): { valid: boolean; parsed?: any; error?: string } {
    try {
      const parsed = JSON.parse(jsonString)
      
      // Basic structure validation
      if (typeof parsed !== 'object' || parsed === null) {
        return { valid: false, error: 'Response is not a valid object' }
      }

      // Sanitize the parsed object
      const sanitized = this.sanitizeAIAnalysis(parsed)
      
      return { valid: true, parsed: sanitized }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'JSON parse failed' 
      }
    }
  }
}

// Export singleton instance
export const aiSanitizer = AISanitizer.getInstance()