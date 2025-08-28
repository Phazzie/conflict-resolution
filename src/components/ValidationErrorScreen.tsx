import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from '@phosphor-icons/react'

/**
 * Validation error screen component
 * Shows when session data is corrupted with recovery options
 */
interface ValidationErrorScreenProps {
  error: string
  onReset: () => void
}

export default function ValidationErrorScreen({ error, onReset }: ValidationErrorScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lock size={24} />
            Session Corrupted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Looks like something went sideways with your session data. Even digital relationships have trust issues.
          </p>
          
          <div className="p-3 bg-muted rounded text-sm">
            {error}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onReset} variant="default">
              Start Fresh
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Sometimes the best solution is to burn it all down and start over.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}