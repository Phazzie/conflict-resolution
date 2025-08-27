import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MixitFixit Error Boundary caught an error:', error, errorInfo)
    
    // In a real app, you'd send this to an error reporting service
    // For now, just log it
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <WarningCircle size={24} />
                Well, This is Awkward
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Something went sideways in the digital thunderdome. Even our conflict resolution app 
                has conflicts, apparently.
              </p>
              
              <div className="p-3 bg-muted rounded text-sm font-mono">
                {this.state.error?.message || 'Unknown error occurred'}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowClockwise size={16} />
                  Try Again
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  Restart Session
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                If this keeps happening, maybe the real conflict is with our code.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary