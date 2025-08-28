import { SessionData, SessionAnalytics, Message, SessionPhase } from '@/types/session'
import { ManipulationTactic } from '@/services/aiAnalyzer'

/**
 * Comprehensive conflict resolution analytics service
 * Tracks patterns, success metrics, and provides insights for improvement
 */
export class AnalyticsService {
  private static instance: AnalyticsService

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  /**
   * Generate comprehensive session analytics
   */
  async generateSessionAnalytics(sessionData: SessionData): Promise<SessionAnalytics> {
    const messages = sessionData.messages || []
    const timeSpent = this.calculateTimeSpent(sessionData)
    const patterns = await this.analyzeConversationPatterns(messages)
    const successMetrics = this.calculateSuccessMetrics(sessionData)

    const analytics: SessionAnalytics = {
      totalMessages: messages.length,
      manipulationDetected: this.extractManipulationTactics(messages),
      aiInterventions: messages.filter(m => m.author === 'ai').length,
      successMetrics,
      timeSpent,
      patterns
    }

    // Store analytics for historical tracking
    this.storeSessionAnalytics(sessionData.sessionStarted, analytics)

    return analytics
  }

  /**
   * Calculate time spent in each phase
   */
  private calculateTimeSpent(sessionData: SessionData): SessionAnalytics['timeSpent'] {
    const now = Date.now()
    const totalTime = now - sessionData.sessionStarted

    // Estimate phase durations based on message timestamps and current phase
    const messages = sessionData.messages || []
    const phaseTimestamps = this.estimatePhaseTimestamps(sessionData, messages)

    const perPhase: Record<SessionPhase, number> = {
      'welcome': 0,
      'issue-agreement': 0,
      'steel-manning': 0,
      'statement-locking': 0,
      'discussion': 0,
      'resolution': 0,
      'summary': 0
    }

    // Calculate durations between phases
    const phases: SessionPhase[] = ['welcome', 'issue-agreement', 'steel-manning', 'statement-locking', 'discussion', 'resolution', 'summary', 'analytics']
    
    for (let i = 0; i < phases.length - 1; i++) {
      const currentPhase = phases[i]
      const nextPhase = phases[i + 1]
      
      const currentTime = phaseTimestamps[currentPhase]
      const nextTime = phaseTimestamps[nextPhase]
      
      if (currentTime && nextTime) {
        perPhase[currentPhase] = nextTime - currentTime
      }
    }

    // Current phase duration
    const currentPhaseStart = phaseTimestamps[sessionData.phase]
    if (currentPhaseStart) {
      perPhase[sessionData.phase] = now - currentPhaseStart
    }

    return {
      total: totalTime,
      perPhase
    }
  }

  /**
   * Estimate when each phase started based on session progress
   */
  private estimatePhaseTimestamps(sessionData: SessionData, messages: Message[]): Partial<Record<SessionPhase, number>> {
    const timestamps: Partial<Record<SessionPhase, number>> = {
      'welcome': sessionData.sessionStarted
    }

    // Use message timestamps to infer phase transitions
    const discussionStart = messages.find(m => m.author !== 'ai')?.timestamp
    if (discussionStart) {
      timestamps['discussion'] = discussionStart
    }

    // Use session data to infer other phase completion times
    if (sessionData.agreedIssue) {
      timestamps['steel-manning'] = sessionData.sessionStarted + (60000) // Estimate 1 min for issue agreement
    }

    if (sessionData.playerOneStatement || sessionData.playerTwoStatement) {
      timestamps['statement-locking'] = (timestamps['steel-manning'] || sessionData.sessionStarted) + (120000) // Estimate 2 min for steel-manning
    }

    if (sessionData.finalResolution) {
      timestamps['summary'] = messages[messages.length - 1]?.timestamp || Date.now()
    }

    return timestamps
  }

  /**
   * Analyze conversation patterns and dynamics
   */
  private async analyzeConversationPatterns(messages: Message[]): Promise<SessionAnalytics['patterns']> {
    // Calculate message distribution
    const playerOneMessages = messages.filter(m => m.author === 'player1').length
    const playerTwoMessages = messages.filter(m => m.author === 'player2').length
    const total = playerOneMessages + playerTwoMessages

    let dominantSpeaker: 'player1' | 'player2' | 'balanced' = 'balanced'
    if (total > 0) {
      const player1Ratio = playerOneMessages / total
      if (player1Ratio > 0.7) dominantSpeaker = 'player1'
      else if (player1Ratio < 0.3) dominantSpeaker = 'player2'
    }

    // Find escalation points and breakthrough moments
    const escalationPoints: number[] = []
    const breakthroughMoments: number[] = []
    const toneProgression: Array<{timestamp: number, tone: string}> = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const analysis = message.aiAnalysis

      if (analysis) {
        // Track tone progression
        toneProgression.push({
          timestamp: message.timestamp,
          tone: analysis.overallTone
        })

        // Escalation: aggressive or manipulative tone
        if (analysis.overallTone === 'aggressive' || analysis.overallTone === 'manipulative' || analysis.hasManipulation) {
          escalationPoints.push(i)
        }

        // Breakthrough: improvement to constructive after negative tone
        if (i > 0) {
          const prevAnalysis = messages[i - 1].aiAnalysis
          if (prevAnalysis && 
              ['aggressive', 'manipulative'].includes(prevAnalysis.overallTone) && 
              analysis.overallTone === 'constructive') {
            breakthroughMoments.push(i)
          }
        }
      }
    }

    return {
      dominantSpeaker,
      escalationPoints,
      breakthroughMoments,
      toneProgression
    }
  }

  /**
   * Calculate success metrics for the session
   */
  private calculateSuccessMetrics(sessionData: SessionData): SessionAnalytics['successMetrics'] {
    const messages = sessionData.messages || []
    
    // Issue resolved if final resolution exists
    const issueResolved = Boolean(sessionData.finalResolution)

    // Consensus reached if both parties contributed to discussion and resolution
    const consensusReached = issueResolved && messages.some(m => m.author === 'player1') && messages.some(m => m.author === 'player2')

    // Communication improved if tone improved over time (more constructive, less manipulative)
    const toneAnalyses = messages
      .map(m => m.aiAnalysis?.overallTone)
      .filter((tone): tone is string => tone !== undefined)

    let communicationImproved = false
    if (toneAnalyses.length >= 4) {
      const firstHalf = toneAnalyses.slice(0, Math.floor(toneAnalyses.length / 2))
      const secondHalf = toneAnalyses.slice(Math.floor(toneAnalyses.length / 2))
      
      const firstConstructiveRatio = firstHalf.filter(tone => tone === 'constructive').length / firstHalf.length
      const secondConstructiveRatio = secondHalf.filter(tone => tone === 'constructive').length / secondHalf.length
      
      communicationImproved = secondConstructiveRatio > firstConstructiveRatio + 0.2 // Significant improvement
    }

    // Manipulation reduced if fewer manipulation tactics detected in later messages
    const manipulationReduced = communicationImproved // Similar metric for now

    return {
      issueResolved,
      consensusReached,
      communicationImproved,
      manipulationReduced
    }
  }

  /**
   * Extract manipulation tactics from all messages
   */
  private extractManipulationTactics(messages: Message[]): ManipulationTactic[] {
    return messages
      .flatMap(m => m.aiAnalysis?.detectedTactics || [])
      .filter((tactic, index, array) => 
        // Deduplicate by tactic name and description
        array.findIndex(t => t.tactic === tactic.tactic && t.description === tactic.description) === index
      )
  }

  /**
   * Extract tone progression from messages (simplified from emotional progression)
   */
  private extractToneProgression(messages: Message[]): Array<{timestamp: number, tone: string}> {
    return messages
      .map(m => ({ 
        timestamp: m.timestamp, 
        tone: m.aiAnalysis?.overallTone || 'unknown' 
      }))
      .filter(item => item.tone !== 'unknown')
  }

  /**
   * Store session analytics for historical tracking
   */
  private storeSessionAnalytics(sessionId: number, analytics: SessionAnalytics): void {
    try {
      const historicalAnalytics = this.getHistoricalAnalytics()
      historicalAnalytics[sessionId] = analytics
      
      localStorage.setItem('mixitfixit-analytics-history', JSON.stringify(historicalAnalytics))
    } catch (error) {
      console.error('Failed to store session analytics:', error)
    }
  }

  /**
   * Get historical analytics for all sessions
   */
  getHistoricalAnalytics(): Record<number, SessionAnalytics> {
    try {
      const stored = localStorage.getItem('mixitfixit-analytics-history')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  /**
   * Generate dashboard data with insights
   */
  generateDashboardData(): {
    totalSessions: number
    averageSuccessRate: number
    commonManipulationTactics: Array<{ tactic: string, count: number, trend: 'up' | 'down' | 'stable' }>
    emotionalTrends: Array<{ emotion: string, frequency: number }>
    improvementMetrics: {
      averageTimeToResolution: number
      averageToxicityReduction: number
      aiInterventionEffectiveness: number
    }
  } {
    const historicalData = this.getHistoricalAnalytics()
    const sessions = Object.values(historicalData)
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageSuccessRate: 0,
        commonManipulationTactics: [],
        emotionalTrends: [],
        improvementMetrics: {
          averageTimeToResolution: 0,
          averageToxicityReduction: 0,
          aiInterventionEffectiveness: 0
        }
      }
    }

    // Calculate success rate
    const successfulSessions = sessions.filter(s => 
      s.successMetrics.issueResolved || s.successMetrics.consensusReached
    ).length
    const averageSuccessRate = successfulSessions / sessions.length

    // Find common manipulation tactics
    const tacticCounts = new Map<string, number>()
    sessions.forEach(session => {
      session.manipulationDetected.forEach(tactic => {
        tacticCounts.set(tactic.tactic, (tacticCounts.get(tactic.tactic) || 0) + 1)
      })
    })

    const commonManipulationTactics = Array.from(tacticCounts.entries())
      .map(([tactic, count]) => ({
        tactic,
        count,
        trend: 'stable' as const // TODO: Calculate actual trends
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Analyze tone trends instead of emotional trends
    const toneCounts = new Map<string, number>()
    sessions.forEach(session => {
      session.patterns.toneProgression?.forEach(({ tone }) => {
        toneCounts.set(tone, (toneCounts.get(tone) || 0) + 1)
      })
    })

    const emotionalTrends = Array.from(toneCounts.entries())
      .map(([tone, frequency]) => ({ emotion: tone, frequency }))
      .sort((a, b) => b.frequency - a.frequency)

    // Calculate improvement metrics
    const resolvedSessions = sessions.filter(s => s.successMetrics.issueResolved)
    const averageTimeToResolution = resolvedSessions.length > 0 
      ? resolvedSessions.reduce((sum, s) => sum + s.timeSpent.total, 0) / resolvedSessions.length
      : 0

    const improvedSessions = sessions.filter(s => s.successMetrics.communicationImproved)
    const averageManipulationReduction = improvedSessions.length / sessions.length

    const totalInterventions = sessions.reduce((sum, s) => sum + s.aiInterventions, 0)
    const aiInterventionEffectiveness = totalInterventions > 0 ? averageManipulationReduction : 0

    return {
      totalSessions: sessions.length,
      averageSuccessRate,
      commonManipulationTactics,
      emotionalTrends,
      improvementMetrics: {
        averageTimeToResolution,
        averageToxicityReduction: averageManipulationReduction,
        aiInterventionEffectiveness
      }
    }
  }

  /**
   * Export session data for external analysis
   */
  exportSessionData(sessionId: number): string {
    const historicalData = this.getHistoricalAnalytics()
    const sessionAnalytics = historicalData[sessionId]
    
    if (!sessionAnalytics) {
      throw new Error('Session not found')
    }

    const exportData = {
      sessionId,
      exportDate: new Date().toISOString(),
      analytics: sessionAnalytics,
      summary: this.generateSessionSummary(sessionAnalytics)
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Generate human-readable session summary
   */
  private generateSessionSummary(analytics: SessionAnalytics): string {
    const duration = Math.round(analytics.timeSpent.total / 1000 / 60) // minutes
    const successRate = Object.values(analytics.successMetrics).filter(Boolean).length / 4 * 100

    let summary = `Session Summary:\n`
    summary += `• Duration: ${duration} minutes\n`
    summary += `• Messages exchanged: ${analytics.totalMessages}\n`
    summary += `• AI interventions: ${analytics.aiInterventions}\n`
    summary += `• Success rate: ${successRate.toFixed(0)}%\n`

    if (analytics.manipulationDetected.length > 0) {
      summary += `• Manipulation tactics detected: ${analytics.manipulationDetected.map(t => t.type).join(', ')}\n`
    }

    if (analytics.patterns.breakthroughMoments.length > 0) {
      summary += `• Breakthrough moments: ${analytics.patterns.breakthroughMoments.length}\n`
    }

    return summary
  }

  /**
   * Clear all stored analytics data
   */
  clearAnalyticsData(): void {
    localStorage.removeItem('mixitfixit-analytics-history')
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance()