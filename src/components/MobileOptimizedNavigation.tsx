import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Phone, Tablet, Monitor, Settings } from '@phosphor-icons/react'
import { useIsMobile } from '@/hooks/use-mobile'
import { SessionPhase, PHASE_PROGRESS, PHASE_NAMES } from '@/types/session'

interface MobileOptimizedNavigationProps {
  currentPhase: SessionPhase
  onPhaseChange: (phase: SessionPhase) => void
  onOpenSettings?: () => void
  className?: string
}

const PHASE_ORDER: SessionPhase[] = [
  'welcome',
  'ai-preferences', 
  'context-selection',
  'issue-agreement',
  'steel-manning',
  'statement-locking',
  'discussion',
  'resolution',
  'summary'
]

export default function MobileOptimizedNavigation({ 
  currentPhase, 
  onPhaseChange, 
  onOpenSettings,
  className 
}: MobileOptimizedNavigationProps) {
  const isMobile = useIsMobile()
  
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < PHASE_ORDER.length - 1
  
  const goToPrevious = () => {
    if (canGoPrevious) {
      onPhaseChange(PHASE_ORDER[currentIndex - 1])
    }
  }
  
  const goToNext = () => {
    if (canGoNext) {
      onPhaseChange(PHASE_ORDER[currentIndex + 1])
    }
  }

  const getDeviceIcon = () => {
    if (typeof window === 'undefined') return Monitor
    const width = window.innerWidth
    if (width < 768) return Phone
    if (width < 1024) return Tablet
    return Monitor
  }

  const DeviceIcon = getDeviceIcon()

  if (!isMobile) {
    // Desktop/tablet version - minimal changes
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <DeviceIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {PHASE_NAMES[currentPhase]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {PHASE_PROGRESS[currentPhase]}%
          </span>
          {onOpenSettings && (
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <Settings size={16} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Mobile-first optimized navigation
  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        {/* Phase Title */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Phone size={16} className="text-primary" />
            <Badge variant="secondary" className="text-xs">
              Step {currentIndex + 1} of {PHASE_ORDER.length}
            </Badge>
          </div>
          <h3 className="font-semibold text-lg">{PHASE_NAMES[currentPhase]}</h3>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{PHASE_PROGRESS[currentPhase]}%</span>
          </div>
          <Progress 
            value={PHASE_PROGRESS[currentPhase]} 
            className="h-2"
          />
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Previous
          </Button>

          {onOpenSettings && (
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <Settings size={16} />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={!canGoNext}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Phase Description */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            {getPhaseDescription(currentPhase)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function getPhaseDescription(phase: SessionPhase): string {
  const descriptions = {
    'welcome': 'Welcome to the digital thunderdome for relationship conflicts',
    'ai-preferences': 'Set up how the AI communicates with you',
    'context-selection': 'Choose the type of conflict you\'re resolving',
    'issue-agreement': 'Agree on what you\'re actually fighting about',
    'steel-manning': 'Prove you understand each other\'s perspective',
    'statement-locking': 'Lock in your final positions on the issue',
    'discussion': 'Discuss the issue with AI moderation',
    'resolution': 'Negotiate and agree on a resolution',
    'summary': 'Review your session and next steps',
    'analytics': 'View detailed analytics of your session',
    'history': 'View your previous sessions',
    'couples-dashboard': 'Track relationship patterns over time',
    'pattern-recognition': 'Analyze communication patterns',
    'ml-insights': 'View machine learning insights'
  }
  
  return descriptions[phase] || 'Navigate through your conflict resolution session'
}