/**
 * AI service for MixitFixit - handles Gemini API integration
 * Provides snarky, insightful interventions for dysfunctional communication
 */

import { aiRateLimiter } from './aiRateLimit'
import { Message } from '@/types/session'

export interface AIInterventionRequest {
  currentMessage: string
  messageHistory: Message[]
  agreedIssue: string
  playerOneStatement?: string
  playerTwoStatement?: string
  currentPlayer: 'player1' | 'player2'
}

export interface AIResponse {
  intervention: string
  confidence: number
  detectedPatterns: string[]
}

class AIService {
  private static instance: AIService

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  /**
   * Generate AI intervention based on conversation context
   */
  async generateIntervention(request: AIInterventionRequest): Promise<AIResponse | null> {
    const sessionId = 'current' // Could be made dynamic later
    
    // Check rate limits
    if (!aiRateLimiter.canMakeAICall(sessionId)) {
      return null
    }

    // Check if intervention is needed
    if (!aiRateLimiter.shouldIntervene(request.currentMessage, request.messageHistory)) {
      return null
    }

    try {
      const prompt = this.buildPrompt(request)
      const response = await spark.llm(prompt, 'gpt-4o-mini', true)
      
      return this.parseResponse(response)
    } catch (error) {
      console.error('AI service error:', error)
      return this.getFallbackResponse(request)
    }
  }

  /**
   * Build the prompt for AI intervention
   */
  private buildPrompt(request: AIInterventionRequest): string {
    const { currentMessage, messageHistory, agreedIssue, playerOneStatement, playerTwoStatement, currentPlayer } = request

    return spark.llmPrompt`
You are the AI referee for MixitFixit, a conflict resolution app. You have a sharp wit, deep understanding of relationship dynamics, and a talent for calling out BS while remaining constructive.

CONTEXT:
- Issue being discussed: "${agreedIssue}"
- Player 1's statement: "${playerOneStatement || 'Not yet provided'}"
- Player 2's statement: "${playerTwoStatement || 'Not yet provided'}"
- Current player: ${currentPlayer}

RECENT CONVERSATION:
${messageHistory.slice(-5).map(m => `${m.author}: ${m.content}`).join('\n')}

CURRENT MESSAGE:
${currentPlayer}: ${currentMessage}

Your personality:
- Witty but not mean
- Insightful about manipulation tactics
- Direct but constructive
- Slightly sarcastic, like a brilliant friend who's seen this before
- Goal is progress, not winning arguments

ANALYZE the current message for:
1. Manipulation tactics (gaslighting, blame-shifting, stonewalling, deflection)
2. Unhelpful communication patterns (absolutes, personal attacks, topic changes)
3. Contradictions with locked statements
4. Opportunities for better phrasing

Respond with JSON:
{
  "intervention": "Your snarky but helpful response (max 280 chars)",
  "confidence": 0.8,
  "detectedPatterns": ["pattern1", "pattern2"]
}

If no intervention is needed, return:
{
  "intervention": "",
  "confidence": 0,
  "detectedPatterns": []
}
`
  }

  /**
   * Parse AI response and validate format
   */
  private parseResponse(response: string): AIResponse {
    try {
      const parsed = JSON.parse(response)
      
      return {
        intervention: parsed.intervention || '',
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
        detectedPatterns: Array.isArray(parsed.detectedPatterns) ? parsed.detectedPatterns : []
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return {
        intervention: '',
        confidence: 0,
        detectedPatterns: []
      }
    }
  }

  /**
   * Fallback responses when AI is unavailable
   */
  private getFallbackResponse(request: AIInterventionRequest): AIResponse {
    const fallbacks = [
      "Hold up - let's take a breath and try rephrasing that.",
      "Interesting choice of words there. Care to rephrase?",
      "That sounded a bit spicy. Want to try again with less heat?",
      "I'm sensing some defensiveness. What's the real issue here?",
      "Before we go down this rabbit hole, let's stick to the actual issue.",
    ]

    // Simple pattern detection for fallback
    const message = request.currentMessage.toLowerCase()
    const patterns: string[] = []
    
    if (/you always|you never/.test(message)) {
      patterns.push('absolutes')
    }
    if (/stupid|dumb|idiot/.test(message)) {
      patterns.push('personal_attacks')
    }
    if (message.length < 10 && /fine|whatever|ok/.test(message)) {
      patterns.push('dismissive')
    }

    return {
      intervention: patterns.length > 0 ? fallbacks[Math.floor(Math.random() * fallbacks.length)] : '',
      confidence: patterns.length > 0 ? 0.6 : 0,
      detectedPatterns: patterns
    }
  }
}

export const aiService = AIService.getInstance()