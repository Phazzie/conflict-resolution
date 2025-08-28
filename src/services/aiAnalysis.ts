import { AIAnalysis, ManipulationTactic, EmotionalTone, AISuggestion } from '@/types/session'

/**
 * AI-powered conversation analysis service
 * Detects manipulation tactics, emotional tone, and provides therapeutic interventions
 */
export class AIAnalysisService {
  private static instance: AIAnalysisService
  private readonly maxRetries = 3
  private readonly fallbackResponses = {
    manipulationDetected: "Hold up there, champ. That statement has some problematic undertones. Maybe try rephrasing without the blame Olympics?",
    emotionalEscalation: "I'm sensing some heat here. Take a breath. Remember, you're trying to solve something, not win something.",
    genericIntervention: "Interesting approach. How about we try focusing on the actual issue instead of who's more wrong?"
  }

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService()
    }
    return AIAnalysisService.instance
  }

  /**
   * Analyze a message for manipulation tactics, emotional tone, and provide suggestions
   */
  async analyzeMessage(
    content: string, 
    context: {
      previousMessages: string[]
      agreedIssue: string
      playerStatements: { player1: string, player2: string }
      messageAuthor: 'player1' | 'player2'
    }
  ): Promise<AIAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(content, context)
      const rawResponse = await spark.llm(prompt, 'gpt-4o', true)
      
      return this.parseAIResponse(rawResponse)
    } catch (error) {
      console.error('AI Analysis failed:', error)
      return this.getFallbackAnalysis(content)
    }
  }

  /**
   * Build comprehensive analysis prompt for Gemini
   */
  private buildAnalysisPrompt(
    content: string, 
    context: {
      previousMessages: string[]
      agreedIssue: string
      playerStatements: { player1: string, player2: string }
      messageAuthor: 'player1' | 'player2'
    }
  ): string {
    return spark.llmPrompt`
You are a highly experienced relationship therapist and communication expert analyzing a message in a conflict resolution session. Your job is to detect manipulation tactics, assess emotional tone, and provide therapeutic interventions with a dry, witty, but ultimately helpful tone.

CONTEXT:
- Agreed Issue: ${context.agreedIssue}
- ${context.messageAuthor === 'player1' ? 'Player 1' : 'Player 2'}'s Locked Statement: ${context.playerStatements[context.messageAuthor]}
- Recent conversation: ${context.previousMessages.slice(-3).join('\n')}

CURRENT MESSAGE TO ANALYZE:
"${content}"

Please analyze this message and respond with a JSON object containing:

{
  "manipulationTactics": [
    {
      "type": "gaslighting|blame-shifting|stonewalling|projection|triangulation|love-bombing|guilt-tripping|deflection|minimizing|dismissing",
      "severity": "low|medium|high",
      "evidence": "specific text showing this tactic",
      "description": "brief explanation of why this is problematic"
    }
  ],
  "toxicityScore": 0.0-1.0,
  "emotionalTone": {
    "primary": "angry|defensive|hurt|frustrated|dismissive|caring|confused|hopeful",
    "intensity": 0.0-1.0,
    "secondaryEmotions": ["array of secondary emotions"]
  },
  "suggestions": [
    {
      "type": "rephrase|question|reflection|validation|boundary",
      "content": "specific suggestion in MixitFixit's witty but helpful tone",
      "rationale": "why this suggestion would be more effective"
    }
  ],
  "confidence": 0.0-1.0
}

TONE GUIDELINES:
- Be direct but not cruel
- Use dry humor when appropriate
- Focus on patterns, not character assassination
- Suggest concrete improvements
- Channel your inner "smart friend who's tired of your BS but still wants to help"

MANIPULATION DETECTION FOCUS:
- Gaslighting: Making the other person question reality
- Blame-shifting: Deflecting responsibility onto the other person
- Stonewalling: Shutting down communication
- Projection: Accusing others of your own behaviors
- Triangulation: Bringing in third parties inappropriately
- Love-bombing: Excessive flattery to manipulate
- Guilt-tripping: Using shame to control
- Deflection: Avoiding the topic entirely
- Minimizing: Downplaying legitimate concerns
- Dismissing: Invalidating the other person's experience
`
  }

  /**
   * Parse AI response and validate structure
   */
  private parseAIResponse(rawResponse: string): AIAnalysis {
    try {
      const parsed = JSON.parse(rawResponse)
      
      // Validate and sanitize response
      return {
        manipulationTactics: Array.isArray(parsed.manipulationTactics) ? parsed.manipulationTactics : [],
        toxicityScore: Math.max(0, Math.min(1, parsed.toxicityScore || 0)),
        emotionalTone: {
          primary: parsed.emotionalTone?.primary || 'confused',
          intensity: Math.max(0, Math.min(1, parsed.emotionalTone?.intensity || 0.5)),
          secondaryEmotions: Array.isArray(parsed.emotionalTone?.secondaryEmotions) ? parsed.emotionalTone.secondaryEmotions : []
        },
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [], // Limit to 3 suggestions
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return this.getFallbackAnalysis(rawResponse)
    }
  }

  /**
   * Generate fallback analysis when AI fails
   */
  private getFallbackAnalysis(content: string): AIAnalysis {
    const toxicWords = ['always', 'never', 'you are', 'your fault', 'ridiculous', 'stupid', 'crazy']
    const toxicityScore = toxicWords.filter(word => content.toLowerCase().includes(word)).length / toxicWords.length

    return {
      manipulationTactics: toxicityScore > 0.3 ? [{
        type: 'blame-shifting',
        severity: 'medium' as const,
        evidence: 'Detected potentially problematic language patterns',
        description: 'This message contains language that might shut down productive conversation'
      }] : [],
      toxicityScore,
      emotionalTone: {
        primary: toxicityScore > 0.5 ? 'angry' : 'frustrated',
        intensity: Math.min(toxicityScore + 0.3, 1),
        secondaryEmotions: ['defensive']
      },
      suggestions: [{
        type: 'rephrase',
        content: "Maybe try expressing this as an 'I feel' statement instead? Just a wild suggestion from your friendly neighborhood AI.",
        rationale: "Personal expression tends to be less triggering than accusations"
      }],
      confidence: 0.6
    }
  }

  /**
   * Generate real-time intervention suggestion
   */
  async generateIntervention(
    manipulation: ManipulationTactic[], 
    emotionalTone: EmotionalTone,
    messageContent: string
  ): Promise<string> {
    if (manipulation.length === 0 && emotionalTone.intensity < 0.6) {
      return '' // No intervention needed
    }

    try {
      const prompt = spark.llmPrompt`
Generate a brief, witty but helpful intervention message for this situation:

Detected manipulation: ${manipulation.map(m => `${m.type} (${m.severity})`).join(', ') || 'none'}
Emotional intensity: ${emotionalTone.intensity}
Primary emotion: ${emotionalTone.primary}

Original message: "${messageContent}"

Provide a single sentence intervention in MixitFixit's signature tone: direct, slightly sarcastic, but ultimately trying to help. Maximum 50 words.
`
      
      const response = await spark.llm(prompt, 'gpt-4o-mini')
      return response.trim().replace(/^["']|["']$/g, '') // Remove quotes
    } catch (error) {
      console.error('Intervention generation failed:', error)
      
      // Fallback interventions based on patterns
      if (manipulation.some(m => m.type === 'gaslighting')) {
        return this.fallbackResponses.manipulationDetected
      }
      if (emotionalTone.intensity > 0.8) {
        return this.fallbackResponses.emotionalEscalation
      }
      return this.fallbackResponses.genericIntervention
    }
  }

  /**
   * Analyze overall session patterns
   */
  async analyzeSessionPatterns(messages: Array<{ content: string, author: string, aiAnalysis?: AIAnalysis }>): Promise<{
    overallToxicity: number
    improvementTrend: 'improving' | 'worsening' | 'stable'
    dominantTactics: ManipulationTactic[]
    breakthroughMoments: number[]
  }> {
    const analyses = messages.map(m => m.aiAnalysis).filter(Boolean)
    if (analyses.length === 0) {
      return {
        overallToxicity: 0,
        improvementTrend: 'stable',
        dominantTactics: [],
        breakthroughMoments: []
      }
    }

    // Calculate trends
    const toxicityScores = analyses.map(a => a!.toxicityScore)
    const overallToxicity = toxicityScores.reduce((sum, score) => sum + score, 0) / toxicityScores.length

    // Determine trend (comparing first half vs second half)
    const midpoint = Math.floor(toxicityScores.length / 2)
    const firstHalf = toxicityScores.slice(0, midpoint)
    const secondHalf = toxicityScores.slice(midpoint)
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length
    
    let improvementTrend: 'improving' | 'worsening' | 'stable'
    if (secondAvg < firstAvg - 0.1) {
      improvementTrend = 'improving'
    } else if (secondAvg > firstAvg + 0.1) {
      improvementTrend = 'worsening'
    } else {
      improvementTrend = 'stable'
    }

    // Find dominant manipulation tactics
    const allTactics = analyses.flatMap(a => a!.manipulationTactics)
    const tacticCounts = allTactics.reduce((counts, tactic) => {
      const key = tactic.type
      counts[key] = (counts[key] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const dominantTactics = Object.entries(tacticCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => allTactics.find(t => t.type === type)!)
      .filter(Boolean)

    // Find breakthrough moments (significant drops in toxicity)
    const breakthroughMoments: number[] = []
    for (let i = 1; i < toxicityScores.length; i++) {
      if (toxicityScores[i-1] > 0.6 && toxicityScores[i] < 0.3) {
        breakthroughMoments.push(i)
      }
    }

    return {
      overallToxicity,
      improvementTrend,
      dominantTactics,
      breakthroughMoments
    }
  }
}

// Export singleton instance
export const aiAnalysisService = AIAnalysisService.getInstance()