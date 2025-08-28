import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, RefreshCw } from '@phosphor-icons/react'

/**
 * Validation error screen component
 * Shows when session data is corrupted with recovery options
 * Mobile-optimized with proper touch targets
 */
interface ValidationErrorScreenProps {
  error: string
  onReset: () => void
}

export default function ValidationErrorScreen({ error, onReset }: ValidationErrorScreenProps) {
  // Make error messages more human-friendly
  const getUserFriendlyError = (technicalError: string): string => {
    if (technicalError.includes('corrupted')) {
      return "Your session got scrambled somehow. Don't worry - this happens sometimes."
    }
    if (technicalError.includes('phase')) {
      return "The app got confused about where you are in the process."
    }
    if (technicalError.includes('validation')) {
      return "Something doesn't look right with your session data."
    }
    if (technicalError.includes('steel-manning')) {
      return "There's an issue with the understanding phase data."
    }
    if (technicalError.includes('statement')) {
      return "There's an issue with your locked statements."
    }
    
    return "Something unexpected happened with your session."
  }

  const getRecoveryAdvice = (technicalError: string): string => {
    if (technicalError.includes('steel-manning')) {
      return "You'll need to redo the understanding exercise, but your issue agreement will be saved."
    }
    if (technicalError.includes('statement')) {
      return "You'll need to rewrite your statements, but your previous work is saved."
    }
    
    return "Starting fresh is usually the quickest fix."
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md mx-auto w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-destructive text-lg">
            <Lock size={24} className="flex-shrink-0" />
            <span>Session Corrupted</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-foreground font-medium">
              {getUserFriendlyError(error)}
            </p>
            
            <p className="text-muted-foreground text-sm">
              {getRecoveryAdvice(error)}
            </p>
          </div>
          
          {/* Show technical error in collapsible section */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground mb-2">
              Technical Details
            </summary>
            <div className="p-3 bg-muted rounded font-mono text-xs overflow-x-auto">
              {error}
            </div>
          </details>
          
          {/* Mobile-optimized buttons */}
          <div className="pt-4">
            <Button 
              onClick={onReset} 
              className="w-full h-12 text-base"
              size="lg"
            >
              <RefreshCw size={20} className="mr-2" />
              Start Fresh
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Don't worry - starting over is often faster than debugging. 
            Your relationship problems aren't going anywhere.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}