/**
 * Unified AI Service for MixitFixit
 * Consolidates aiAnalysis.ts and aiAnalyzer.ts with emotional intelligence improvements
 * Enhanced with security, resilience, and error handling
 */

import { sanitizeUserMessage, sanitizeAIResponse, rateLimiter } from '@/utils/security'
import { withRetry, requestCache, CircuitBreaker, handleApiError } from '@/utils/apiResilience'

export interface ManipulationTactic {
  tactic: string
  confidence: number
  description: string
  suggestion: string
}

export interface EmotionalState {
  level: 'calm' | 'frustrated' | 'angry' | 'distressed' | 'escalating'
  indicators: string[]
  confidence: number
}

export interface AIAnalysisResult {
  hasManipulation: boolean
  detectedTactics: ManipulationTactic[]
  overallTone: 'constructive' | 'defensive' | 'aggressive' | 'manipulative'
  emotionalState: EmotionalState
  suggestion: string
  rephraseOption?: string
  aiSensitivity: 'supportive' | 'neutral' | 'direct'
  deescalationNeeded: boolean
}

export interface ConversationContext {
  agreedIssue: string
  playerOneStatement: string
  playerTwoStatement: string
  currentMessage: string
  messageAuthor: 'player1' | 'player2'
  conflictContext?: 'relationship' | 'workplace' | 'family'
  previousMessages: Array<{
    author: 'player1' | 'player2'
    content: string
    timestamp: number
    emotionalLevel?: number
  }>
  userPreferences?: {
    aiSensitivity: 'supportive' | 'neutral' | 'direct'
    allowHumor: boolean
  }
}

/**
 * CRITICAL: Enhanced AI service with emotional intelligence
 * Addresses the "AI tone could kill the product" issue from audit
 */
export class UnifiedAIService {
  private static instance: UnifiedAIService
  private readonly maxRetries = 3
  private circuitBreaker = new CircuitBreaker(5, 60000) // 5 failures, 60s recovery
  
  // Enhanced fallback responses with emotional awareness
  private readonly fallbackResponses = {
    supportive: {
      manipulationDetected: "I notice this message might come across differently than intended. Would you like to try rephrasing it?",
      emotionalEscalation: "It sounds like emotions are running high. Taking a moment to breathe might help both of you.",
      genericIntervention: "I can see you both care deeply about this. Let's focus on understanding each other's perspectives."
    },
    neutral: {
      manipulationDetected: "This statement could be interpreted as problematic. Consider rephrasing to focus on the specific issue.",
      emotionalEscalation: "The conversation seems to be heating up. Let's redirect to the agreed-upon issue.",
      genericIntervention: "Let's keep the focus on solving the problem rather than identifying who's at fault."
    },
    direct: {
      manipulationDetected: "Hold up there. That statement has some problematic undertones. Try rephrasing without the blame Olympics.",
      emotionalEscalation: "I'm sensing some heat here. You're trying to solve something, not win something.",
      genericIntervention: "How about we try focusing on the actual issue instead of who's more wrong?"
    }
  }

  private readonly MANIPULATION_TACTICS = [
    'gaslighting', 'blame-shifting', 'stonewalling', 'triangulation',
    'guilt-tripping', 'love-bombing', 'projection', 'deflection',
    'minimizing', 'invalidation', 'silent-treatment', 'threat-making',
    'victim-playing', 'word-salad', 'circular-arguments'
  ]

  public static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService()
    }
    return UnifiedAIService.instance
  }

  /**
   * ENHANCED: Analyze message with security, resilience, and emotional intelligence
   */
  async analyzeMessage(
    content: string,
    context: ConversationContext
  ): Promise<AIAnalysisResult> {
    // Input validation and sanitization
    const validation = this.validateInput(content, context)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid input')
    }

    // Rate limiting check
    const rateLimitKey = `ai-analysis-${context.messageAuthor}`
    if (!rateLimiter.isAllowed(rateLimitKey, 10, 60000)) {
      throw new Error('Rate limit exceeded. Please wait before trying again.')
    }

    try {
      const sanitizedContent = sanitizeUserMessage(content)
      const sanitizedContext = this.sanitizeContext(context)
      
      const emotionalContext = this.assessEmotionalContext(sanitizedContext.previousMessages)
      const aiSensitivity = sanitizedContext.userPreferences?.aiSensitivity || 'neutral'
      
      const cacheKey = this.generateCacheKey(sanitizedContent, sanitizedContext)
      
      // Use circuit breaker and request caching
      return await this.circuitBreaker.execute(async () => {
        return await requestCache.get(cacheKey, async () => {
          const result = await withRetry(async () => {
            const prompt = this.buildEmotionallyAwarePrompt(
              sanitizedContent, 
              sanitizedContext, 
              emotionalContext, 
              aiSensitivity
            )
            
            const rawResponse = await spark.llm(prompt, 'gpt-4o', true)
            const sanitizedResponse = sanitizeAIResponse(rawResponse)
            
            return this.parseAIResponse(sanitizedResponse, aiSensitivity)
          }, {
            maxAttempts: 3,
            baseDelay: 1000,
            timeoutMs: 15000
          })

          if (result.success && result.data) {
            return result.data
          } else {
            throw new Error(result.error || 'AI analysis failed')
          }
        }, 30000) // Cache for 30 seconds
      })
    } catch (error) {
      const errorMessage = handleApiError(error, 'AI message analysis')
      console.error('AI Analysis failed:', error)
      
      return this.getFallbackAnalysis(
        content, 
        context.userPreferences?.aiSensitivity || 'neutral',
        errorMessage
      )
    }
  }

  /**
   * Validates input before processing
   */
  private validateInput(content: string, context: ConversationContext): {
    isValid: boolean
    error?: string
  } {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Message content is required' }
    }

    if (content.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' }
    }

    if (content.length > 5000) {
      return { isValid: false, error: 'Message is too long (max 5000 characters)' }
    }

    if (!context || !context.messageAuthor) {
      return { isValid: false, error: 'Message context is invalid' }
    }

    return { isValid: true }
  }

  /**
   * Sanitizes conversation context
   */
  private sanitizeContext(context: ConversationContext): ConversationContext {
    return {
      ...context,
      agreedIssue: sanitizeUserMessage(context.agreedIssue || ''),
      playerOneStatement: sanitizeUserMessage(context.playerOneStatement || ''),
      playerTwoStatement: sanitizeUserMessage(context.playerTwoStatement || ''),
      currentMessage: sanitizeUserMessage(context.currentMessage || ''),
      previousMessages: context.previousMessages?.map(msg => ({
        ...msg,
        content: sanitizeUserMessage(msg.content || '')
      })) || []
    }
  }

  /**
   * Generates cache key for request deduplication
   */
  private generateCacheKey(content: string, context: ConversationContext): string {
    const keyData = {
      content: content.slice(0, 100), // First 100 chars
      author: context.messageAuthor,
      issue: context.agreedIssue.slice(0, 50),
      sensitivity: context.userPreferences?.aiSensitivity,
      recentMessages: context.previousMessages?.slice(-3).map(m => m.content.slice(0, 50))
    }
    
    return `ai-analysis-${JSON.stringify(keyData).replace(/\s/g, '').slice(0, 200)}`
  }

  /**
   * CRITICAL: Assess emotional escalation from conversation history
   */
  private assessEmotionalContext(messages: ConversationContext['previousMessages']): {
    isEscalating: boolean
    currentLevel: number
    trendDirection: 'up' | 'down' | 'stable'
  } {
    if (messages.length < 2) {
      return { isEscalating: false, currentLevel: 1, trendDirection: 'stable' }
    }

    // Simple escalation detection based on message patterns
    const recentMessages = messages.slice(-5)
    let escalationScore = 0
    
    for (const message of recentMessages) {
      const content = message.content.toLowerCase()
      
      // Check for escalation indicators
      if (content.includes('always') || content.includes('never')) escalationScore += 1
      if (content.includes('!')) escalationScore += 1
      if (content.match(/[A-Z]{3,}/)) escalationScore += 2 // ALL CAPS
      if (content.includes('you') && (content.includes('wrong') || content.includes('fault'))) escalationScore += 2
    }

    const currentLevel = Math.min(escalationScore / 2, 5)
    const isEscalating = currentLevel > 2
    
    return {
      isEscalating,
      currentLevel,
      trendDirection: isEscalating ? 'up' : 'stable'
    }
  }

  /**
   * ENHANCED: Build emotionally aware prompt with adaptive tone
   */
  private buildEmotionallyAwarePrompt(
    content: string,
    context: ConversationContext,
    emotionalContext: { isEscalating: boolean; currentLevel: number },
    aiSensitivity: 'supportive' | 'neutral' | 'direct'
  ): string {
    const sensitivityInstructions = {
      supportive: "Use gentle, empathetic language. Assume positive intent. Focus on emotional validation while still addressing issues.",
      neutral: "Use clear, professional language. Be helpful but not overly emotional. Focus on practical solutions.",
      direct: "Use straightforward language with dry humor when appropriate. Be honest about problematic patterns but not harsh."
    }

    const escalationInstructions = emotionalContext.isEscalating 
      ? "CRITICAL: The conversation is escalating emotionally. Your response should prioritize de-escalation and emotional regulation."
      : "The conversation appears stable. Proceed with standard analysis."

    return spark.llmPrompt`
You are an expert relationship therapist and communication coach analyzing a message in a conflict resolution session. 

TONE SETTING: ${sensitivityInstructions[aiSensitivity]}

EMOTIONAL CONTEXT: ${escalationInstructions}

CONVERSATION CONTEXT:
- Agreed Issue: "${context.agreedIssue}"
- Author: ${context.messageAuthor}
- Conflict Type: ${context.conflictContext || 'relationship'}
- Message to Analyze: "${content}"

Previous conversation context:
${context.previousMessages.map(m => `${m.author}: "${m.content}"`).join('\n')}

Locked Statements:
- Player 1: "${context.playerOneStatement}"
- Player 2: "${context.playerTwoStatement}"

ANALYSIS REQUIRED:
1. Detect any manipulation tactics: ${this.MANIPULATION_TACTICS.join(', ')}
2. Assess emotional state: calm, frustrated, angry, distressed, escalating
3. Determine if de-escalation is needed
4. Provide constructive suggestion using the ${aiSensitivity} tone
5. Offer a rephrase option if needed

Return JSON format:
{
  "hasManipulation": boolean,
  "detectedTactics": [{"tactic": "name", "confidence": 0.0-1.0, "description": "explanation", "suggestion": "how to address"}],
  "overallTone": "constructive|defensive|aggressive|manipulative", 
  "emotionalState": {
    "level": "calm|frustrated|angry|distressed|escalating",
    "indicators": ["list of emotional indicators"],
    "confidence": 0.0-1.0
  },
  "suggestion": "main therapeutic intervention",
  "rephraseOption": "optional rephrased version",
  "deescalationNeeded": boolean
}
`
  }

  /**
   * ENHANCED: Parse AI response with emotional intelligence
   */
  private parseAIResponse(rawResponse: string, aiSensitivity: 'supportive' | 'neutral' | 'direct'): AIAnalysisResult {
    try {
      const parsed = JSON.parse(aiSanitizer.sanitize(rawResponse))
      
      // Ensure all required fields are present
      return {
        hasManipulation: parsed.hasManipulation || false,
        detectedTactics: parsed.detectedTactics || [],
        overallTone: parsed.overallTone || 'neutral',
        emotionalState: parsed.emotionalState || { level: 'calm', indicators: [], confidence: 0.5 },
        suggestion: parsed.suggestion || this.fallbackResponses[aiSensitivity].genericIntervention,
        rephraseOption: parsed.rephraseOption,
        aiSensitivity,
        deescalationNeeded: parsed.deescalationNeeded || false
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return this.getFallbackAnalysis('', aiSensitivity)
    }
  }

  /**
   * ENHANCED: Fallback analysis with emotional awareness
   */
  private getFallbackAnalysis(
    content: string, 
    aiSensitivity: 'supportive' | 'neutral' | 'direct',
    errorMessage?: string
  ): AIAnalysisResult {
    const hasEscalationKeywords = /always|never|you're wrong|shut up|whatever/i.test(content)
    
    return {
      hasManipulation: hasEscalationKeywords,
      detectedTactics: hasEscalationKeywords ? [{
        tactic: 'potential-escalation',
        confidence: 0.6,
        description: 'Message contains potential escalation language',
        suggestion: 'Try rephrasing with "I feel" statements'
      }] : [],
      overallTone: hasEscalationKeywords ? 'defensive' : 'constructive',
      emotionalState: {
        level: hasEscalationKeywords ? 'frustrated' : 'calm',
        indicators: hasEscalationKeywords ? ['absolute statements', 'blame language'] : [],
        confidence: 0.6
      },
      suggestion: errorMessage 
        ? `${errorMessage} Using basic analysis instead.`
        : this.fallbackResponses[aiSensitivity].genericIntervention,
      aiSensitivity,
      deescalationNeeded: hasEscalationKeywords
    }
  }

  /**
   * NEW: A/B test different AI personalities
   */
  async testPersonality(content: string, context: ConversationContext): Promise<{
    supportive: AIAnalysisResult
    neutral: AIAnalysisResult
    direct: AIAnalysisResult
  }> {
    const [supportive, neutral, direct] = await Promise.all([
      this.analyzeMessage(content, { ...context, userPreferences: { aiSensitivity: 'supportive', allowHumor: false } }),
      this.analyzeMessage(content, { ...context, userPreferences: { aiSensitivity: 'neutral', allowHumor: false } }),
      this.analyzeMessage(content, { ...context, userPreferences: { aiSensitivity: 'direct', allowHumor: true } })
    ])

    return { supportive, neutral, direct }
  }
}

// Export singleton instance
export const unifiedAIService = UnifiedAIService.getInstance()