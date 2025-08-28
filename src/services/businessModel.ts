/**
 * Business Model & Monetization Service
 * Handles subscription tiers, usage tracking, and conversion optimization
 */

import { useKV } from '@github/spark/hooks'

export type SubscriptionTier = 'free' | 'premium' | 'professional' | 'enterprise'

export interface SubscriptionFeatures {
  maxSessionsPerMonth: number
  advancedAnalytics: boolean
  sessionHistory: boolean
  aiPersonalityCustomization: boolean
  therapistTools: boolean
  exportData: boolean
  prioritySupport: boolean
  mlInsights: boolean
  couplesDashboard: boolean
  multiUserSessions: boolean
  customBranding?: boolean
  apiAccess?: boolean
}

export interface UsageTracking {
  userId: string
  sessionsThisMonth: number
  lastSessionDate: number
  featuresUsed: string[]
  conversionTriggers: string[]
  monthlyResetDate: number
}

export interface ConversionEvent {
  userId: string
  event: 'feature_limit_hit' | 'premium_feature_clicked' | 'export_attempted' | 'analytics_viewed' | 'session_limit_reached'
  context: string
  timestamp: number
  tier: SubscriptionTier
}

const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    maxSessionsPerMonth: 3,
    advancedAnalytics: false,
    sessionHistory: false,
    aiPersonalityCustomization: true,
    therapistTools: false,
    exportData: false,
    prioritySupport: false,
    mlInsights: false,
    couplesDashboard: false,
    multiUserSessions: false
  },
  premium: {
    maxSessionsPerMonth: 20,
    advancedAnalytics: true,
    sessionHistory: true,
    aiPersonalityCustomization: true,
    therapistTools: false,
    exportData: true,
    prioritySupport: false,
    mlInsights: true,
    couplesDashboard: true,
    multiUserSessions: true
  },
  professional: {
    maxSessionsPerMonth: 100,
    advancedAnalytics: true,
    sessionHistory: true,
    aiPersonalityCustomization: true,
    therapistTools: true,
    exportData: true,
    prioritySupport: true,
    mlInsights: true,
    couplesDashboard: true,
    multiUserSessions: true
  },
  enterprise: {
    maxSessionsPerMonth: -1, // Unlimited
    advancedAnalytics: true,
    sessionHistory: true,
    aiPersonalityCustomization: true,
    therapistTools: true,
    exportData: true,
    prioritySupport: true,
    mlInsights: true,
    couplesDashboard: true,
    multiUserSessions: true,
    customBranding: true,
    apiAccess: true
  }
}

const PRICING = {
  free: { monthly: 0, yearly: 0 },
  premium: { monthly: 9.99, yearly: 99.99 },
  professional: { monthly: 29.99, yearly: 299.99 },
  enterprise: { monthly: 99.99, yearly: 999.99 }
}

class BusinessModelService {
  private static instance: BusinessModelService

  static getInstance(): BusinessModelService {
    if (!BusinessModelService.instance) {
      BusinessModelService.instance = new BusinessModelService()
    }
    return BusinessModelService.instance
  }

  /**
   * Get current user's subscription tier (mock implementation)
   */
  getCurrentTier(): SubscriptionTier {
    // In a real app, this would check with your payment provider
    const savedTier = localStorage.getItem('subscription-tier')
    return (savedTier as SubscriptionTier) || 'free'
  }

  /**
   * Get features available for a subscription tier
   */
  getFeatures(tier: SubscriptionTier): SubscriptionFeatures {
    return SUBSCRIPTION_FEATURES[tier]
  }

  /**
   * Check if user can access a specific feature
   */
  canAccessFeature(feature: keyof SubscriptionFeatures): boolean {
    const currentTier = this.getCurrentTier()
    const features = this.getFeatures(currentTier)
    return !!features[feature]
  }

  /**
   * Check if user has reached session limit
   */
  hasReachedSessionLimit(usage: UsageTracking): boolean {
    const currentTier = this.getCurrentTier()
    const features = this.getFeatures(currentTier)
    
    if (features.maxSessionsPerMonth === -1) return false // Unlimited
    return usage.sessionsThisMonth >= features.maxSessionsPerMonth
  }

  /**
   * Track usage and check for conversion opportunities
   */
  trackUsage(event: string, context?: string): ConversionEvent | null {
    const currentTier = this.getCurrentTier()
    const userId = this.getUserId()

    // Track conversion opportunities
    const conversionEvents = [
      'session_limit_reached',
      'analytics_viewed_on_free',
      'export_attempted_on_free',
      'ml_insights_clicked_on_free',
      'couples_dashboard_clicked_on_free'
    ]

    if (conversionEvents.some(ce => event.includes(ce))) {
      const conversionEvent: ConversionEvent = {
        userId,
        event: event as ConversionEvent['event'],
        context: context || '',
        timestamp: Date.now(),
        tier: currentTier
      }

      // Store conversion event
      this.storeConversionEvent(conversionEvent)
      return conversionEvent
    }

    return null
  }

  /**
   * Get upgrade recommendations based on usage
   */
  getUpgradeRecommendation(usage: UsageTracking): {
    shouldShowUpgrade: boolean
    reason: string
    recommendedTier: SubscriptionTier
    features: string[]
  } {
    const currentTier = this.getCurrentTier()
    
    if (currentTier === 'enterprise') {
      return {
        shouldShowUpgrade: false,
        reason: '',
        recommendedTier: 'enterprise',
        features: []
      }
    }

    // Check if user has hit session limit
    if (this.hasReachedSessionLimit(usage)) {
      return {
        shouldShowUpgrade: true,
        reason: "You've reached your monthly session limit",
        recommendedTier: currentTier === 'free' ? 'premium' : 'professional',
        features: ['More sessions', 'Advanced analytics', 'Session history']
      }
    }

    // Check if user is using many features (high engagement)
    if (usage.featuresUsed.length >= 5 && currentTier === 'free') {
      return {
        shouldShowUpgrade: true,
        reason: "Unlock advanced features you're interested in",
        recommendedTier: 'premium',
        features: ['Advanced analytics', 'Session history', 'Data export', 'ML insights']
      }
    }

    // Check if user keeps trying premium features
    const premiumFeatureAttempts = usage.conversionTriggers.filter(trigger => 
      trigger.includes('premium') || trigger.includes('advanced')
    ).length

    if (premiumFeatureAttempts >= 3) {
      return {
        shouldShowUpgrade: true,
        reason: "Get access to the features you keep trying",
        recommendedTier: 'premium',
        features: ['All premium features', '20 sessions/month', 'Advanced analytics']
      }
    }

    return {
      shouldShowUpgrade: false,
      reason: '',
      recommendedTier: currentTier,
      features: []
    }
  }

  /**
   * Get pricing for all tiers
   */
  getPricing() {
    return PRICING
  }

  /**
   * Mock subscription upgrade
   */
  async upgradeTo(tier: SubscriptionTier): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, this would integrate with Stripe, Paddle, etc.
      localStorage.setItem('subscription-tier', tier)
      
      // Track successful conversion
      this.trackUsage(`upgraded_to_${tier}`)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upgrade failed' 
      }
    }
  }

  /**
   * Get conversion analytics for business insights
   */
  getConversionAnalytics(): {
    totalConversions: number
    conversionsByTier: Record<string, number>
    topConversionTriggers: Array<{ event: string; count: number }>
    revenueEstimate: number
  } {
    const events = this.getConversionEvents()
    const conversions = events.filter(e => e.event.includes('upgraded'))
    
    const conversionsByTier: Record<string, number> = {}
    conversions.forEach(c => {
      const targetTier = c.event.split('_').pop()
      if (targetTier) {
        conversionsByTier[targetTier] = (conversionsByTier[targetTier] || 0) + 1
      }
    })

    const triggerCounts: Record<string, number> = {}
    events.forEach(e => {
      triggerCounts[e.event] = (triggerCounts[e.event] || 0) + 1
    })

    const topConversionTriggers = Object.entries(triggerCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Rough revenue estimate
    const revenueEstimate = Object.entries(conversionsByTier).reduce((total, [tier, count]) => {
      const pricing = PRICING[tier as SubscriptionTier]
      return total + (pricing ? pricing.monthly * count : 0)
    }, 0)

    return {
      totalConversions: conversions.length,
      conversionsByTier,
      topConversionTriggers,
      revenueEstimate
    }
  }

  private getUserId(): string {
    let userId = localStorage.getItem('user-id')
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      localStorage.setItem('user-id', userId)
    }
    return userId
  }

  private storeConversionEvent(event: ConversionEvent): void {
    const events = this.getConversionEvents()
    events.push(event)
    
    // Keep only last 1000 events
    const trimmed = events.slice(-1000)
    localStorage.setItem('conversion-events', JSON.stringify(trimmed))
  }

  private getConversionEvents(): ConversionEvent[] {
    try {
      const stored = localStorage.getItem('conversion-events')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}

// Hook for easy React integration
export function useSubscription() {
  const service = BusinessModelService.getInstance()
  const [usage, setUsage] = useKV<UsageTracking>('usage-tracking', {
    userId: service.getUserId(),
    sessionsThisMonth: 0,
    lastSessionDate: 0,
    featuresUsed: [],
    conversionTriggers: [],
    monthlyResetDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
  })

  const incrementSession = () => {
    if (!usage) return
    
    const now = Date.now()
    let currentUsage = { ...usage }
    
    // Reset if month has passed
    if (now > currentUsage.monthlyResetDate) {
      currentUsage = {
        ...currentUsage,
        sessionsThisMonth: 0,
        monthlyResetDate: now + (30 * 24 * 60 * 60 * 1000)
      }
    }
    
    currentUsage.sessionsThisMonth += 1
    currentUsage.lastSessionDate = now
    
    setUsage(currentUsage)
    
    // Check for conversion opportunity
    if (service.hasReachedSessionLimit(currentUsage)) {
      service.trackUsage('session_limit_reached')
    }
  }

  const trackFeatureUsage = (feature: string) => {
    if (!usage) return
    
    const currentUsage = { ...usage }
    if (!currentUsage.featuresUsed.includes(feature)) {
      currentUsage.featuresUsed.push(feature)
      setUsage(currentUsage)
    }
    
    // Track conversion opportunity
    const currentTier = service.getCurrentTier()
    if (currentTier === 'free' && !service.canAccessFeature(feature as keyof SubscriptionFeatures)) {
      service.trackUsage(`${feature}_clicked_on_free`)
    }
  }

  return {
    currentTier: service.getCurrentTier(),
    features: service.getFeatures(service.getCurrentTier()),
    usage: usage || {
      userId: service.getUserId(),
      sessionsThisMonth: 0,
      lastSessionDate: 0,
      featuresUsed: [],
      conversionTriggers: [],
      monthlyResetDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
    },
    canAccessFeature: service.canAccessFeature.bind(service),
    hasReachedSessionLimit: () => usage ? service.hasReachedSessionLimit(usage) : false,
    incrementSession,
    trackFeatureUsage,
    getUpgradeRecommendation: () => usage ? service.getUpgradeRecommendation(usage) : null,
    upgradeTo: service.upgradeTo.bind(service),
    pricing: service.getPricing()
  }
}

export const businessModelService = BusinessModelService.getInstance()