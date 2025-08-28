import { Card, CardContent } from '@/components/ui/card'
import { CircleNotch } from '@phosphor-icons/react'

/**
 * Loading screen component
 * Extracted from App.tsx for better organization
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardContent className="flex items-center gap-3 p-6">
          <CircleNotch size={24} className="animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading the digital thunderdome...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}