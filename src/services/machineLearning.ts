import { SessionData, Message } from '../types/session'

// Machine Learning Model for Pattern Detection
export interface MLModel {
  id: string
  version: number
  accuracy: number
  trainingData: PatternExample[]
  weights: Record<string, number>
  lastUpdated: number
  optimizerState: OptimizerState
  performanceHistory: PerformanceMetric[]
  learningSchedule: LearningSchedule
}

export interface PatternExample {
  text: string
  patterns: string[]
  confidence: number
  userFeedback?: 'correct' | 'incorrect' | 'partial'
  sessionOutcome?: 'resolved' | 'stalemate' | 'abandoned'
  contextFeatures: ContextFeatures
  timestamp: number
  learningContribution: number // How much this example contributed to learning
}

export interface OptimizerState {
  algorithm: 'adam' | 'sgd' | 'rmsprop' | 'adaptive'
  baseLearningRate: number
  currentLearningRate: number
  momentum: Record<string, number>
  velocities: Record<string, number>
  gradientSquares: Record<string, number>
  beta1: number // Adam optimizer parameter
  beta2: number // Adam optimizer parameter
  epsilon: number
  decayRate: number
  warmupSteps: number
  currentStep: number
}

export interface LearningSchedule {
  type: 'constant' | 'exponential' | 'cosine' | 'adaptive'
  initialRate: number
  minRate: number
  maxRate: number
  adaptiveFactor: number
  performanceThreshold: number
  plateauPatience: number
  plateauCounter: number
}

export interface PerformanceMetric {
  timestamp: number
  accuracy: number
  precision: Record<string, number>
  recall: Record<string, number>
  f1Score: Record<string, number>
  loss: number
  learningRate: number
  convergence: number
  gradientNorm: number
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
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.4
  private readonly MAX_TRAINING_EXAMPLES = 1000
  private readonly OPTIMIZATION_INTERVAL = 50 // Optimize every N training examples
  private readonly PERFORMANCE_WINDOW = 100 // Window for performance tracking

  constructor() {
    this.model = this.loadModel() || this.initializeModel()
    this.startAutoOptimization()
  }

  private initializeModel(): MLModel {
    return {
      id: `ml-model-${Date.now()}`,
      version: 1,
      accuracy: 0.5,
      trainingData: [],
      weights: this.initializeWeights(),
      lastUpdated: Date.now(),
      optimizerState: this.initializeOptimizer(),
      performanceHistory: [],
      learningSchedule: this.initializeLearningSchedule()
    }
  }

  private initializeOptimizer(): OptimizerState {
    return {
      algorithm: 'adam',
      baseLearningRate: 0.01,
      currentLearningRate: 0.01,
      momentum: {},
      velocities: {},
      gradientSquares: {},
      beta1: 0.9,
      beta2: 0.999,
      epsilon: 1e-8,
      decayRate: 0.95,
      warmupSteps: 100,
      currentStep: 0
    }
  }

  private initializeLearningSchedule(): LearningSchedule {
    return {
      type: 'adaptive',
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      adaptiveFactor: 1.2,
      performanceThreshold: 0.001,
      plateauPatience: 20,
      plateauCounter: 0
    }
  }

  private startAutoOptimization(): void {
    // Run optimization checks periodically
    setInterval(() => {
      this.autoOptimizeModel()
    }, 5 * 60 * 1000) // Every 5 minutes
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

  // Learn from user feedback with advanced optimization
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

    // Calculate learning contribution score
    const learningContribution = this.calculateLearningContribution(
      predictedPatterns,
      userFeedback,
      features
    )

    // Create training example
    const example: PatternExample = {
      text: message.text,
      patterns: actualPatterns || predictedPatterns.map(p => p.pattern),
      confidence: Math.max(...predictedPatterns.map(p => p.confidence)),
      userFeedback,
      contextFeatures: features,
      timestamp: Date.now(),
      learningContribution
    }

    // Add to training data
    this.model.trainingData.push(example)
    
    // Limit training data size, keeping highest value examples
    if (this.model.trainingData.length > this.MAX_TRAINING_EXAMPLES) {
      this.model.trainingData.sort((a, b) => b.learningContribution - a.learningContribution)
      this.model.trainingData = this.model.trainingData.slice(0, this.MAX_TRAINING_EXAMPLES)
    }

    // Calculate gradients and update weights with adaptive optimizer
    const gradients = await this.calculateGradients(example, predictedPatterns)
    await this.updateWeightsWithOptimizer(gradients, userFeedback)

    // Update learning rate based on performance
    this.updateAdaptiveLearningRate()

    // Record performance metrics
    const metrics = await this.calculatePerformanceMetrics()
    this.model.performanceHistory.push(metrics)

    // Keep only recent performance history
    if (this.model.performanceHistory.length > this.PERFORMANCE_WINDOW) {
      this.model.performanceHistory = this.model.performanceHistory.slice(-this.PERFORMANCE_WINDOW)
    }

    // Update model metadata
    this.model.version += 1
    this.model.lastUpdated = Date.now()
    this.model.accuracy = metrics.accuracy

    // Auto-optimize if needed
    if (this.model.trainingData.length % this.OPTIMIZATION_INTERVAL === 0) {
      await this.autoOptimizeModel()
    }

    this.saveModel()
  }

  private calculateLearningContribution(
    predictions: PatternPrediction[],
    feedback: 'correct' | 'incorrect' | 'partial',
    features: ContextFeatures
  ): number {
    let contribution = 0

    // Higher contribution for surprising results (good or bad)
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    
    if (feedback === 'incorrect' && avgConfidence > 0.8) {
      contribution += 0.8 // High confidence wrong = high learning value
    } else if (feedback === 'correct' && avgConfidence < 0.5) {
      contribution += 0.6 // Low confidence right = good learning value
    } else if (feedback === 'partial') {
      contribution += 0.4 // Partial feedback always valuable
    } else {
      contribution += 0.2 // Standard learning value
    }

    // More valuable if it's a rare pattern
    const patternRarity = this.calculatePatternRarity(predictions.map(p => p.pattern))
    contribution += patternRarity * 0.3

    // More valuable if context features are unusual
    if (features.emotionalIntensity > 0.8 || features.responseTime > 0.9) {
      contribution += 0.2
    }

    return Math.min(contribution, 1)
  }

  private calculatePatternRarity(patterns: string[]): number {
    const totalPatterns = this.model.trainingData.length
    if (totalPatterns === 0) return 1

    const patternCounts = patterns.reduce((acc, pattern) => {
      const count = this.model.trainingData.filter(ex => 
        ex.patterns.includes(pattern)
      ).length
      acc[pattern] = count
      return acc
    }, {} as Record<string, number>)

    const avgRarity = Object.values(patternCounts).reduce((sum, count) => {
      return sum + (1 - count / totalPatterns)
    }, 0) / Object.values(patternCounts).length

    return avgRarity || 0.5
  }

  private async calculateGradients(
    example: PatternExample,
    predictions: PatternPrediction[]
  ): Promise<Record<string, number>> {
    const gradients: Record<string, number> = {}
    const actualError = this.calculatePredictionError(example, predictions)

    predictions.forEach(prediction => {
      const patternWeightKey = `pattern_${prediction.pattern}`
      
      // Calculate gradient based on error and confidence
      const gradient = actualError * prediction.confidence
      gradients[patternWeightKey] = gradient

      // Calculate gradients for keyword weights
      const patternFeatures = PATTERN_FEATURES[prediction.pattern as keyof typeof PATTERN_FEATURES]
      if (patternFeatures?.keywords) {
        patternFeatures.keywords.forEach((keyword, idx) => {
          if (example.text.toLowerCase().includes(keyword.toLowerCase())) {
            const keywordWeightKey = `${prediction.pattern}_keyword_${idx}`
            gradients[keywordWeightKey] = gradient * 0.1
          }
        })
      }
    })

    return gradients
  }

  private calculatePredictionError(
    example: PatternExample,
    predictions: PatternPrediction[]
  ): number {
    const feedback = example.userFeedback
    if (!feedback) return 0

    // Error calculation based on feedback type
    switch (feedback) {
      case 'correct':
        return -0.1 // Negative error (good prediction)
      case 'incorrect':
        return 1.0 // High positive error (bad prediction)
      case 'partial':
        return 0.3 // Moderate positive error
      default:
        return 0
    }
  }

  private async updateWeightsWithOptimizer(
    gradients: Record<string, number>,
    feedback: 'correct' | 'incorrect' | 'partial'
  ): Promise<void> {
    const optimizer = this.model.optimizerState
    optimizer.currentStep += 1

    Object.entries(gradients).forEach(([weightKey, gradient]) => {
      if (!this.model.weights[weightKey]) return

      // Initialize optimizer state for this weight if needed
      if (!optimizer.momentum[weightKey]) optimizer.momentum[weightKey] = 0
      if (!optimizer.velocities[weightKey]) optimizer.velocities[weightKey] = 0
      if (!optimizer.gradientSquares[weightKey]) optimizer.gradientSquares[weightKey] = 0

      switch (optimizer.algorithm) {
        case 'adam':
          this.updateWeightWithAdam(weightKey, gradient, optimizer)
          break
        case 'rmsprop':
          this.updateWeightWithRMSprop(weightKey, gradient, optimizer)
          break
        case 'sgd':
          this.updateWeightWithSGD(weightKey, gradient, optimizer)
          break
        case 'adaptive':
          this.updateWeightWithAdaptive(weightKey, gradient, optimizer, feedback)
          break
      }
    })
  }

  private updateWeightWithAdam(
    weightKey: string,
    gradient: number,
    optimizer: OptimizerState
  ): void {
    const { beta1, beta2, epsilon } = optimizer
    const t = optimizer.currentStep

    // Update biased first moment estimate
    optimizer.momentum[weightKey] = beta1 * optimizer.momentum[weightKey] + (1 - beta1) * gradient

    // Update biased second raw moment estimate  
    optimizer.velocities[weightKey] = beta2 * optimizer.velocities[weightKey] + (1 - beta2) * gradient * gradient

    // Compute bias-corrected first moment estimate
    const mHat = optimizer.momentum[weightKey] / (1 - Math.pow(beta1, t))

    // Compute bias-corrected second raw moment estimate
    const vHat = optimizer.velocities[weightKey] / (1 - Math.pow(beta2, t))

    // Update weight
    const weightUpdate = optimizer.currentLearningRate * mHat / (Math.sqrt(vHat) + epsilon)
    this.model.weights[weightKey] -= weightUpdate
    
    // Clamp weights to reasonable bounds
    this.clampWeight(weightKey)
  }

  private updateWeightWithRMSprop(
    weightKey: string,
    gradient: number,
    optimizer: OptimizerState
  ): void {
    const { decayRate, epsilon } = optimizer

    // Update exponential average of squared gradients
    optimizer.gradientSquares[weightKey] = decayRate * optimizer.gradientSquares[weightKey] + 
                                          (1 - decayRate) * gradient * gradient

    // Update weight
    const weightUpdate = optimizer.currentLearningRate * gradient / 
                        (Math.sqrt(optimizer.gradientSquares[weightKey]) + epsilon)
    this.model.weights[weightKey] -= weightUpdate
    
    this.clampWeight(weightKey)
  }

  private updateWeightWithSGD(
    weightKey: string,
    gradient: number,
    optimizer: OptimizerState
  ): void {
    // Simple SGD with momentum
    optimizer.momentum[weightKey] = 0.9 * optimizer.momentum[weightKey] + 
                                   optimizer.currentLearningRate * gradient
    this.model.weights[weightKey] -= optimizer.momentum[weightKey]
    
    this.clampWeight(weightKey)
  }

  private updateWeightWithAdaptive(
    weightKey: string,
    gradient: number,
    optimizer: OptimizerState,
    feedback: 'correct' | 'incorrect' | 'partial'
  ): void {
    // Adaptive learning rate based on feedback quality
    let adaptiveLR = optimizer.currentLearningRate

    if (feedback === 'incorrect') {
      adaptiveLR *= 1.5 // Learn faster from mistakes
    } else if (feedback === 'partial') {
      adaptiveLR *= 0.8 // More cautious with partial feedback
    }

    // Use momentum with adaptive rate
    optimizer.momentum[weightKey] = 0.9 * optimizer.momentum[weightKey] + adaptiveLR * gradient
    this.model.weights[weightKey] -= optimizer.momentum[weightKey]
    
    this.clampWeight(weightKey)
  }

  private clampWeight(weightKey: string): void {
    if (weightKey.startsWith('pattern_')) {
      this.model.weights[weightKey] = Math.max(0.1, Math.min(1.0, this.model.weights[weightKey]))
    } else {
      this.model.weights[weightKey] = Math.max(0, Math.min(0.5, this.model.weights[weightKey]))
    }
  }

  private updateAdaptiveLearningRate(): void {
    const schedule = this.model.learningSchedule
    const history = this.model.performanceHistory

    if (history.length < 10) return // Need sufficient history

    const recentPerformance = history.slice(-5)
    const prevPerformance = history.slice(-10, -5)

    const recentAvg = recentPerformance.reduce((sum, m) => sum + m.accuracy, 0) / recentPerformance.length
    const prevAvg = prevPerformance.reduce((sum, m) => sum + m.accuracy, 0) / prevPerformance.length

    const improvement = recentAvg - prevAvg

    switch (schedule.type) {
      case 'adaptive':
        this.updateAdaptiveSchedule(improvement, schedule)
        break
      case 'exponential':
        this.updateExponentialSchedule(schedule)
        break
      case 'cosine':
        this.updateCosineSchedule(schedule)
        break
    }

    this.model.optimizerState.currentLearningRate = schedule.initialRate
  }

  private updateAdaptiveSchedule(improvement: number, schedule: LearningSchedule): void {
    if (improvement < schedule.performanceThreshold) {
      schedule.plateauCounter += 1
    } else {
      schedule.plateauCounter = 0
    }

    if (schedule.plateauCounter >= schedule.plateauPatience) {
      // Reduce learning rate on plateau
      schedule.initialRate *= 0.5
      schedule.initialRate = Math.max(schedule.minRate, schedule.initialRate)
      schedule.plateauCounter = 0
    } else if (improvement > schedule.performanceThreshold * 2) {
      // Increase learning rate on good improvement
      schedule.initialRate *= schedule.adaptiveFactor
      schedule.initialRate = Math.min(schedule.maxRate, schedule.initialRate)
    }
  }

  private updateExponentialSchedule(schedule: LearningSchedule): void {
    schedule.initialRate *= 0.95 // Exponential decay
    schedule.initialRate = Math.max(schedule.minRate, schedule.initialRate)
  }

  private updateCosineSchedule(schedule: LearningSchedule): void {
    const step = this.model.optimizerState.currentStep
    const cosineDecay = 0.5 * (1 + Math.cos(Math.PI * step / 1000))
    schedule.initialRate = schedule.minRate + (schedule.maxRate - schedule.minRate) * cosineDecay
  }

  private async autoOptimizeModel(): Promise<void> {
    console.log('Running automated model optimization...')

    // Check if model needs algorithm switching
    await this.optimizeAlgorithmSelection()
    
    // Optimize hyperparameters
    await this.optimizeHyperparameters()
    
    // Clean up poor performing training examples
    this.pruneTrainingData()
    
    // Rebalance pattern weights if needed
    this.rebalancePatternWeights()

    console.log('Model optimization completed')
  }

  private async optimizeAlgorithmSelection(): Promise<void> {
    const history = this.model.performanceHistory
    if (history.length < 20) return

    const recentPerformance = history.slice(-10)
    const convergenceScore = this.calculateConvergence(recentPerformance)
    
    // Switch algorithms based on convergence characteristics
    if (convergenceScore < 0.01 && this.model.optimizerState.algorithm !== 'adam') {
      console.log('Switching to Adam optimizer for better convergence')
      this.model.optimizerState.algorithm = 'adam'
      this.model.optimizerState = { ...this.model.optimizerState, ...this.initializeOptimizer() }
    } else if (convergenceScore > 0.1 && this.model.optimizerState.algorithm !== 'adaptive') {
      console.log('Switching to adaptive optimizer for exploration')
      this.model.optimizerState.algorithm = 'adaptive'
    }
  }

  private calculateConvergence(performanceData: PerformanceMetric[]): number {
    if (performanceData.length < 2) return 1

    const accuracyVariance = this.calculateVariance(performanceData.map(p => p.accuracy))
    const lossVariance = this.calculateVariance(performanceData.map(p => p.loss))
    
    return (accuracyVariance + lossVariance) / 2
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private async optimizeHyperparameters(): Promise<void> {
    const optimizer = this.model.optimizerState
    const history = this.model.performanceHistory

    if (history.length < 10) return

    const recentAccuracy = history.slice(-5).reduce((sum, m) => sum + m.accuracy, 0) / 5

    // Optimize Adam parameters if using Adam
    if (optimizer.algorithm === 'adam') {
      if (recentAccuracy < 0.6) {
        // Increase exploration
        optimizer.beta1 = Math.max(0.8, optimizer.beta1 - 0.05)
        optimizer.beta2 = Math.max(0.95, optimizer.beta2 - 0.01)
      } else if (recentAccuracy > 0.8) {
        // Increase exploitation
        optimizer.beta1 = Math.min(0.95, optimizer.beta1 + 0.02)
        optimizer.beta2 = Math.min(0.999, optimizer.beta2 + 0.005)
      }
    }

    // Optimize learning rate boundaries
    const schedule = this.model.learningSchedule
    const avgGradientNorm = history.slice(-5).reduce((sum, m) => sum + m.gradientNorm, 0) / 5

    if (avgGradientNorm > 1.0) {
      // Large gradients, reduce max learning rate
      schedule.maxRate *= 0.8
    } else if (avgGradientNorm < 0.1) {
      // Small gradients, can increase learning rate
      schedule.maxRate = Math.min(0.1, schedule.maxRate * 1.2)
    }
  }

  private pruneTrainingData(): void {
    if (this.model.trainingData.length < 100) return

    // Remove examples that consistently mislead the model
    const threshold = this.model.trainingData.length * 0.1 // Keep 90%
    
    // Sort by learning contribution (ascending - worst first)
    this.model.trainingData.sort((a, b) => a.learningContribution - b.learningContribution)
    
    // Remove lowest contributing examples
    this.model.trainingData = this.model.trainingData.slice(Math.floor(threshold))
    
    console.log(`Pruned ${threshold} low-value training examples`)
  }

  private rebalancePatternWeights(): void {
    // Ensure no pattern weight dominates too much
    const patternWeights = Object.entries(this.model.weights)
      .filter(([key]) => key.startsWith('pattern_'))
      .map(([_, weight]) => weight)

    const maxWeight = Math.max(...patternWeights)
    const minWeight = Math.min(...patternWeights)

    if (maxWeight / minWeight > 10) {
      // Rebalance if weights are too imbalanced
      Object.keys(this.model.weights).forEach(key => {
        if (key.startsWith('pattern_')) {
          const currentWeight = this.model.weights[key]
          this.model.weights[key] = 0.3 + (currentWeight - minWeight) / (maxWeight - minWeight) * 0.4
        }
      })
      
      console.log('Rebalanced pattern weights to prevent dominance')
    }
  }

  private async calculatePerformanceMetrics(): Promise<PerformanceMetric> {
    const recentExamples = this.model.trainingData.slice(-50)
    const timestamp = Date.now()

    // Calculate accuracy
    const correctPredictions = recentExamples.filter(
      ex => ex.userFeedback === 'correct' || ex.userFeedback === 'partial'
    ).length
    const accuracy = recentExamples.length > 0 ? correctPredictions / recentExamples.length : 0.5

    // Calculate precision, recall, F1 for each pattern
    const patterns = Object.keys(PATTERN_FEATURES)
    const precision: Record<string, number> = {}
    const recall: Record<string, number> = {}
    const f1Score: Record<string, number> = {}

    patterns.forEach(pattern => {
      const tp = recentExamples.filter(ex => 
        ex.patterns.includes(pattern) && 
        (ex.userFeedback === 'correct' || ex.userFeedback === 'partial')
      ).length
      const fp = recentExamples.filter(ex => 
        ex.patterns.includes(pattern) && ex.userFeedback === 'incorrect'
      ).length
      const fn = recentExamples.filter(ex => 
        !ex.patterns.includes(pattern) && ex.userFeedback === 'incorrect'
      ).length

      precision[pattern] = tp + fp > 0 ? tp / (tp + fp) : 0
      recall[pattern] = tp + fn > 0 ? tp / (tp + fn) : 0
      f1Score[pattern] = precision[pattern] + recall[pattern] > 0 
        ? 2 * (precision[pattern] * recall[pattern]) / (precision[pattern] + recall[pattern])
        : 0
    })

    // Calculate loss (simplified cross-entropy)
    const loss = recentExamples.reduce((sum, ex) => {
      const error = ex.userFeedback === 'correct' ? 0 : 
                   ex.userFeedback === 'partial' ? 0.5 : 1
      return sum + error * error
    }, 0) / Math.max(recentExamples.length, 1)

    // Calculate gradient norm (approximation)
    const weights = Object.values(this.model.weights)
    const gradientNorm = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0)) / weights.length

    // Calculate convergence (based on recent accuracy stability)
    const convergence = this.model.performanceHistory.length >= 5
      ? this.calculateConvergence(this.model.performanceHistory.slice(-5))
      : 1

    return {
      timestamp,
      accuracy,
      precision,
      recall,
      f1Score,
      loss,
      learningRate: this.model.optimizerState.currentLearningRate,
      convergence,
      gradientNorm
    }
  }

  // Get comprehensive model performance metrics
  public getModelMetrics() {
    const recentHistory = this.model.performanceHistory.slice(-10)
    const avgAccuracy = recentHistory.length > 0 
      ? recentHistory.reduce((sum, m) => sum + m.accuracy, 0) / recentHistory.length
      : this.model.accuracy

    return {
      version: this.model.version,
      accuracy: avgAccuracy,
      currentAccuracy: this.model.accuracy,
      trainingExamples: this.model.trainingData.length,
      lastUpdated: new Date(this.model.lastUpdated),
      optimizer: {
        algorithm: this.model.optimizerState.algorithm,
        currentLearningRate: this.model.optimizerState.currentLearningRate,
        baseLearningRate: this.model.optimizerState.baseLearningRate,
        currentStep: this.model.optimizerState.currentStep
      },
      learningSchedule: {
        type: this.model.learningSchedule.type,
        currentRate: this.model.learningSchedule.initialRate,
        minRate: this.model.learningSchedule.minRate,
        maxRate: this.model.learningSchedule.maxRate,
        plateauCounter: this.model.learningSchedule.plateauCounter
      },
      patternWeights: Object.entries(this.model.weights)
        .filter(([key]) => key.startsWith('pattern_'))
        .reduce((acc, [key, value]) => {
          acc[key.replace('pattern_', '')] = Math.round(value * 100) / 100
          return acc
        }, {} as Record<string, number>),
      performanceMetrics: recentHistory.length > 0 ? {
        averageLoss: recentHistory.reduce((sum, m) => sum + m.loss, 0) / recentHistory.length,
        convergence: recentHistory[recentHistory.length - 1]?.convergence || 0,
        gradientNorm: recentHistory[recentHistory.length - 1]?.gradientNorm || 0,
        patternPrecision: this.calculateAveragePatternMetrics(recentHistory, 'precision'),
        patternRecall: this.calculateAveragePatternMetrics(recentHistory, 'recall'),
        patternF1Score: this.calculateAveragePatternMetrics(recentHistory, 'f1Score')
      } : undefined
    }
  }

  private calculateAveragePatternMetrics(
    history: PerformanceMetric[], 
    metric: 'precision' | 'recall' | 'f1Score'
  ): Record<string, number> {
    const patterns = Object.keys(PATTERN_FEATURES)
    const averages: Record<string, number> = {}

    patterns.forEach(pattern => {
      const values = history
        .map(h => h[metric][pattern] || 0)
        .filter(v => !isNaN(v))
      
      averages[pattern] = values.length > 0 
        ? values.reduce((sum, val) => sum + val, 0) / values.length
        : 0
    })

    return averages
  }

  // Export enhanced model data
  public exportModel(): string {
    return JSON.stringify({
      ...this.model,
      exportedAt: Date.now(),
      metrics: this.getModelMetrics(),
      optimizationHistory: this.model.performanceHistory.slice(-50)
    }, null, 2)
  }

  // Manual model optimization trigger
  public async triggerOptimization(): Promise<void> {
    console.log('Manually triggering model optimization...')
    await this.autoOptimizeModel()
    this.saveModel()
  }

  // Get optimization recommendations
  public getOptimizationRecommendations(): Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    description: string
    action: string
  }> {
    const recommendations = []
    const history = this.model.performanceHistory
    const optimizer = this.model.optimizerState
    const schedule = this.model.learningSchedule

    // Check for convergence issues
    if (history.length >= 10) {
      const recentConvergence = history.slice(-5).reduce((sum, m) => sum + m.convergence, 0) / 5
      if (recentConvergence < 0.01) {
        recommendations.push({
          type: 'convergence',
          priority: 'high',
          description: 'Model has converged and may benefit from exploration',
          action: 'Increase learning rate or switch to adaptive optimizer'
        })
      }
    }

    // Check learning rate issues
    if (schedule.plateauCounter >= schedule.plateauPatience * 0.8) {
      recommendations.push({
        type: 'plateau',
        priority: 'medium',
        description: 'Learning appears to have plateaued',
        action: 'Reduce learning rate or add more diverse training data'
      })
    }

    // Check for weight imbalance
    const patternWeights = Object.entries(this.model.weights)
      .filter(([key]) => key.startsWith('pattern_'))
      .map(([_, weight]) => weight)
    
    if (patternWeights.length > 0) {
      const maxWeight = Math.max(...patternWeights)
      const minWeight = Math.min(...patternWeights)
      
      if (maxWeight / minWeight > 5) {
        recommendations.push({
          type: 'weights',
          priority: 'medium',
          description: 'Pattern weights are imbalanced',
          action: 'Rebalance weights or collect more training data for underrepresented patterns'
        })
      }
    }

    // Check training data quality
    const lowQualityExamples = this.model.trainingData.filter(
      ex => ex.learningContribution < 0.2
    ).length
    
    if (lowQualityExamples > this.model.trainingData.length * 0.3) {
      recommendations.push({
        type: 'data-quality',
        priority: 'low',
        description: 'High proportion of low-value training examples',
        action: 'Prune training data or collect higher quality examples'
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // Learn from session outcomes with enhanced ML insights
  public async learnFromSessionOutcome(
    sessionData: SessionData,
    outcome: 'resolved' | 'stalemate' | 'abandoned'
  ): Promise<void> {
    // Analyze which patterns led to which outcomes
    const patternsInSession = new Set<string>()
    const patternFrequency: Record<string, number> = {}
    
    sessionData.messages.forEach(message => {
      message.detectedPatterns?.forEach(pattern => {
        patternsInSession.add(pattern)
        patternFrequency[pattern] = (patternFrequency[pattern] || 0) + 1
      })
    })

    // Create session-level training examples
    Array.from(patternsInSession).forEach(pattern => {
      const sessionExample: PatternExample = {
        text: `Session with ${Array.from(patternsInSession).join(', ')} patterns`,
        patterns: [pattern],
        confidence: Math.min(patternFrequency[pattern] / sessionData.messages.length, 1),
        sessionOutcome: outcome,
        contextFeatures: {
          messageLength: sessionData.messages.reduce((sum, m) => sum + m.text.length, 0) / sessionData.messages.length,
          emotionalIntensity: 0.5, // Average estimate
          responseTime: 0.5, // Average estimate
          sequencePosition: 0.5,
          previousPatterns: [],
          sessionPhase: 'discussion',
          playerRole: 'both'
        },
        timestamp: Date.now(),
        learningContribution: outcome === 'resolved' ? 0.8 : outcome === 'stalemate' ? 0.4 : 0.2
      }

      this.model.trainingData.push(sessionExample)
    })

    // Update pattern weights based on session outcome with ML insights
    const outcomeMultiplier = outcome === 'resolved' ? 0.05 : 
                             outcome === 'stalemate' ? -0.02 : -0.1

    const gradients: Record<string, number> = {}

    patternsInSession.forEach(pattern => {
      const weightKey = `pattern_${pattern}`
      const frequency = patternFrequency[pattern] / sessionData.messages.length
      gradients[weightKey] = outcomeMultiplier * frequency
    })

    // Apply gradients with current optimizer
    await this.updateWeightsWithOptimizer(gradients, outcome === 'resolved' ? 'correct' : 'incorrect')

    this.model.version += 1
    this.model.lastUpdated = Date.now()
    this.saveModel()
  }

  // Reset model (for testing or if performance degrades)
  public resetModel(): void {
    this.model = this.initializeModel()
    this.saveModel()
  }
}

export const machineLearningService = new MachineLearningService()