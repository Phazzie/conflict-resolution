/**
 * Rate limiting and smart intervention utilities
 */

interface RateLimitState {
  lastCall: number
  callCount: number
  resetTime: number
}

class AIRateLimiter {
  private static instance: AIRateLimiter
  private limits: Map<string, RateLimitState> = new Map()

  static getInstance(): AIRateLimiter {
    if (!AIRateLimiter.instance) {
      AIRateLimiter.instance = new AIRateLimiter()
    }
    return AIRateLimiter.instance
  }

  /**
   * Check if AI call is allowed based on rate limits
   */
  canMakeAICall(sessionId: string = 'default'): boolean {
    const now = Date.now()
    const state = this.limits.get(sessionId) || {
      lastCall: 0,
      callCount: 0,
      resetTime: now + (60 * 1000) // Reset every minute
    }

    // Reset counter if time window has passed
    if (now > state.resetTime) {
      state.callCount = 0
      state.resetTime = now + (60 * 1000)
    }

    // Allow max 10 calls per minute
    if (state.callCount >= 10) {
      return false
    }

    // Minimum 2 seconds between calls
    if (now - state.lastCall < 2000) {
      return false
    }

    state.lastCall = now
    state.callCount++
    this.limits.set(sessionId, state)

    return true
  }

  /**
   * Get time until next call is allowed
   */
  getTimeUntilNextCall(sessionId: string = 'default'): number {
    const state = this.limits.get(sessionId)
    if (!state) return 0
    
    const now = Date.now()
    const timeSinceLastCall = now - state.lastCall
    
    if (timeSinceLastCall < 2000) {
      return 2000 - timeSinceLastCall
    }
    
    return 0
  }

  /**
   * Check if intervention is needed based on message patterns
   */
  shouldIntervene(message: string, messageHistory: Array<{content: string, author: string}>): boolean {
    // Don't intervene if we just did (last message was AI)
    if (messageHistory.length > 0 && messageHistory[messageHistory.length - 1]?.author === 'ai') {
      return false
    }

    // Count recent AI interventions
    const recentMessages = messageHistory.slice(-8)
    const recentAICount = recentMessages.filter(m => m.author === 'ai').length
    
    // Don't over-intervene
    if (recentAICount >= 3) return false

    const content = message.toLowerCase().trim()

    // High priority intervention patterns
    const highPriorityPatterns = [
      /you always|you never|every time you/i,
      /that's stupid|you're stupid|that's dumb/i,
      /shut up|whatever|i don't care/i,
      /you're lying|that's not true|you're wrong/i,
      /fine|good|ok/,  // Dismissive short responses
    ]

    // Medium priority patterns
    const mediumPriorityPatterns = [
      /but you|but that's|but what about/i,
      /why do you always|why don't you ever/i,
      /i can't believe|how can you/i,
      /this is ridiculous|this is stupid/i
    ]

    // High priority = always intervene (if rate limit allows)
    if (highPriorityPatterns.some(pattern => pattern.test(content))) {
      return true
    }

    // Medium priority = intervene occasionally
    if (mediumPriorityPatterns.some(pattern => pattern.test(content))) {
      return Math.random() > 0.6 // 40% chance
    }

    // Long messages might need intervention
    if (content.length > 300) {
      return Math.random() > 0.7 // 30% chance
    }

    // Periodic check-ins
    if (messageHistory.length > 0 && messageHistory.length % 6 === 0) {
      return Math.random() > 0.5 // 50% chance every 6 messages
    }

    return false
  }
}

export const aiRateLimiter = AIRateLimiter.getInstance()