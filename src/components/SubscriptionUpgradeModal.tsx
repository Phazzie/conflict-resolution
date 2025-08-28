import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Crown, 
  Check, 
  X, 
  Star, 
  Users, 
  BarChart3, 
  Download, 
  Brain,
  Heart,
  Sparkles,
  CreditCard,
  Gift
} from '@phosphor-icons/react'
import { useSubscription, SubscriptionTier } from '@/services/businessModel'
import { toast } from 'sonner'

interface SubscriptionUpgradeModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
  recommendedTier?: SubscriptionTier
  triggerFeature?: string
}

const TIER_ICONS = {
  free: Gift,
  premium: Star,
  professional: Crown,
  enterprise: Sparkles
}

const TIER_COLORS = {
  free: 'text-gray-500',
  premium: 'text-blue-500',
  professional: 'text-purple-500',
  enterprise: 'text-amber-500'
}

const TIER_DESCRIPTIONS = {
  free: 'Get started with basic conflict resolution',
  premium: 'Perfect for couples working on their relationship',
  professional: 'For therapists and relationship coaches',
  enterprise: 'For organizations and large teams'
}

const FEATURE_ICONS = {
  maxSessionsPerMonth: Users,
  advancedAnalytics: BarChart3,
  sessionHistory: BarChart3,
  aiPersonalityCustomization: Brain,
  therapistTools: Crown,
  exportData: Download,
  prioritySupport: Star,
  mlInsights: Brain,
  couplesDashboard: Heart,
  multiUserSessions: Users,
  customBranding: Sparkles,
  apiAccess: Crown
}

export default function SubscriptionUpgradeModal({ 
  isOpen, 
  onOpenChange, 
  reason, 
  recommendedTier,
  triggerFeature 
}: SubscriptionUpgradeModalProps) {
  const { currentTier, usage, pricing, upgradeTo } = useSubscription()
  const [isYearly, setIsYearly] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(recommendedTier || 'premium')

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setIsUpgrading(true)
    try {
      const result = await upgradeTo(tier)
      if (result.success) {
        toast.success(`Successfully upgraded to ${tier}!`)
        onOpenChange(false)
        // Reload to reflect new permissions
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error(result.error || 'Upgrade failed')
      }
    } catch (error) {
      toast.error('Upgrade failed. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const formatPrice = (tier: SubscriptionTier) => {
    const price = pricing[tier]
    if (price.monthly === 0) return 'Free'
    
    const monthlyPrice = isYearly ? price.yearly / 12 : price.monthly
    const yearlyDiscount = price.yearly < price.monthly * 12
    
    return (
      <div className="text-center">
        <span className="text-2xl font-bold">${monthlyPrice.toFixed(2)}</span>
        <span className="text-muted-foreground">/month</span>
        {isYearly && yearlyDiscount && (
          <div className="text-sm text-green-600">Save ${(price.monthly * 12 - price.yearly).toFixed(2)}/year</div>
        )}
      </div>
    )
  }

  const getFeatureList = (tier: SubscriptionTier) => {
    const features = {
      free: [
        '3 sessions per month',
        'Basic AI personality settings',
        'Standard conflict resolution'
      ],
      premium: [
        '20 sessions per month',
        'Advanced analytics dashboard',
        'Session history tracking',
        'Data export capabilities',
        'ML-powered insights',
        'Couples dashboard',
        'Multi-user sessions'
      ],
      professional: [
        '100 sessions per month',
        'All premium features',
        'Therapist tools & workflows',
        'Priority support',
        'Professional insights',
        'Client management'
      ],
      enterprise: [
        'Unlimited sessions',
        'All professional features',
        'Custom branding',
        'API access',
        'Advanced security',
        'Dedicated support'
      ]
    }
    
    return features[tier] || []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown size={24} className="text-purple-500" />
            Upgrade Your MixitFixit Experience
          </DialogTitle>
          {reason && (
            <Alert>
              <Star size={16} />
              <AlertDescription>{reason}</AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Usage */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Current Plan: {currentTier}</span>
              <Badge variant="outline">{usage.sessionsThisMonth} sessions used this month</Badge>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ 
                  width: `${Math.min((usage.sessionsThisMonth / (currentTier === 'free' ? 3 : 20)) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Yearly/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={!isYearly ? 'font-medium' : 'text-muted-foreground'}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={isYearly ? 'font-medium' : 'text-muted-foreground'}>
              Yearly <Badge className="ml-1">Save up to 17%</Badge>
            </span>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['free', 'premium', 'professional', 'enterprise'] as SubscriptionTier[]).map((tier) => {
              const TierIcon = TIER_ICONS[tier]
              const isCurrentTier = tier === currentTier
              const isRecommended = tier === recommendedTier
              
              return (
                <Card 
                  key={tier} 
                  className={`relative ${isRecommended ? 'ring-2 ring-primary' : ''} ${
                    isCurrentTier ? 'opacity-50' : 'cursor-pointer'
                  }`}
                  onClick={() => !isCurrentTier && setSelectedTier(tier)}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-2">
                      <TierIcon size={32} className={TIER_COLORS[tier]} />
                    </div>
                    <CardTitle className="capitalize">{tier}</CardTitle>
                    <p className="text-sm text-muted-foreground">{TIER_DESCRIPTIONS[tier]}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {formatPrice(tier)}
                    
                    <div className="space-y-2">
                      {getFeatureList(tier).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check size={16} className="text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {!isCurrentTier && tier !== 'free' && (
                      <Button 
                        className="w-full"
                        onClick={() => handleUpgrade(tier)}
                        disabled={isUpgrading}
                        variant={tier === selectedTier ? 'default' : 'outline'}
                      >
                        {isUpgrading ? 'Upgrading...' : `Upgrade to ${tier}`}
                      </Button>
                    )}
                    
                    {isCurrentTier && (
                      <Button className="w-full" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Feature Comparison */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Feature</th>
                    <th className="text-center p-2">Free</th>
                    <th className="text-center p-2">Premium</th>
                    <th className="text-center p-2">Professional</th>
                    <th className="text-center p-2">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly Sessions', values: ['3', '20', '100', 'Unlimited'] },
                    { feature: 'AI Personality', values: [true, true, true, true] },
                    { feature: 'Advanced Analytics', values: [false, true, true, true] },
                    { feature: 'Session History', values: [false, true, true, true] },
                    { feature: 'Data Export', values: [false, true, true, true] },
                    { feature: 'ML Insights', values: [false, true, true, true] },
                    { feature: 'Couples Dashboard', values: [false, true, true, true] },
                    { feature: 'Therapist Tools', values: [false, false, true, true] },
                    { feature: 'Priority Support', values: [false, false, true, true] },
                    { feature: 'Custom Branding', values: [false, false, false, true] },
                    { feature: 'API Access', values: [false, false, false, true] }
                  ].map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{row.feature}</td>
                      {row.values.map((value, valueIndex) => (
                        <td key={valueIndex} className="text-center p-2">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check size={16} className="text-green-500 mx-auto" />
                            ) : (
                              <X size={16} className="text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm">{value}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
            <div className="space-y-2 text-sm">
              <details className="p-3 border rounded">
                <summary className="cursor-pointer font-medium">Can I cancel anytime?</summary>
                <p className="mt-2 text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.
                </p>
              </details>
              <details className="p-3 border rounded">
                <summary className="cursor-pointer font-medium">What happens to my data if I downgrade?</summary>
                <p className="mt-2 text-muted-foreground">
                  Your session data is always preserved. You'll just lose access to advanced features like analytics and exports.
                </p>
              </details>
              <details className="p-3 border rounded">
                <summary className="cursor-pointer font-medium">Is my data secure?</summary>
                <p className="mt-2 text-muted-foreground">
                  Absolutely. All data is encrypted and we never share your personal conversations. Professional and Enterprise plans include additional security features.
                </p>
              </details>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard size={16} />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown size={16} />
              <span>30-Day Money Back</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={16} />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}