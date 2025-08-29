/**
 * Demo Feature Disclaimer
 * 
 * Wraps fake/demo features with clear disclaimers to prevent user confusion.
 * Use this until real implementations are ready.
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Info, Lightbulb } from '@phosphor-icons/react'
import { ReactNode } from 'react'

interface DemoFeatureWrapperProps {
  children: ReactNode
  featureName: string
  type: 'demo' | 'simulation' | 'mockup' | 'coming-soon'
  description?: string
  estimatedRelease?: string
  onFeedback?: () => void
}

export default function DemoFeatureWrapper({
  children,
  featureName,
  type,
  description,
  estimatedRelease,
  onFeedback
}: DemoFeatureWrapperProps) {
  const getTypeInfo = () => {
    switch (type) {
      case 'demo':
        return {
          badge: 'Demo Version',
          variant: 'secondary' as const,
          icon: <Info size={16} />,
          message: 'This is a demonstration version with sample data.',
          tone: 'neutral'
        }
      case 'simulation':
        return {
          badge: 'Simulated Data',
          variant: 'outline' as const,
          icon: <Lightbulb size={16} />,
          message: 'This feature uses simulated data to show how it would work.',
          tone: 'informative'
        }
      case 'mockup':
        return {
          badge: 'Design Mockup',
          variant: 'outline' as const,
          icon: <Info size={16} />,
          message: 'This is a design preview. The functionality is not yet implemented.',
          tone: 'honest'
        }
      case 'coming-soon':
        return {
          badge: 'Coming Soon',
          variant: 'secondary' as const,
          icon: <Lightbulb size={16} />,
          message: 'This feature is in development and will be available soon.',
          tone: 'promising'
        }
    }
  }

  const typeInfo = getTypeInfo()

  return (
    <div className="space-y-4">
      {/* Disclaimer Header */}
      <Alert className="border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          {typeInfo.icon}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={typeInfo.variant} className="text-xs">
                {typeInfo.badge}
              </Badge>
              <span className="font-medium text-sm">{featureName}</span>
            </div>
            
            <AlertDescription className="text-sm text-muted-foreground">
              {typeInfo.message}
              {description && (
                <>
                  <br />
                  <span className="mt-1 inline-block">{description}</span>
                </>
              )}
              {estimatedRelease && (
                <>
                  <br />
                  <span className="mt-1 inline-block text-xs text-muted-foreground">
                    Expected: {estimatedRelease}
                  </span>
                </>
              )}
            </AlertDescription>

            {onFeedback && (
              <button
                onClick={onFeedback}
                className="text-xs text-primary hover:underline"
              >
                Share feedback on this feature →
              </button>
            )}
          </div>
        </div>
      </Alert>

      {/* The actual feature content */}
      <div className="relative">
        {/* Subtle overlay to indicate demo status */}
        <div className="absolute top-0 right-0 z-10">
          <Badge variant="outline" className="text-xs opacity-75">
            {typeInfo.badge}
          </Badge>
        </div>
        
        {children}
      </div>
    </div>
  )
}

/**
 * Quick disclaimer for inline use
 */
export function InlineDemoNote({ 
  type, 
  className = "" 
}: { 
  type: 'demo' | 'simulation' | 'mockup'
  className?: string 
}) {
  const text = {
    demo: 'Demo data',
    simulation: 'Simulated',
    mockup: 'Design preview'
  }

  return (
    <Badge variant="outline" className={`text-xs opacity-75 ${className}`}>
      {text[type]}
    </Badge>
  )
}

/**
 * Component for features that are completely fake and should be removed
 */
export function RemovalCandidate({ 
  featureName,
  children,
  reason
}: {
  featureName: string
  children: ReactNode
  reason: string
}) {
  return (
    <div className="space-y-3">
      <Alert className="border-red-200 bg-red-50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>⚠️ {featureName}</strong> is scheduled for removal.
          <br />
          <span className="text-xs text-muted-foreground mt-1 block">
            Reason: {reason}
          </span>
        </AlertDescription>
      </Alert>
      
      <div className="opacity-60 pointer-events-none">
        {children}
      </div>
    </div>
  )
}