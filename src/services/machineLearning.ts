import { SessionData, Message } from '../types/session'

// Machine Learning Model for Pattern Detection
export interface MLModel {
  id: string
  version: number
  accuracy: number
  trainingData: PatternExample[]
  weights: Record<string, number>
  lastUpdated: number
}

export interface PatternExample {
  text: string
  patterns: string[]
  confidence: number
  userFeedback?: 'correct' | 'incorrect' | 'partial'
  sessionOutcome?: 'resolved' | 'stalemate' | 'abandoned'
  contextFeatures: ContextFeatures
}

export interface ContextFeatures {
  messageLength: number
  emotionalIntensity: number
  responseTime: number
  sequencePosition: number
  previousPatterns: string[]
  sessionPhase: string
  playerRole: string
}

export interface PatternPrediction {
  pattern: string
  confidence: number
  reasoning: string
  suggestedResponse?: string
  interventionType: 'gentle' | 'firm' | 'redirect'
}

// Known manipulation patterns with their ML features
const PATTERN_FEATURES = {
  'gaslighting': {
    keywords: ['never said', 'making things up', 'crazy', 'imagining', 'overreacting'],
    sentimentShift: true,
    contradictionLikely: true,
    baseWeight: 0.8
  },
  'blame-shifting': {
    keywords: ['you always', 'you never', 'your fault', 'because of you'],
    pronounRatio: true, // high "you" vs "I" ratio
    defensivePattern: true,
    baseWeight: 0.7
  },
  'stonewalling': {
    keywords: ['whatever', 'fine', 'done talking'],
    shortResponses: true,
    avoidancePattern: true,
    baseWeight: 0.6
  },
  'projection': {
    keywords: ['you\'re the one', 'you do the same', 'hypocrite'],
    deflectionPattern: true,
    mirrorLanguage: true,
    baseWeight: 0.7
  },
  'guilt-tripping': {
    keywords: ['disappointed', 'hurt', 'always do this', 'never care'],
    emotionalManipulation: true,
    victimLanguage: true,
    baseWeight: 0.6
  },
  'triangulation': {
    keywords: ['said you', 'everyone thinks', 'others agree'],
    thirdPartyReference: true,
    coalitionBuilding: true,
    baseWeight: 0.8
  }
}

class MachineLearningService {
  private model: MLModel
  private readonly LEARNING_RATE = 0.1
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.4
  private readonly MAX_TRAINING_EXAMPLES = 1000

  constructor() {
    this.model = this.loadModel() || this.initializeModel()
  }

  private initializeModel(): MLModel {
    return {
      id: `ml-model-${Date.now()}`,
      version: 1,
      accuracy: 0.5, // Start at baseline
      trainingData: [],
      weights: this.initializeWeights(),
      lastUpdated: Date.now()
    }
  }

  private initializeWeights(): Record<string, number> {
    const weights: Record<string, number> = {}
    
    // Initialize pattern weights
    Object.entries(PATTERN_FEATURES).forEach(([pattern, features]) => {
      weights[`pattern_${pattern}`] = features.baseWeight
      
      // Initialize feature weights for this pattern
      features.keywords?.forEach((keyword, idx) => {
        weights[`${pattern}_keyword_${idx}`] = 0.1
      })
    })

    // Initialize context feature weights
    weights['message_length'] = 0.2
    weights['emotional_intensity'] = 0.3
    weights['response_time'] = 0.1
    weights['sequence_position'] = 0.15
    weights['session_phase_weight'] = 0.2

    return weights
  }

  private loadModel(): MLModel | null {
    try {
      const saved = localStorage.getItem('mixitfixit-ml-model')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Failed to load ML model:', error)
      return null
    }
  }

  private saveModel(): void {
    try {
      localStorage.setItem('mixitfixit-ml-model', JSON.stringify(this.model))
    } catch (error) {
      console.error('Failed to save ML model:', error)
    }
  }

  // Extract features from a message for pattern detection
  private extractFeatures(message: Message, context: {
    sessionData: SessionData
    messageIndex: number
    previousMessages: Message[]
  }): ContextFeatures {
    const text = message.text.toLowerCase()
    
    return {
      messageLength: message.text.length,
      emotionalIntensity: this.calculateEmotionalIntensity(message.text),
      responseTime: this.calculateResponseTime(context.previousMessages, context.messageIndex),
      sequencePosition: context.messageIndex / Math.max(context.previousMessages.length, 1),
      previousPatterns: this.extractPreviousPatterns(context.previousMessages.slice(0, context.messageIndex)),
      sessionPhase: context.sessionData.phase,
      playerRole: message.sender
    }
  }

  private calculateEmotionalIntensity(text: string): number {
    const emotionalIndicators = [
      'always', 'never', 'hate', 'love', 'terrible', 'amazing',
      'worst', 'best', 'furious', 'devastated', 'ecstatic',
      '!', '?', 'WHY', 'NEVER', 'ALWAYS'
    ]
    
    const matches = emotionalIndicators.reduce((count, indicator) => {
      return count + (text.toLowerCase().includes(indicator.toLowerCase()) ? 1 : 0)
    }, 0)

    return Math.min(matches / 10, 1) // Normalize to 0-1
  }

  private calculateResponseTime(previousMessages: Message[], currentIndex: number): number {
    if (currentIndex === 0) return 0
    
    const prevMessage = previousMessages[currentIndex - 1]
    const currentMessage = previousMessages[currentIndex]
    
    if (!prevMessage || !currentMessage) return 0
    
    const timeDiff = currentMessage.timestamp - prevMessage.timestamp
    // Normalize response time (0-1, where 1 is very quick response)
    return Math.max(0, 1 - (timeDiff / 300000)) // 5 minutes = 0
  }

  private extractPreviousPatterns(previousMessages: Message[]): string[] {
    return previousMessages
      .filter(msg => msg.detectedPatterns)
      .flatMap(msg => msg.detectedPatterns || [])
      .slice(-5) // Last 5 patterns for context
  }

  // Predict patterns in a message using ML
  public async predictPatterns(
    message: Message,
    context: {
      sessionData: SessionData
      messageIndex: number
      previousMessages: Message[]
    }
  ): Promise<PatternPrediction[]> {
    const features = this.extractFeatures(message, context)
    const predictions: PatternPrediction[] = []

    for (const [patternName, patternFeatures] of Object.entries(PATTERN_FEATURES)) {
      const confidence = this.calculatePatternConfidence(
        message.text,
        features,
        patternName,
        patternFeatures
      )

      if (confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        predictions.push({
          pattern: patternName,
          confidence,
          reasoning: this.generateReasoning(patternName, confidence, features),
          suggestedResponse: await this.generateSuggestedResponse(patternName, message.text),
          interventionType: this.determineInterventionType(confidence, features)
        })
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence)
  }

  private calculatePatternConfidence(
    text: string,
    features: ContextFeatures,
    patternName: string,
    patternFeatures: any
  ): number {
    let confidence = 0
    const textLower = text.toLowerCase()

    // Base pattern weight
    confidence += this.model.weights[`pattern_${patternName}`] || 0

    // Keyword matching with learned weights
    if (patternFeatures.keywords) {
      patternFeatures.keywords.forEach((keyword: string, idx: number) => {
        if (textLower.includes(keyword.toLowerCase())) {
          const keywordWeight = this.model.weights[`${patternName}_keyword_${idx}`] || 0.1
          confidence += keywordWeight
        }
      })
    }

    // Context-based adjustments
    if (patternFeatures.shortResponses && text.length < 20) {
      confidence += 0.2
    }

    if (patternFeatures.emotionalManipulation && features.emotionalIntensity > 0.5) {
      confidence += 0.15
    }

    if (patternFeatures.defensivePattern && features.responseTime > 0.8) {
      confidence += 0.1
    }

    // Previous pattern influence
    if (features.previousPatterns.includes(patternName)) {
      confidence += 0.1 // Pattern persistence
    }

    // Session phase influence
    const phaseWeight = this.model.weights['session_phase_weight'] || 0.2
    if (features.sessionPhase === 'discussion') {
      confidence *= (1 + phaseWeight)
    }

    return Math.min(Math.max(confidence, 0), 1)
  }

  private generateReasoning(patternName: string, confidence: number, features: ContextFeatures): string {
    const reasons = []

    if (confidence > 0.8) {
      reasons.push(`Strong indicators of ${patternName.replace('-', ' ')}`)
    } else if (confidence > 0.6) {
      reasons.push(`Moderate signs of ${patternName.replace('-', ' ')}`)
    } else {
      reasons.push(`Possible ${patternName.replace('-', ' ')} pattern`)
    }

    if (features.emotionalIntensity > 0.6) {
      reasons.push('high emotional intensity detected')
    }

    if (features.previousPatterns.length > 0) {
      reasons.push('building on previous patterns')
    }

    return reasons.join('; ')
  }

  private async generateSuggestedResponse(patternName: string, originalText: string): Promise<string> {
    const suggestions: Record<string, string[]> = {
      'gaslighting': [
        "I'd like to focus on the specific facts we can both agree on",
        "Let me restate what I experienced to make sure we're on the same page",
        "Can we look at this situation more objectively?"
      ],
      'blame-shifting': [
        "I hear you're frustrated. Can we focus on what we can each do differently?",
        "Let's talk about this specific situation rather than patterns",
        "What would help us both feel better about this?"
      ],
      'stonewalling': [
        "I notice you might need a break. Should we pause and come back to this?",
        "It seems like this is hard to discuss right now",
        "Would it help to approach this differently?"
      ],
      'projection': [
        "Let's focus on this specific situation",
        "I want to understand your perspective on what happened",
        "Can we talk about what each of us experienced?"
      ],
      'guilt-tripping': [
        "I can see this matters to you. Help me understand what you need",
        "Let's talk about what would work better for both of us",
        "I want to find a solution we both feel good about"
      ],
      'triangulation': [
        "I'd like to focus on what works for us two",
        "Let's talk about our own experience with this",
        "What matters most is how we handle this together"
      ]
    }

    const patternSuggestions = suggestions[patternName] || ["Let's try a different approach"]
    return patternSuggestions[Math.floor(Math.random() * patternSuggestions.length)]
  }

  private determineInterventionType(confidence: number, features: ContextFeatures): 'gentle' | 'firm' | 'redirect' {
    if (confidence > 0.8 || features.emotionalIntensity > 0.7) {
      return 'firm'
    } else if (confidence > 0.6) {
      return 'redirect'
    } else {
      return 'gentle'
    }
  }

  // Learn from user feedback
  public async learnFromFeedback(
    message: Message,
    predictedPatterns: PatternPrediction[],
    userFeedback: 'correct' | 'incorrect' | 'partial',
    actualPatterns?: string[]
  ): Promise<void> {
    const features = this.extractFeatures(message, {
      sessionData: { phase: 'discussion' } as SessionData,
      messageIndex: 0,
      previousMessages: []
    })

    // Create training example
    const example: PatternExample = {
      text: message.text,
      patterns: actualPatterns || predictedPatterns.map(p => p.pattern),
      confidence: Math.max(...predictedPatterns.map(p => p.confidence)),
      userFeedback,
      contextFeatures: features
    }

    // Add to training data
    this.model.trainingData.push(example)
    
    // Limit training data size
    if (this.model.trainingData.length > this.MAX_TRAINING_EXAMPLES) {
      this.model.trainingData = this.model.trainingData.slice(-this.MAX_TRAINING_EXAMPLES)
    }

    // Update weights based on feedback
    await this.updateWeights(example, predictedPatterns, userFeedback)

    // Update model metadata
    this.model.version += 1
    this.model.lastUpdated = Date.now()
    this.model.accuracy = this.calculateModelAccuracy()

    this.saveModel()
  }

  private async updateWeights(
    example: PatternExample,
    predictions: PatternPrediction[],
    feedback: 'correct' | 'incorrect' | 'partial'
  ): Promise<void> {
    const learningRate = feedback === 'correct' ? this.LEARNING_RATE : 
                        feedback === 'partial' ? this.LEARNING_RATE * 0.5 : 
                        -this.LEARNING_RATE * 0.8

    predictions.forEach(prediction => {
      // Update pattern weights
      const patternWeightKey = `pattern_${prediction.pattern}`
      if (this.model.weights[patternWeightKey] !== undefined) {
        this.model.weights[patternWeightKey] += learningRate * prediction.confidence
        this.model.weights[patternWeightKey] = Math.max(0, Math.min(1, this.model.weights[patternWeightKey]))
      }

      // Update keyword weights
      const patternFeatures = PATTERN_FEATURES[prediction.pattern as keyof typeof PATTERN_FEATURES]
      if (patternFeatures?.keywords) {
        patternFeatures.keywords.forEach((keyword, idx) => {
          if (example.text.toLowerCase().includes(keyword.toLowerCase())) {
            const keywordWeightKey = `${prediction.pattern}_keyword_${idx}`
            if (this.model.weights[keywordWeightKey] !== undefined) {
              this.model.weights[keywordWeightKey] += learningRate * 0.1
              this.model.weights[keywordWeightKey] = Math.max(0, Math.min(0.5, this.model.weights[keywordWeightKey]))
            }
          }
        })
      }
    })

    // Update context weights based on feedback
    if (feedback === 'correct') {
      this.model.weights['emotional_intensity'] += learningRate * 0.05 * example.contextFeatures.emotionalIntensity
      this.model.weights['response_time'] += learningRate * 0.05 * example.contextFeatures.responseTime
    }
  }

  private calculateModelAccuracy(): number {
    if (this.model.trainingData.length < 10) return this.model.accuracy

    const recentExamples = this.model.trainingData.slice(-50) // Last 50 examples
    const correctPredictions = recentExamples.filter(
      example => example.userFeedback === 'correct' || example.userFeedback === 'partial'
    ).length

    return correctPredictions / recentExamples.length
  }

  // Learn from session outcomes
  public async learnFromSessionOutcome(
    sessionData: SessionData,
    outcome: 'resolved' | 'stalemate' | 'abandoned'
  ): Promise<void> {
    // Analyze which patterns led to which outcomes
    const patternsInSession = new Set<string>()
    
    sessionData.messages.forEach(message => {
      message.detectedPatterns?.forEach(pattern => {
        patternsInSession.add(pattern)
      })
    })

    // Update pattern weights based on session outcome
    const outcomeMultiplier = outcome === 'resolved' ? 1.1 : 
                             outcome === 'stalemate' ? 1.0 : 0.9

    patternsInSession.forEach(pattern => {
      const weightKey = `pattern_${pattern}`
      if (this.model.weights[weightKey] !== undefined) {
        this.model.weights[weightKey] *= outcomeMultiplier
        this.model.weights[weightKey] = Math.max(0.1, Math.min(1, this.model.weights[weightKey]))
      }
    })

    this.model.version += 1
    this.model.lastUpdated = Date.now()
    this.saveModel()
  }

  // Get model performance metrics
  public getModelMetrics() {
    return {
      version: this.model.version,
      accuracy: this.model.accuracy,
      trainingExamples: this.model.trainingData.length,
      lastUpdated: new Date(this.model.lastUpdated),
      patternWeights: Object.entries(this.model.weights)
        .filter(([key]) => key.startsWith('pattern_'))
        .reduce((acc, [key, value]) => {
          acc[key.replace('pattern_', '')] = Math.round(value * 100) / 100
          return acc
        }, {} as Record<string, number>)
    }
  }

  // Export model for analysis
  public exportModel(): string {
    return JSON.stringify({
      ...this.model,
      exportedAt: Date.now(),
      accuracyHistory: this.calculateAccuracyHistory()
    }, null, 2)
  }

  private calculateAccuracyHistory(): Array<{ date: number; accuracy: number }> {
    const history = []
    const examples = this.model.trainingData.slice().reverse()
    
    for (let i = 10; i <= examples.length; i += 10) {
      const batch = examples.slice(0, i)
      const correct = batch.filter(ex => ex.userFeedback === 'correct' || ex.userFeedback === 'partial').length
      history.unshift({
        date: batch[0]?.contextFeatures ? Date.now() - (examples.length - i) * 1000 * 60 * 60 : Date.now(),
        accuracy: correct / batch.length
      })
    }
    
    return history
  }

  // Reset model (for testing or if performance degrades)
  public resetModel(): void {
    this.model = this.initializeModel()
    this.saveModel()
  }
}

export const machineLearningService = new MachineLearningService()