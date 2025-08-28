import { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  phase?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class PhaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Phase error boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      phase: this.props.phase
    })
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      const { phase } = this.props
      const { error } = this.state
      
      return (
        <div className="max-w-4xl mx-auto p-4">
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Warning size={24} />
                  {phase ? `${phase} Phase Error` : 'Phase Error'}
                </CardTitle>
                {phase && (
                  <Badge variant="destructive" className="text-xs">
                    {phase.toUpperCase()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Well, this is embarrassing. The {phase || 'current'} phase just had a spectacular failure.
                </p>
                
                {error && (
                  <div className="text-xs font-mono text-destructive bg-background p-2 rounded border max-h-32 overflow-auto">
                    {error.message}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>What happened:</strong> A critical error occurred that prevents this phase from functioning.
                </p>
                <p>
                  <strong>What to do:</strong> Try refreshing the component, or if the problem persists, restart the entire session.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <ArrowCounterClockwise size={16} className="mr-2" />
                  Try Again
                </Button>
                
                {this.props.onReset && (
                  <Button onClick={this.props.onReset} variant="destructive" className="flex-1">
                    Reset Session
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                If you keep seeing this, the universe might be telling you something about this particular argument...
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default PhaseErrorBoundary