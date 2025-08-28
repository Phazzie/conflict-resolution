// AI Service for MixitFixit - The Digital Relationship Referee
// Because someone needs to call out your BS

export interface ManipulationTactic {
  tactic: string
  confidence: number
  description: string
  suggestion: string
}

export interface AIAnalysisResult {
  hasManipulation: boolean
  detectedTactics: ManipulationTactic[]
  overallTone: 'constructive' | 'defensive' | 'aggressive' | 'manipulative'
  suggestion: string
  rephraseOption?: string
}

export interface ConversationContext {
  agreedIssue: string
  playerOneStatement: string
  playerTwoStatement: string
  currentMessage: string
  messageAuthor: 'player1' | 'player2'
  previousMessages: Array<{
    author: 'player1' | 'player2'
    content: string
    timestamp: number
  }>
}

class AIConversationAnalyzer {
  private readonly MANIPULATION_TACTICS = [
    'gaslighting',
    'blame-shifting',
    'stonewalling',
    'triangulation',
    'guilt-tripping',
    'love-bombing',
    'projection',
    'deflection',
    'minimizing',
    'invalidation',
    'silent-treatment',
    'threat-making',
    'victim-playing',
    'word-salad',
    'circular-arguments'
  ]

  /**
   * Analyze a message for manipulative tactics and provide feedback
   */
  async analyzeMessage(context: ConversationContext): Promise<AIAnalysisResult> {
    try {
      // Construct the analysis prompt
      const prompt = this.buildAnalysisPrompt(context)
      
      // Call the Spark LLM API
      const response = await spark.llm(prompt, 'gpt-4o', true)
      
      // Parse the JSON response
      const analysis = JSON.parse(response) as AIAnalysisResult
      
      return analysis
    } catch (error) {
      console.error('AI Analysis failed:', error)
      
      // Fallback response when AI is unavailable
      return {
        hasManipulation: false,
        detectedTactics: [],
        overallTone: 'constructive',
        suggestion: "I'm having trouble analyzing this message right now. Perhaps take a moment to consider how your words might be received?"
      }
    }
  }

  /**
   * Build the analysis prompt for the LLM
   */
  private buildAnalysisPrompt(context: ConversationContext): string {
    const tacticsDescription = this.MANIPULATION_TACTICS.map(tactic => 
      `- ${tactic}: ${this.getTacticDescription(tactic)}`
    ).join('\n')

    return spark.llmPrompt`
You are an expert relationship communication analyst with a dry, witty personality. You've seen every manipulation tactic in the book and have zero patience for BS.

CONTEXT:
- Agreed Issue: "${context.agreedIssue}"
- Player 1 Statement: "${context.playerOneStatement}"
- Player 2 Statement: "${context.playerTwoStatement}"
- Current Message Author: ${context.messageAuthor}
- Current Message: "${context.currentMessage}"

MANIPULATION TACTICS TO DETECT:
${tacticsDescription}

ANALYSIS TASK:
Analyze the current message for manipulation tactics, tone, and provide constructive feedback in a dry, intelligent, slightly sarcastic tone that matches the MixitFixit personality.

RESPONSE FORMAT (JSON):
{
  "hasManipulation": boolean,
  "detectedTactics": [
    {
      "tactic": "string",
      "confidence": number (0-1),
      "description": "why this qualifies as this tactic",
      "suggestion": "how to rephrase constructively"
    }
  ],
  "overallTone": "constructive" | "defensive" | "aggressive" | "manipulative",
  "suggestion": "Main feedback with MixitFixit's dry wit",
  "rephraseOption": "Optional: constructive rephrase of the message"
}

Keep suggestions witty but constructive. Think "helpful friend who's tired of your drama" rather than "therapist."
`
  }

  /**
   * Get description for manipulation tactics
   */
  private getTacticDescription(tactic: string): string {
    const descriptions: Record<string, string> = {
      'gaslighting': 'Making someone question their reality or memory',
      'blame-shifting': 'Redirecting responsibility to avoid accountability',
      'stonewalling': 'Shutting down communication to avoid engagement',
      'triangulation': 'Involving third parties to avoid direct communication',
      'guilt-tripping': 'Using guilt to manipulate behavior',
      'love-bombing': 'Excessive affection to manipulate or distract',
      'projection': 'Attributing your own behaviors/feelings to others',
      'deflection': 'Changing subject to avoid addressing the issue',
      'minimizing': 'Downplaying the significance of concerns',
      'invalidation': 'Dismissing or denying others feelings/experiences',
      'silent-treatment': 'Withholding communication as punishment',
      'threat-making': 'Using threats to control behavior',
      'victim-playing': 'Positioning oneself as victim to gain sympathy/control',
      'word-salad': 'Confusing or nonsensical responses to avoid clarity',
      'circular-arguments': 'Repetitive arguing that goes nowhere'
    }
    
    return descriptions[tactic] || 'Unhelpful communication pattern'
  }

  /**
   * Analyze overall conversation patterns
   */
  async analyzeConversationFlow(context: ConversationContext): Promise<{
    patterns: string[]
    stuckPoints: string[]
    suggestions: string[]
  }> {
    const prompt = spark.llmPrompt`
Analyze this conversation for recurring patterns and stuck points.

CONTEXT:
- Issue: "${context.agreedIssue}"
- Messages: ${JSON.stringify(context.previousMessages.slice(-10))}

Identify:
1. Recurring negative patterns
2. Points where conversation gets stuck
3. Suggestions to move forward

Respond in JSON format with "patterns", "stuckPoints", and "suggestions" arrays.
Keep the tone consistent with MixitFixit's dry, helpful personality.
`

    try {
      const response = await spark.llm(prompt, 'gpt-4o', true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Conversation flow analysis failed:', error)
      return {
        patterns: [],
        stuckPoints: [],
        suggestions: ['Try focusing on the original issue rather than side tangents.']
      }
    }
  }
}

// Export singleton instance
export const aiAnalyzer = new AIConversationAnalyzer()

// Type exports for components
export type { AIAnalysisResult, ConversationContext, ManipulationTactic }