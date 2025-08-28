import { 
  SessionHistoryEntry, 
  HistoryAnalytics, 
  RelationshipPattern, 
  RecurringIssue, 
  CommunicationMetrics,
  ProgressMetrics,
  TimeBasedAnalysis,
  RelationshipInsights,
  PatternRecognitionResult,
  TrendAnalysis
} from '../types/history'
import { SessionData, SessionAnalytics } from '../types/session'
import { ManipulationTactic } from './aiAnalyzer'

class SessionHistoryService {
  private readonly STORAGE_KEY = 'mixitfixit-session-history'
  private readonly MAX_HISTORY_ENTRIES = 100

  /**
   * Save a completed session to history
   */
  async saveSession(sessionData: SessionData, outcome: 'resolved' | 'stalemate' | 'abandoned'): Promise<string> {
    const history = await this.getHistory()
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    
    const entry: SessionHistoryEntry = {
      id: sessionId,
      sessionData: { ...sessionData },
      completedAt: Date.now(),
      outcome,
      participants: ['player1', 'player2'],
      duration: Date.now() - sessionData.sessionStarted,
      issueCategory: this.categorizeIssue(sessionData.agreedIssue),
      satisfactionRating: {
        player1: 0, // Will be updated via feedback
        player2: 0
      }
    }

    history.push(entry)
    
    // Maintain max history size
    if (history.length > this.MAX_HISTORY_ENTRIES) {
      history.splice(0, history.length - this.MAX_HISTORY_ENTRIES)
    }

    await this.saveHistory(history)
    return sessionId
  }

  /**
   * Get all session history entries
   */
  async getHistory(): Promise<SessionHistoryEntry[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load session history:', error)
      return []
    }
  }

  /**
   * Update satisfaction rating for a session
   */
  async updateSatisfactionRating(sessionId: string, player: 'player1' | 'player2', rating: number): Promise<void> {
    const history = await this.getHistory()
    const entry = history.find(h => h.id === sessionId)
    
    if (entry && entry.satisfactionRating) {
      entry.satisfactionRating[player] = rating
      await this.saveHistory(history)
    }
  }

  /**
   * Generate comprehensive analytics from session history
   */
  async generateHistoryAnalytics(): Promise<HistoryAnalytics> {
    const history = await this.getHistory()
    
    if (history.length === 0) {
      return this.getEmptyAnalytics()
    }

    const recurringIssues = await this.identifyRecurringIssues(history)
    const relationshipPatterns = await this.identifyRelationshipPatterns(history)
    const communicationMetrics = await this.analyzeCommunicationMetrics(history)
    const progressMetrics = await this.calculateProgressMetrics(history)
    const timeBasedAnalysis = await this.analyzeTimeTrends(history)
    const insights = await this.generateRelationshipInsights(history, relationshipPatterns, progressMetrics)

    return {
      totalSessions: history.length,
      dateRange: {
        first: Math.min(...history.map(h => h.sessionData.sessionStarted)),
        last: Math.max(...history.map(h => h.completedAt))
      },
      recurringIssues,
      relationshipPatterns,
      communicationMetrics,
      progressMetrics,
      timeBasedAnalysis,
      insights,
      generatedAt: Date.now()
    }
  }

  /**
   * Identify patterns in relationship dynamics
   */
  private async identifyRelationshipPatterns(history: SessionHistoryEntry[]): Promise<RelationshipPattern[]> {
    const patterns: RelationshipPattern[] = []

    // Pattern: Unresolved escalation
    const escalationPattern = this.findEscalationPattern(history)
    if (escalationPattern) {
      patterns.push(escalationPattern)
    }

    // Pattern: Communication breakdown
    const communicationPattern = this.findCommunicationBreakdownPattern(history)
    if (communicationPattern) {
      patterns.push(communicationPattern)
    }

    // Pattern: Manipulation tactics
    const manipulationPattern = this.findManipulationPattern(history)
    if (manipulationPattern) {
      patterns.push(manipulationPattern)
    }

    // Pattern: Resolution avoidance
    const avoidancePattern = this.findAvoidancePattern(history)
    if (avoidancePattern) {
      patterns.push(avoidancePattern)
    }

    return patterns
  }

  /**
   * Identify recurring issues across sessions
   */
  private async identifyRecurringIssues(history: SessionHistoryEntry[]): Promise<RecurringIssue[]> {
    const issueGroups = new Map<string, SessionHistoryEntry[]>()
    
    // Group sessions by similar issues using semantic similarity
    history.forEach(entry => {
      const normalizedIssue = this.normalizeIssue(entry.sessionData.agreedIssue)
      const existingGroup = Array.from(issueGroups.keys()).find(key => 
        this.calculateSimilarity(key, normalizedIssue) > 0.7
      )
      
      if (existingGroup) {
        issueGroups.get(existingGroup)!.push(entry)
      } else {
        issueGroups.set(normalizedIssue, [entry])
      }
    })

    const recurringIssues: RecurringIssue[] = []
    
    issueGroups.forEach((sessions, normalizedIssue) => {
      if (sessions.length > 1) { // Only recurring issues
        const resolved = sessions.filter(s => s.outcome === 'resolved')
        
        recurringIssues.push({
          issueId: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          normalizedIssue,
          originalIssues: sessions.map(s => s.sessionData.agreedIssue),
          frequency: sessions.length,
          resolutionRate: resolved.length / sessions.length,
          averageDuration: sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length,
          lastDiscussed: Math.max(...sessions.map(s => s.completedAt)),
          patterns: {
            commonTriggers: this.extractCommonTriggers(sessions),
            escalationPoints: this.extractEscalationPoints(sessions),
            successfulResolutions: resolved.map(s => s.sessionData.finalResolution).filter(Boolean)
          }
        })
      }
    })

    return recurringIssues.sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Analyze communication patterns and effectiveness
   */
  private async analyzeCommunicationMetrics(history: SessionHistoryEntry[]): Promise<CommunicationMetrics> {
    const allMessages = history.flatMap(h => h.sessionData.messages)
    const humanMessages = allMessages.filter(m => m.author !== 'ai')
    
    if (humanMessages.length === 0) {
      return {
        averageResponseTime: 0,
        messageLength: 0,
        emotionalTone: { positive: 0, negative: 0, neutral: 100 },
        manipulationTactics: [],
        aiInterventionEffectiveness: 0,
        steelManningAccuracy: 0
      }
    }

    // Calculate response times
    const responseTimes: number[] = []
    for (let i = 1; i < humanMessages.length; i++) {
      if (humanMessages[i].author !== humanMessages[i-1].author) {
        responseTimes.push(humanMessages[i].timestamp - humanMessages[i-1].timestamp)
      }
    }

    // Analyze manipulation tactics
    const manipulationTactics = this.analyzeManipulationTactics(history)
    
    // Calculate AI intervention effectiveness
    const aiInterventions = allMessages.filter(m => m.author === 'ai').length
    const resolvedSessions = history.filter(h => h.outcome === 'resolved').length
    const aiEffectiveness = aiInterventions > 0 ? (resolvedSessions / history.length) * 100 : 0

    return {
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      messageLength: humanMessages.reduce((sum, m) => sum + m.content.length, 0) / humanMessages.length,
      emotionalTone: this.analyzeTone(humanMessages),
      manipulationTactics,
      aiInterventionEffectiveness: aiEffectiveness,
      steelManningAccuracy: this.calculateSteelManningAccuracy(history)
    }
  }

  /**
   * Calculate progress metrics over time
   */
  private async calculateProgressMetrics(history: SessionHistoryEntry[]): Promise<ProgressMetrics> {
    if (history.length === 0) {
      return {
        resolutionRate: 0,
        consensusRate: 0,
        sessionCompletionRate: 0,
        averageSatisfaction: 0,
        improvementTrend: 'stable',
        streaks: { current: 0, best: 0, type: 'resolution' }
      }
    }

    const resolved = history.filter(h => h.outcome === 'resolved')
    const completed = history.filter(h => h.outcome !== 'abandoned')
    
    const satisfactionRatings = history
      .flatMap(h => h.satisfactionRating ? [h.satisfactionRating.player1, h.satisfactionRating.player2] : [])
      .filter(rating => rating > 0)

    // Calculate improvement trend
    const recentSessions = history.slice(-10) // Last 10 sessions
    const olderSessions = history.slice(0, -10)
    const recentResolutionRate = recentSessions.filter(h => h.outcome === 'resolved').length / recentSessions.length
    const olderResolutionRate = olderSessions.length > 0 ? 
      olderSessions.filter(h => h.outcome === 'resolved').length / olderSessions.length : 0

    let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentResolutionRate > olderResolutionRate + 0.1) {
      improvementTrend = 'improving'
    } else if (recentResolutionRate < olderResolutionRate - 0.1) {
      improvementTrend = 'declining'
    }

    // Calculate streaks
    const streaks = this.calculateStreaks(history)

    return {
      resolutionRate: (resolved.length / history.length) * 100,
      consensusRate: (completed.length / history.length) * 100,
      sessionCompletionRate: (completed.length / history.length) * 100,
      averageSatisfaction: satisfactionRatings.length > 0 ? 
        satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length : 0,
      improvementTrend,
      streaks
    }
  }

  /**
   * Analyze temporal patterns and trends
   */
  private async analyzeTimeTrends(history: SessionHistoryEntry[]): Promise<TimeBasedAnalysis> {
    // Group by weeks
    const weeklyData = new Map<string, SessionHistoryEntry[]>()
    const monthlyData = new Map<string, SessionHistoryEntry[]>()
    
    history.forEach(entry => {
      const date = new Date(entry.completedAt)
      const weekKey = this.getWeekKey(date)
      const monthKey = this.getMonthKey(date)
      
      if (!weeklyData.has(weekKey)) weeklyData.set(weekKey, [])
      if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, [])
      
      weeklyData.get(weekKey)!.push(entry)
      monthlyData.get(monthKey)!.push(entry)
    })

    const weeklyTrends = Array.from(weeklyData.entries()).map(([week, sessions]) => ({
      week,
      sessionsCount: sessions.length,
      resolutionRate: (sessions.filter(s => s.outcome === 'resolved').length / sessions.length) * 100,
      averageSatisfaction: this.calculateAverageSatisfaction(sessions)
    }))

    const monthlyPatterns = Array.from(monthlyData.entries()).map(([month, sessions]) => ({
      month,
      commonIssues: this.extractCommonIssues(sessions),
      progressScore: this.calculateProgressScore(sessions)
    }))

    return {
      weeklyTrends,
      monthlyPatterns,
      seasonalTrends: this.calculateSeasonalTrends(history)
    }
  }

  /**
   * Generate relationship insights and recommendations
   */
  private async generateRelationshipInsights(
    history: SessionHistoryEntry[], 
    patterns: RelationshipPattern[], 
    progress: ProgressMetrics
  ): Promise<RelationshipInsights> {
    const highSeverityPatterns = patterns.filter(p => p.severity === 'high')
    const worseningPatterns = patterns.filter(p => p.trend === 'worsening')
    
    let overallHealth: RelationshipInsights['overallHealth'] = 'good'
    
    if (highSeverityPatterns.length > 0 || progress.resolutionRate < 30) {
      overallHealth = 'critical'
    } else if (worseningPatterns.length > 0 || progress.resolutionRate < 50) {
      overallHealth = 'concerning'
    } else if (progress.resolutionRate > 80 && progress.improvementTrend === 'improving') {
      overallHealth = 'excellent'
    }

    const strengthAreas = this.identifyStrengthAreas(history, progress)
    const growthAreas = this.identifyGrowthAreas(patterns, progress)
    const recommendations = await this.generateRecommendations(patterns, progress, history)
    const riskFactors = this.identifyRiskFactors(patterns, progress)

    return {
      overallHealth,
      strengthAreas,
      growthAreas,
      recommendations,
      riskFactors
    }
  }

  // Helper methods
  private categorizeIssue(issue: string): string {
    const categories = {
      'communication': ['listen', 'hear', 'talk', 'speak', 'communicate', 'understand'],
      'trust': ['trust', 'honest', 'lie', 'truth', 'believe'],
      'time': ['time', 'busy', 'schedule', 'priority', 'attention'],
      'responsibility': ['responsibility', 'chore', 'work', 'help', 'support'],
      'emotions': ['feel', 'emotion', 'angry', 'sad', 'frustrated', 'upset'],
      'intimacy': ['intimate', 'close', 'affection', 'love', 'romance'],
      'boundaries': ['boundary', 'space', 'privacy', 'respect', 'limit'],
      'conflict': ['argue', 'fight', 'conflict', 'disagree', 'dispute']
    }

    const lowerIssue = issue.toLowerCase()
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerIssue.includes(keyword))) {
        return category
      }
    }
    return 'general'
  }

  private normalizeIssue(issue: string): string {
    return issue.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '))
    const words2 = new Set(text2.split(' '))
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    return intersection.size / union.size
  }

  private findEscalationPattern(history: SessionHistoryEntry[]): RelationshipPattern | null {
    const escalatedSessions = history.filter(h => {
      const messages = h.sessionData.messages
      return messages.some(m => m.aiAnalysis?.detectedTactics.length > 0)
    })

    if (escalatedSessions.length < 2) return null

    return {
      patternId: 'escalation-pattern',
      name: 'Escalation Tendency',
      description: 'Conversations frequently escalate into manipulation or hostile tactics',
      severity: escalatedSessions.length / history.length > 0.5 ? 'high' : 'medium',
      frequency: escalatedSessions.length,
      lastOccurrence: Math.max(...escalatedSessions.map(s => s.completedAt)),
      examples: escalatedSessions.slice(0, 3).map(s => s.sessionData.agreedIssue),
      trend: this.calculatePatternTrend(escalatedSessions, history)
    }
  }

  private findCommunicationBreakdownPattern(history: SessionHistoryEntry[]): RelationshipPattern | null {
    const abandonedSessions = history.filter(h => h.outcome === 'abandoned')
    
    if (abandonedSessions.length < 2) return null

    return {
      patternId: 'communication-breakdown',
      name: 'Communication Breakdown',
      description: 'Sessions frequently end without resolution or completion',
      severity: abandonedSessions.length / history.length > 0.3 ? 'high' : 'medium',
      frequency: abandonedSessions.length,
      lastOccurrence: Math.max(...abandonedSessions.map(s => s.completedAt)),
      examples: abandonedSessions.slice(0, 3).map(s => s.sessionData.agreedIssue),
      trend: this.calculatePatternTrend(abandonedSessions, history)
    }
  }

  private findManipulationPattern(history: SessionHistoryEntry[]): RelationshipPattern | null {
    const manipulationSessions = history.filter(h => 
      h.sessionData.messages.some(m => m.aiAnalysis?.detectedTactics.length > 0)
    )

    if (manipulationSessions.length < 2) return null

    return {
      patternId: 'manipulation-pattern',
      name: 'Manipulation Tactics',
      description: 'Regular use of manipulative communication strategies',
      severity: 'high',
      frequency: manipulationSessions.length,
      lastOccurrence: Math.max(...manipulationSessions.map(s => s.completedAt)),
      examples: manipulationSessions.slice(0, 3).map(s => s.sessionData.agreedIssue),
      trend: this.calculatePatternTrend(manipulationSessions, history)
    }
  }

  private findAvoidancePattern(history: SessionHistoryEntry[]): RelationshipPattern | null {
    const shortSessions = history.filter(h => h.duration < 300000) // Less than 5 minutes
    
    if (shortSessions.length < 3) return null

    return {
      patternId: 'avoidance-pattern',
      name: 'Conflict Avoidance',
      description: 'Tendency to end discussions quickly without deep engagement',
      severity: 'medium',
      frequency: shortSessions.length,
      lastOccurrence: Math.max(...shortSessions.map(s => s.completedAt)),
      examples: shortSessions.slice(0, 3).map(s => s.sessionData.agreedIssue),
      trend: this.calculatePatternTrend(shortSessions, history)
    }
  }

  private calculatePatternTrend(patternSessions: SessionHistoryEntry[], allHistory: SessionHistoryEntry[]): 'improving' | 'stable' | 'worsening' {
    if (patternSessions.length < 4) return 'stable'

    const recent = patternSessions.filter(s => s.completedAt > Date.now() - (30 * 24 * 60 * 60 * 1000)) // Last 30 days
    const older = patternSessions.filter(s => s.completedAt <= Date.now() - (30 * 24 * 60 * 60 * 1000))

    const recentTotal = allHistory.filter(s => s.completedAt > Date.now() - (30 * 24 * 60 * 60 * 1000)).length
    const olderTotal = allHistory.filter(s => s.completedAt <= Date.now() - (30 * 24 * 60 * 60 * 1000)).length

    if (recentTotal === 0 || olderTotal === 0) return 'stable'

    const recentRate = recent.length / recentTotal
    const olderRate = older.length / olderTotal

    if (recentRate < olderRate - 0.1) return 'improving'
    if (recentRate > olderRate + 0.1) return 'worsening'
    return 'stable'
  }

  private extractCommonTriggers(sessions: SessionHistoryEntry[]): string[] {
    // Extract common phrases that appear in multiple sessions
    const allMessages = sessions.flatMap(s => s.sessionData.messages.map(m => m.content))
    const phrases = allMessages.flatMap(content => 
      content.toLowerCase().split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
    )
    
    const phraseCount = phrases.reduce((acc, phrase) => {
      acc[phrase] = (acc[phrase] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(phraseCount)
      .filter(([phrase, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([phrase]) => phrase)
  }

  private extractEscalationPoints(sessions: SessionHistoryEntry[]): string[] {
    return sessions
      .flatMap(s => s.sessionData.messages)
      .filter(m => m.aiAnalysis?.detectedTactics.length > 0)
      .slice(0, 5)
      .map(m => m.content.substring(0, 100) + '...')
  }

  private analyzeManipulationTactics(history: SessionHistoryEntry[]): CommunicationMetrics['manipulationTactics'] {
    const tacticCounts = new Map<ManipulationTactic, number>()
    const tacticHistory = new Map<ManipulationTactic, number[]>()

    history.forEach(session => {
      session.sessionData.messages.forEach(message => {
        if (message.aiAnalysis?.detectedTactics) {
          message.aiAnalysis.detectedTactics.forEach(tactic => {
            tacticCounts.set(tactic, (tacticCounts.get(tactic) || 0) + 1)
            if (!tacticHistory.has(tactic)) {
              tacticHistory.set(tactic, [])
            }
            tacticHistory.get(tactic)!.push(session.completedAt)
          })
        }
      })
    })

    return Array.from(tacticCounts.entries()).map(([tactic, frequency]) => {
      const timestamps = tacticHistory.get(tactic) || []
      const trend = this.calculateTacticTrend(timestamps)
      
      return {
        tactic,
        frequency,
        trend
      }
    })
  }

  private calculateTacticTrend(timestamps: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (timestamps.length < 3) return 'stable'

    const sortedTimestamps = timestamps.sort((a, b) => a - b)
    const midpoint = Math.floor(sortedTimestamps.length / 2)
    const early = sortedTimestamps.slice(0, midpoint)
    const recent = sortedTimestamps.slice(midpoint)

    const earlyAvg = early.reduce((sum, t) => sum + t, 0) / early.length
    const recentAvg = recent.reduce((sum, t) => sum + t, 0) / recent.length

    const timeDiff = recentAvg - earlyAvg
    const totalTimespan = sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]

    if (timeDiff < totalTimespan * 0.3) return 'decreasing'
    if (timeDiff > totalTimespan * 0.7) return 'increasing'
    return 'stable'
  }

  private analyzeTone(messages: any[]): { positive: number, negative: number, neutral: number } {
    if (messages.length === 0) return { positive: 0, negative: 0, neutral: 100 }

    // Simple sentiment analysis based on keywords
    let positive = 0, negative = 0, neutral = 0

    const positiveWords = ['good', 'great', 'happy', 'love', 'appreciate', 'thank', 'understand', 'agree']
    const negativeWords = ['bad', 'hate', 'angry', 'frustrated', 'never', 'always', 'stupid', 'wrong']

    messages.forEach(message => {
      const content = message.content.toLowerCase()
      const hasPositive = positiveWords.some(word => content.includes(word))
      const hasNegative = negativeWords.some(word => content.includes(word))

      if (hasPositive && !hasNegative) positive++
      else if (hasNegative && !hasPositive) negative++
      else neutral++
    })

    const total = messages.length
    return {
      positive: (positive / total) * 100,
      negative: (negative / total) * 100,
      neutral: (neutral / total) * 100
    }
  }

  private calculateSteelManningAccuracy(history: SessionHistoryEntry[]): number {
    const steelManningAttempts = history.filter(h => h.sessionData.playerOneSteelMan && h.sessionData.playerTwoSteelMan)
    
    if (steelManningAttempts.length === 0) return 0

    // For now, assume all steel-manning attempts that led to successful sessions were accurate
    // In a real implementation, this would need more sophisticated analysis
    const successfulAttempts = steelManningAttempts.filter(h => h.outcome === 'resolved')
    
    return (successfulAttempts.length / steelManningAttempts.length) * 100
  }

  private calculateStreaks(history: SessionHistoryEntry[]): ProgressMetrics['streaks'] {
    if (history.length === 0) return { current: 0, best: 0, type: 'resolution' }

    const sortedHistory = history.sort((a, b) => a.completedAt - b.completedAt)
    let currentStreak = 0
    let bestStreak = 0
    let streakType: 'resolution' | 'completion' | 'satisfaction' = 'resolution'

    // Calculate resolution streak
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
      if (sortedHistory[i].outcome === 'resolved') {
        currentStreak++
      } else {
        break
      }
    }

    // Find best streak
    let tempStreak = 0
    sortedHistory.forEach(session => {
      if (session.outcome === 'resolved') {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    })

    return {
      current: currentStreak,
      best: bestStreak,
      type: streakType
    }
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const week = Math.ceil((date.getDate() - date.getDay()) / 7)
    const month = date.getMonth() + 1
    return `${year}-${month.toString().padStart(2, '0')}-W${week}`
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    return `${year}-${month.toString().padStart(2, '0')}`
  }

  private calculateAverageSatisfaction(sessions: SessionHistoryEntry[]): number {
    const ratings = sessions
      .flatMap(s => s.satisfactionRating ? [s.satisfactionRating.player1, s.satisfactionRating.player2] : [])
      .filter(rating => rating > 0)

    return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
  }

  private extractCommonIssues(sessions: SessionHistoryEntry[]): string[] {
    const categories = sessions.map(s => this.categorizeIssue(s.sessionData.agreedIssue))
    const categoryCounts = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)
  }

  private calculateProgressScore(sessions: SessionHistoryEntry[]): number {
    const resolvedCount = sessions.filter(s => s.outcome === 'resolved').length
    const totalCount = sessions.length
    return totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0
  }

  private calculateSeasonalTrends(history: SessionHistoryEntry[]): TimeBasedAnalysis['seasonalTrends'] {
    const seasons = { spring: [], summer: [], fall: [], winter: [] } as Record<string, SessionHistoryEntry[]>

    history.forEach(session => {
      const month = new Date(session.completedAt).getMonth()
      let season: keyof typeof seasons
      
      if (month >= 2 && month <= 4) season = 'spring'
      else if (month >= 5 && month <= 7) season = 'summer'
      else if (month >= 8 && month <= 10) season = 'fall'
      else season = 'winter'

      seasons[season].push(session)
    })

    return Object.entries(seasons).map(([season, sessions]) => ({
      season: season as 'spring' | 'summer' | 'fall' | 'winter',
      conflictFrequency: sessions.length,
      resolutionSuccess: sessions.length > 0 ? 
        (sessions.filter(s => s.outcome === 'resolved').length / sessions.length) * 100 : 0
    }))
  }

  private identifyStrengthAreas(history: SessionHistoryEntry[], progress: ProgressMetrics): string[] {
    const strengths: string[] = []

    if (progress.resolutionRate > 70) {
      strengths.push('High conflict resolution success rate')
    }
    
    if (progress.sessionCompletionRate > 80) {
      strengths.push('Consistent engagement in discussions')
    }

    if (progress.averageSatisfaction > 3.5) {
      strengths.push('Generally positive session outcomes')
    }

    if (progress.improvementTrend === 'improving') {
      strengths.push('Demonstrable progress over time')
    }

    if (progress.streaks.current > 2) {
      strengths.push(`Current ${progress.streaks.current}-session success streak`)
    }

    return strengths.length > 0 ? strengths : ['Willingness to engage with structured conflict resolution']
  }

  private identifyGrowthAreas(patterns: RelationshipPattern[], progress: ProgressMetrics): string[] {
    const growthAreas: string[] = []

    patterns.forEach(pattern => {
      if (pattern.severity === 'high' || pattern.trend === 'worsening') {
        growthAreas.push(`Address ${pattern.name.toLowerCase()}`)
      }
    })

    if (progress.resolutionRate < 50) {
      growthAreas.push('Improve conflict resolution effectiveness')
    }

    if (progress.sessionCompletionRate < 70) {
      growthAreas.push('Increase commitment to completing discussions')
    }

    if (progress.averageSatisfaction < 3) {
      growthAreas.push('Work toward more satisfying outcomes')
    }

    return growthAreas.length > 0 ? growthAreas : ['Continue building healthy communication habits']
  }

  private async generateRecommendations(
    patterns: RelationshipPattern[], 
    progress: ProgressMetrics, 
    history: SessionHistoryEntry[]
  ): Promise<RelationshipInsights['recommendations']> {
    const recommendations: RelationshipInsights['recommendations'] = []

    // High-priority recommendations based on critical patterns
    patterns.forEach(pattern => {
      if (pattern.severity === 'high') {
        recommendations.push({
          priority: 'high',
          action: this.getPatternRecommendation(pattern),
          reasoning: `${pattern.name} detected in ${pattern.frequency} sessions`,
          expectedImpact: 'Significant improvement in relationship dynamics'
        })
      }
    })

    // Medium-priority recommendations based on progress metrics
    if (progress.resolutionRate < 60) {
      recommendations.push({
        priority: 'medium',
        action: 'Focus on completing steel-manning phase thoroughly',
        reasoning: 'Low resolution rate suggests issues with mutual understanding',
        expectedImpact: 'Better preparation for productive discussions'
      })
    }

    if (progress.sessionCompletionRate < 80) {
      recommendations.push({
        priority: 'medium',
        action: 'Set clear time boundaries and commitment expectations',
        reasoning: 'Sessions frequently abandoned before completion',
        expectedImpact: 'More consistent engagement and better outcomes'
      })
    }

    // Low-priority recommendations for optimization
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Continue current approach with minor refinements',
        reasoning: 'Overall performance is strong',
        expectedImpact: 'Maintain positive trajectory'
      })
    }

    return recommendations.slice(0, 5) // Limit to 5 recommendations
  }

  private getPatternRecommendation(pattern: RelationshipPattern): string {
    switch (pattern.patternId) {
      case 'escalation-pattern':
        return 'Practice de-escalation techniques and take breaks when emotions run high'
      case 'communication-breakdown':
        return 'Establish ground rules for staying engaged during difficult conversations'
      case 'manipulation-pattern':
        return 'Focus on direct, honest communication and call out manipulation when detected'
      case 'avoidance-pattern':
        return 'Commit to spending adequate time on issues before seeking resolution'
      default:
        return 'Work with a relationship counselor to address recurring patterns'
    }
  }

  private identifyRiskFactors(patterns: RelationshipPattern[], progress: ProgressMetrics): RelationshipInsights['riskFactors'] {
    const riskFactors: RelationshipInsights['riskFactors'] = []

    patterns.forEach(pattern => {
      if (pattern.severity === 'high' || pattern.trend === 'worsening') {
        riskFactors.push({
          factor: pattern.name,
          severity: pattern.severity,
          trend: pattern.trend,
          interventions: [
            'Professional counseling',
            'Structured communication training',
            'Regular check-ins using MixitFixit'
          ]
        })
      }
    })

    if (progress.improvementTrend === 'declining') {
      riskFactors.push({
        factor: 'Declining Progress',
        severity: 'medium',
        trend: 'worsening',
        interventions: [
          'Review recent session patterns',
          'Identify external stressors',
          'Consider professional support'
        ]
      })
    }

    return riskFactors
  }

  private async saveHistory(history: SessionHistoryEntry[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save session history:', error)
      throw new Error('Failed to save session history')
    }
  }

  private getEmptyAnalytics(): HistoryAnalytics {
    return {
      totalSessions: 0,
      dateRange: { first: 0, last: 0 },
      recurringIssues: [],
      relationshipPatterns: [],
      communicationMetrics: {
        averageResponseTime: 0,
        messageLength: 0,
        emotionalTone: { positive: 0, negative: 0, neutral: 100 },
        manipulationTactics: [],
        aiInterventionEffectiveness: 0,
        steelManningAccuracy: 0
      },
      progressMetrics: {
        resolutionRate: 0,
        consensusRate: 0,
        sessionCompletionRate: 0,
        averageSatisfaction: 0,
        improvementTrend: 'stable',
        streaks: { current: 0, best: 0, type: 'resolution' }
      },
      timeBasedAnalysis: {
        weeklyTrends: [],
        monthlyPatterns: [],
        seasonalTrends: []
      },
      insights: {
        overallHealth: 'good',
        strengthAreas: [],
        growthAreas: [],
        recommendations: [],
        riskFactors: []
      },
      generatedAt: Date.now()
    }
  }

  /**
   * Clear all session history (for testing or user request)
   */
  async clearHistory(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Export session history as JSON
   */
  async exportHistory(): Promise<string> {
    const history = await this.getHistory()
    const analytics = await this.generateHistoryAnalytics()
    
    return JSON.stringify({
      exportedAt: Date.now(),
      history,
      analytics
    }, null, 2)
  }

  /**
   * Get pattern recognition insights for a specific session
   */
  async analyzeSessionPatterns(sessionData: SessionData): Promise<PatternRecognitionResult[]> {
    const history = await this.getHistory()
    const results: PatternRecognitionResult[] = []

    // Compare with historical patterns
    const similarIssues = history.filter(h => 
      this.calculateSimilarity(
        this.normalizeIssue(h.sessionData.agreedIssue),
        this.normalizeIssue(sessionData.agreedIssue)
      ) > 0.6
    )

    if (similarIssues.length > 0) {
      results.push({
        confidence: 0.8,
        patternType: 'thematic',
        description: `This issue has been discussed ${similarIssues.length} time(s) before`,
        evidence: similarIssues.map(s => s.sessionData.agreedIssue),
        recommendations: [
          'Review previous resolutions',
          'Identify why this issue keeps recurring',
          'Focus on implementation of past solutions'
        ]
      })
    }

    return results
  }
}

export const sessionHistoryService = new SessionHistoryService()