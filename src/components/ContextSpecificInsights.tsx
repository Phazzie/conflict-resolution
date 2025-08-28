import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ConflictContext } from '../types/session'
import { CONFLICT_CONTEXTS } from '../services/conflictContexts'
import { Heart, Briefcase, Users, TrendUp, Target, CheckCircle, AlertTriangle } from '@phosphor-icons/react'

interface ContextSpecificInsightsProps {
  conflictContext: ConflictContext
  sessionAnalytics?: {
    totalMessages: number
    manipulationDetected: string[]
    aiInterventions: number
    communicationImproved: boolean
  }
}

const CONTEXT_ICONS = {
  relationship: Heart,
  workplace: Briefcase,
  family: Users
}

const CONTEXT_COLORS = {
  relationship: 'text-pink-500',
  workplace: 'text-blue-500',
  family: 'text-green-500'
}

export default function ContextSpecificInsights({ 
  conflictContext, 
  sessionAnalytics 
}: ContextSpecificInsightsProps) {
  const config = CONFLICT_CONTEXTS[conflictContext]
  const Icon = CONTEXT_ICONS[conflictContext]
  const colorClass = CONTEXT_COLORS[conflictContext]

  const getContextSpecificMetrics = () => {
    switch (conflictContext) {
      case 'relationship':
        return {
          title: 'Relationship Health Indicators',
          metrics: [
            { 
              label: 'Emotional Validation', 
              value: sessionAnalytics?.communicationImproved ? 85 : 45,
              description: 'How well partners are validating each other\'s feelings'
            },
            { 
              label: 'Trust Building', 
              value: sessionAnalytics ? Math.max(0, 70 - (sessionAnalytics.manipulationDetected.length * 10)) : 50,
              description: 'Progress toward rebuilding trust and emotional safety'
            },
            { 
              label: 'Intimacy Potential', 
              value: sessionAnalytics?.aiInterventions ? Math.max(0, 60 - (sessionAnalytics.aiInterventions * 5)) : 60,
              description: 'Capacity for deeper emotional connection'
            }
          ],
          recommendations: [
            'Use "I feel" statements to express emotions without blame',
            'Practice active listening by reflecting back what you hear',
            'Focus on the relationship impact rather than individual rights',
            'Create safe spaces for vulnerability and emotional expression'
          ]
        }
      
      case 'workplace':
        return {
          title: 'Professional Effectiveness Metrics',
          metrics: [
            { 
              label: 'Team Collaboration', 
              value: sessionAnalytics?.communicationImproved ? 80 : 40,
              description: 'Ability to work together effectively toward shared goals'
            },
            { 
              label: 'Professional Boundaries', 
              value: sessionAnalytics ? Math.min(90, 60 + (sessionAnalytics.totalMessages * 2)) : 60,
              description: 'Maintaining appropriate workplace communication'
            },
            { 
              label: 'Productivity Impact', 
              value: sessionAnalytics?.manipulationDetected.length ? Math.max(30, 70 - (sessionAnalytics.manipulationDetected.length * 8)) : 70,
              description: 'How conflict resolution affects work performance'
            }
          ],
          recommendations: [
            'Frame discussions around business outcomes and team goals',
            'Use data and specific examples rather than personal grievances',
            'Respect organizational hierarchy and reporting structures',
            'Focus on constructive feedback for professional development'
          ]
        }

      case 'family':
        return {
          title: 'Family Bond Strength Assessment',
          metrics: [
            { 
              label: 'Generational Respect', 
              value: sessionAnalytics?.aiInterventions ? Math.max(50, 80 - (sessionAnalytics.aiInterventions * 3)) : 75,
              description: 'Honoring different generational perspectives and experiences'
            },
            { 
              label: 'Family Unity', 
              value: sessionAnalytics?.communicationImproved ? 85 : 55,
              description: 'Maintaining family bonds while addressing individual needs'
            },
            { 
              label: 'Legacy Preservation', 
              value: sessionAnalytics ? Math.min(85, 50 + (sessionAnalytics.totalMessages * 3)) : 65,
              description: 'Protecting family relationships for future generations'
            }
          ],
          recommendations: [
            'Acknowledge family history and established relationship patterns',
            'Respect cultural values and traditional family expectations',
            'Prioritize long-term family harmony over short-term victories',
            'Consider the impact on extended family and future generations'
          ]
        }

      default:
        return {
          title: 'General Communication Metrics',
          metrics: [],
          recommendations: []
        }
    }
  }

  const contextMetrics = getContextSpecificMetrics()

  const getScoreColor = (value: number) => {
    if (value >= 70) return 'text-green-600'
    if (value >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (value: number) => {
    if (value >= 70) return <CheckCircle size={16} className="text-green-600" />
    if (value >= 50) return <Target size={16} className="text-yellow-600" />
    return <AlertTriangle size={16} className="text-red-600" />
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon size={24} className={colorClass} />
          <span>{config.label} Insights</span>
          <Badge variant="outline">{config.type}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendUp size={18} />
            {contextMetrics.title}
          </h4>
          <div className="grid gap-4">
            {contextMetrics.metrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(metric.value)}
                    <span className="font-medium text-sm">{metric.label}</span>
                  </div>
                  <span className={`font-semibold ${getScoreColor(metric.value)}`}>
                    {metric.value}%
                  </span>
                </div>
                <Progress value={metric.value} className="h-2" />
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Context-Specific Recommendations</h4>
          <div className="space-y-2">
            {contextMetrics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h5 className="font-medium mb-2">Special Considerations for {config.label}s</h5>
          <div className="space-y-1">
            {config.specialConsiderations.map((consideration, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                {consideration}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}