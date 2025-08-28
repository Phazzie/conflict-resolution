import React, { Component, ReactNode } from 'react'
import ErrorRecovery from './ErrorRecovery'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
  onReset?: () => void
  context?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
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
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    this.props.onRetry?.()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <ErrorRecovery
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onReset={this.handleReset}
            context={this.props.context || 'application'}
            canRecover={true}
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary