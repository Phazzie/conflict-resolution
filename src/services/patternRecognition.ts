import { SessionData, Message } from '../types/session'

// Core pattern types that we can detect
export interface RelationshipPattern {
  id: string
  type: PatternType
  severity: 'low' | 'medium' | 'high'
  frequency: number
  firstDetected: number
  lastSeen: number
  description: string
  examples: string[]
  suggestedActions: string[]
}

export type PatternType = 
  | 'communication-breakdown'
  | 'recurring-trigger'
  | 'defensive-response'
  | 'escalation-cycle'
  | 'avoidance-pattern'
  | 'blame-shifting'
  | 'unresolved-core-issue'
  | 'emotional-flooding'
  | 'stonewalling-tendency'
  | 'assumption-making'

export interface PatternAnalysis {
  patterns: RelationshipPattern[]
  insights: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
  progressIndicators: string[]
}

export class PatternRecognitionService {
  private patterns: Map<string, RelationshipPattern> = new Map()

  /**
   * Analyze a session for relationship patterns
   */
  async analyzeSession(sessionData: SessionData): Promise<PatternAnalysis> {
    const detectedPatterns: RelationshipPattern[] = []

    // Analyze different aspects of the session
    detectedPatterns.push(...this.detectCommunicationPatterns(sessionData))
    detectedPatterns.push(...this.detectTriggerPatterns(sessionData))
    detectedPatterns.push(...this.detectBehavioralPatterns(sessionData))
    detectedPatterns.push(...this.detectResolutionPatterns(sessionData))

    // Update persistent pattern tracking
    this.updatePatternHistory(detectedPatterns)

    // Generate insights and recommendations
    const insights = this.generateInsights(detectedPatterns)
    const recommendations = this.generateRecommendations(detectedPatterns)
    const riskLevel = this.assessRiskLevel(detectedPatterns)
    const progressIndicators = this.identifyProgress(detectedPatterns)

    return {
      patterns: detectedPatterns,
      insights,
      recommendations,
      riskLevel,
      progressIndicators
    }
  }

  /**
   * Get historical patterns for trend analysis
   */
  getHistoricalPatterns(): RelationshipPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Detect communication-related patterns
   */
  private detectCommunicationPatterns(sessionData: SessionData): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []
    const messages = sessionData.messages || []

    // Check for communication breakdown indicators
    const hasDefensiveLanguage = messages.some(msg => 
      this.containsDefensiveLanguage(msg.content)
    )

    if (hasDefensiveLanguage) {
      patterns.push({
        id: 'defensive-communication',
        type: 'defensive-response',
        severity: 'medium',
        frequency: this.countDefensiveResponses(messages),
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: 'Defensive communication patterns detected',
        examples: messages
          .filter(msg => this.containsDefensiveLanguage(msg.content))
          .slice(0, 3)
          .map(msg => msg.content.substring(0, 100) + '...'),
        suggestedActions: [
          'Practice "I" statements instead of "you" accusations',
          'Take breaks when feeling defensive',
          'Focus on understanding before being understood'
        ]
      })
    }

    // Check for assumption-making patterns
    const hasAssumptions = messages.some(msg => 
      this.containsAssumptiveLanguage(msg.content)
    )

    if (hasAssumptions) {
      patterns.push({
        id: 'assumption-making',
        type: 'assumption-making',
        severity: 'medium',
        frequency: this.countAssumptions(messages),
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: 'Pattern of making assumptions instead of asking questions',
        examples: messages
          .filter(msg => this.containsAssumptiveLanguage(msg.content))
          .slice(0, 2)
          .map(msg => msg.content.substring(0, 100) + '...'),
        suggestedActions: [
          'Ask clarifying questions before making assumptions',
          'Use phrases like "Help me understand..." or "It seems like..."',
          'Practice curiosity over certainty'
        ]
      })
    }

    return patterns
  }

  /**
   * Detect recurring trigger patterns
   */
  private detectTriggerPatterns(sessionData: SessionData): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []
    
    // Analyze the agreed issue for common trigger themes
    const issue = sessionData.agreedIssue?.toLowerCase() || ''
    const triggerKeywords = this.identifyTriggerKeywords(issue)

    if (triggerKeywords.length > 0) {
      const triggerType = this.categorizeTrigger(triggerKeywords)
      
      patterns.push({
        id: `trigger-${triggerType}`,
        type: 'recurring-trigger',
        severity: 'high',
        frequency: 1,
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: `Recurring conflict around ${triggerType} themes`,
        examples: [issue.substring(0, 200)],
        suggestedActions: [
          'Identify the underlying need behind this trigger',
          'Discuss this topic when both parties are calm',
          'Consider if this connects to deeper relationship values'
        ]
      })
    }

    return patterns
  }

  /**
   * Detect behavioral patterns during conflict
   */
  private detectBehavioralPatterns(sessionData: SessionData): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []
    const messages = sessionData.messages || []

    // Check for escalation patterns
    const escalationScore = this.calculateEscalationScore(messages)
    if (escalationScore > 0.6) {
      patterns.push({
        id: 'escalation-cycle',
        type: 'escalation-cycle',
        severity: 'high',
        frequency: 1,
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: 'Tendency for conflicts to escalate rather than de-escalate',
        examples: ['Message intensity increased throughout discussion'],
        suggestedActions: [
          'Agree on a cooling-off signal',
          'Practice de-escalation techniques',
          'Take breaks when emotions run high'
        ]
      })
    }

    // Check for avoidance patterns
    const hasAvoidance = this.detectAvoidanceBehavior(sessionData)
    if (hasAvoidance) {
      patterns.push({
        id: 'avoidance-pattern',
        type: 'avoidance-pattern',
        severity: 'medium',
        frequency: 1,
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: 'Pattern of avoiding direct discussion of issues',
        examples: ['Difficulty agreeing on the core issue', 'Vague or deflective responses'],
        suggestedActions: [
          'Practice staying present during difficult conversations',
          'Acknowledge the discomfort but stay engaged',
          'Break down big issues into smaller, manageable parts'
        ]
      })
    }

    return patterns
  }

  /**
   * Detect patterns in resolution attempts
   */
  private detectResolutionPatterns(sessionData: SessionData): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []

    // Check if session reached resolution
    const hasResolution = sessionData.finalResolution && sessionData.finalResolution.length > 0
    
    if (!hasResolution && sessionData.phase !== 'welcome' && sessionData.phase !== 'issue-agreement') {
      patterns.push({
        id: 'resolution-difficulty',
        type: 'unresolved-core-issue',
        severity: 'medium',
        frequency: 1,
        firstDetected: Date.now(),
        lastSeen: Date.now(),
        description: 'Difficulty reaching mutually acceptable resolutions',
        examples: ['Session ended without clear resolution'],
        suggestedActions: [
          'Focus on small, achievable agreements first',
          'Identify shared values and common ground',
          'Consider if professional mediation would help'
        ]
      })
    }

    return patterns
  }

  /**
   * Check for defensive language patterns
   */
  private containsDefensiveLanguage(content: string): boolean {
    const defensivePatterns = [
      /\byou always\b/i,
      /\byou never\b/i,
      /\bthat's not true\b/i,
      /\byou're wrong\b/i,
      /\bi don't do that\b/i,
      /\bthat's not what i meant\b/i,
      /\byou're being\b/i,
      /\byou made me\b/i
    ]
    
    return defensivePatterns.some(pattern => pattern.test(content))
  }

  /**
   * Check for assumptive language
   */
  private containsAssumptiveLanguage(content: string): boolean {
    const assumptivePatterns = [
      /\byou think\b/i,
      /\byou feel like\b/i,
      /\byou want\b/i,
      /\byou don't care\b/i,
      /\byou're trying to\b/i,
      /\byou obviously\b/i,
      /\byou clearly\b/i
    ]
    
    return assumptivePatterns.some(pattern => pattern.test(content))
  }

  /**
   * Count defensive responses in messages
   */
  private countDefensiveResponses(messages: Message[]): number {
    return messages.filter(msg => this.containsDefensiveLanguage(msg.content)).length
  }

  /**
   * Count assumptions in messages
   */
  private countAssumptions(messages: Message[]): number {
    return messages.filter(msg => this.containsAssumptiveLanguage(msg.content)).length
  }

  /**
   * Identify trigger keywords in the issue
   */
  private identifyTriggerKeywords(issue: string): string[] {
    const keywords = []
    
    // Communication triggers
    if (/listen|hear|understand|talk|communicate/i.test(issue)) {
      keywords.push('communication')
    }
    
    // Time/attention triggers
    if (/time|attention|priority|busy|work/i.test(issue)) {
      keywords.push('attention')
    }
    
    // Responsibility triggers
    if (/chore|help|share|responsibility|fair/i.test(issue)) {
      keywords.push('responsibility')
    }
    
    // Emotional triggers
    if (/respect|appreciate|value|support|care/i.test(issue)) {
      keywords.push('emotional-needs')
    }
    
    // Control triggers
    if (/control|decide|choice|freedom|space/i.test(issue)) {
      keywords.push('autonomy')
    }
    
    return keywords
  }

  /**
   * Categorize the primary trigger type
   */
  private categorizeTrigger(keywords: string[]): string {
    const counts = keywords.reduce((acc, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general'
  }

  /**
   * Calculate escalation score based on message patterns
   */
  private calculateEscalationScore(messages: Message[]): number {
    if (messages.length < 2) return 0
    
    let escalationEvents = 0
    let totalComparisons = 0
    
    for (let i = 1; i < messages.length; i++) {
      const prevIntensity = this.getMessageIntensity(messages[i - 1])
      const currentIntensity = this.getMessageIntensity(messages[i])
      
      if (currentIntensity > prevIntensity) {
        escalationEvents++
      }
      totalComparisons++
    }
    
    return totalComparisons > 0 ? escalationEvents / totalComparisons : 0
  }

  /**
   * Estimate message intensity based on content
   */
  private getMessageIntensity(message: Message): number {
    const content = message.content.toLowerCase()
    let intensity = 0
    
    // Check for caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    intensity += capsRatio * 0.3
    
    // Check for intense words
    const intenseWords = ['never', 'always', 'hate', 'stupid', 'ridiculous', 'insane']
    intenseWords.forEach(word => {
      if (content.includes(word)) intensity += 0.2
    })
    
    // Check for repetitive punctuation
    if (/[!?]{2,}/.test(content)) intensity += 0.2
    
    return Math.min(intensity, 1) // Cap at 1
  }

  /**
   * Detect avoidance behavior patterns
   */
  private detectAvoidanceBehavior(sessionData: SessionData): boolean {
    // Check if they had trouble agreeing on an issue
    const issueAgreementTroubles = !sessionData.agreedIssue || sessionData.agreedIssue.length < 10
    
    // Check for vague statements
    const hasVagueStatements = [
      sessionData.playerOneStatement,
      sessionData.playerTwoStatement
    ].some(statement => statement && statement.length < 50)
    
    // Check for minimal discussion
    const minimalDiscussion = (sessionData.messages || []).length < 3
    
    return issueAgreementTroubles || hasVagueStatements || minimalDiscussion
  }

  /**
   * Update pattern history with new detections
   */
  private updatePatternHistory(newPatterns: RelationshipPattern[]): void {
    newPatterns.forEach(pattern => {
      const existing = this.patterns.get(pattern.id)
      
      if (existing) {
        // Update existing pattern
        existing.frequency += 1
        existing.lastSeen = Date.now()
        existing.severity = this.escalateSeverity(existing.severity, pattern.severity)
      } else {
        // Add new pattern
        this.patterns.set(pattern.id, pattern)
      }
    })
  }

  /**
   * Escalate severity based on recurrence
   */
  private escalateSeverity(current: string, detected: string): 'low' | 'medium' | 'high' {
    const severityLevels = { low: 1, medium: 2, high: 3 }
    const maxSeverity = Math.max(
      severityLevels[current as keyof typeof severityLevels],
      severityLevels[detected as keyof typeof severityLevels]
    )
    
    return Object.entries(severityLevels)
      .find(([, level]) => level === maxSeverity)?.[0] as 'low' | 'medium' | 'high' || 'low'
  }

  /**
   * Generate insights from detected patterns
   */
  private generateInsights(patterns: RelationshipPattern[]): string[] {
    const insights: string[] = []
    
    if (patterns.length === 0) {
      insights.push("Good news! No major recurring patterns detected in this session.")
      return insights
    }
    
    const highSeverityPatterns = patterns.filter(p => p.severity === 'high')
    if (highSeverityPatterns.length > 0) {
      insights.push(`Detected ${highSeverityPatterns.length} high-priority pattern(s) that may need immediate attention.`)
    }
    
    const communicationPatterns = patterns.filter(p => 
      ['defensive-response', 'assumption-making', 'communication-breakdown'].includes(p.type)
    )
    
    if (communicationPatterns.length >= 2) {
      insights.push("Multiple communication challenges identified. Consider focusing on listening skills and emotional regulation.")
    }
    
    const behavioralPatterns = patterns.filter(p => 
      ['escalation-cycle', 'avoidance-pattern', 'stonewalling-tendency'].includes(p.type)
    )
    
    if (behavioralPatterns.length > 0) {
      insights.push("Behavioral patterns suggest working on conflict management strategies could be beneficial.")
    }
    
    return insights
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: RelationshipPattern[]): string[] {
    const recommendations: string[] = []
    
    // Collect all suggested actions
    const allActions = patterns.flatMap(p => p.suggestedActions)
    
    // Get unique recommendations and prioritize by frequency
    const actionCounts = allActions.reduce((acc, action) => {
      acc[action] = (acc[action] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const prioritizedActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 recommendations
      .map(([action]) => action)
    
    if (prioritizedActions.length > 0) {
      recommendations.push(...prioritizedActions)
    } else {
      recommendations.push("Continue practicing healthy communication patterns.")
    }
    
    return recommendations
  }

  /**
   * Assess overall risk level
   */
  private assessRiskLevel(patterns: RelationshipPattern[]): 'low' | 'medium' | 'high' {
    const highSeverityCount = patterns.filter(p => p.severity === 'high').length
    const mediumSeverityCount = patterns.filter(p => p.severity === 'medium').length
    
    if (highSeverityCount >= 2) return 'high'
    if (highSeverityCount >= 1 || mediumSeverityCount >= 3) return 'medium'
    return 'low'
  }

  /**
   * Identify progress indicators
   */
  private identifyProgress(patterns: RelationshipPattern[]): string[] {
    const indicators: string[] = []
    
    // Check for positive signs
    const hasResolutionFocus = patterns.some(p => p.type !== 'unresolved-core-issue')
    if (hasResolutionFocus) {
      indicators.push("Both parties engaged in the resolution process")
    }
    
    const lowSeverityPatterns = patterns.filter(p => p.severity === 'low')
    if (lowSeverityPatterns.length > patterns.length / 2) {
      indicators.push("Most detected patterns are low-severity, showing good conflict management")
    }
    
    if (patterns.length < 3) {
      indicators.push("Limited conflict patterns suggest healthy relationship dynamics")
    }
    
    if (indicators.length === 0) {
      indicators.push("Awareness of these patterns is the first step toward improvement")
    }
    
    return indicators
  }
}

// Export singleton instance
export const patternRecognitionService = new PatternRecognitionService()