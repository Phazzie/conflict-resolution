import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Send,
  ArrowLeft,
  Bug,
  Lightbulb
} from '@phosphor-icons/react'
import { errorReportingService, reportError } from '@/services/errorReporting'

interface ErrorRecoveryProps {
  error: Error
  errorInfo?: React.ErrorInfo
  onRetry?: () => void
  onReset?: () => void
  onGoBack?: () => void
  context?: string
  canRecover?: boolean
  className?: string
}

export default function ErrorRecovery({
  error,
  errorInfo,
  onRetry,
  onReset,
  onGoBack,
  context = 'application',
  canRecover = true,
  className
}: ErrorRecoveryProps) {
  const [userFeedback, setUserFeedback] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  const errorId = React.useMemo(() => {
    return reportError(error, 'high', {
      context,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }, [error, errorInfo, context])

  const handleRetry = () => {
    reportError(new Error('User initiated retry'), 'low', { 
      context: 'error_recovery_retry',
      originalErrorId: errorId 
    })
    onRetry?.()
  }

  const handleReset = () => {
    reportError(new Error('User initiated reset'), 'low', { 
      context: 'error_recovery_reset',
      originalErrorId: errorId 
    })
    onReset?.()
  }

  const handleGoBack = () => {
    reportError(new Error('User went back from error'), 'low', { 
      context: 'error_recovery_back',
      originalErrorId: errorId 
    })
    onGoBack?.()
  }

  const handleSubmitFeedback = async () => {
    if (!userFeedback.trim()) return
    
    setIsSubmittingFeedback(true)
    try {
      reportError(new Error('User feedback on error'), 'low', {
        context: 'error_feedback',
        originalErrorId: errorId,
        userFeedback: userFeedback.trim(),
        feedbackLength: userFeedback.length
      })
      
      setFeedbackSubmitted(true)
      setTimeout(() => setFeedbackSubmitted(false), 3000)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const copyErrorDetails = async () => {
    const errorDetails = `
MixitFixit Error Report
Error ID: ${errorId}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Error: ${error.name}
Message: ${error.message}
Stack: ${error.stack}

${errorInfo?.componentStack ? `Component Stack: ${errorInfo.componentStack}` : ''}
    `.trim()

    try {
      await navigator.clipboard.writeText(errorDetails)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const getErrorSeverityColor = () => {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'text-orange-500'
    }
    if (error.message.includes('Permission') || error.message.includes('Auth')) {
      return 'text-red-500'
    }
    return 'text-amber-500'
  }

  const getRecoveryAdvice = () => {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return "This looks like a network issue. Check your internet connection and try again."
    }
    if (message.includes('permission') || message.includes('auth')) {
      return "There might be a permissions issue. Try refreshing the page or logging out and back in."
    }
    if (message.includes('storage') || message.includes('quota')) {
      return "Your browser storage might be full. Try clearing some browser data."
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return "There was an issue loading the application. Refreshing should fix this."
    }
    
    return "An unexpected error occurred. Don't worry - your progress is saved automatically."
  }

  const getActionButtons = () => {
    const buttons = []
    
    if (onRetry && canRecover) {
      buttons.push(
        <Button key="retry" onClick={handleRetry} className="flex-1">
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      )
    }
    
    if (onGoBack) {
      buttons.push(
        <Button key="back" variant="outline" onClick={handleGoBack} className="flex-1">
          <ArrowLeft size={16} className="mr-2" />
          Go Back
        </Button>
      )
    }
    
    if (onReset) {
      buttons.push(
        <Button key="reset" variant="outline" onClick={handleReset} className="flex-1">
          <RefreshCw size={16} className="mr-2" />
          Start Over
        </Button>
      )
    }
    
    return buttons
  }

  return (
    <Card className={`max-w-lg mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <AlertTriangle size={24} className={getErrorSeverityColor()} />
          Oops! Something Went Sideways
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User-friendly explanation */}
        <Alert>
          <Lightbulb size={16} />
          <AlertDescription>
            {getRecoveryAdvice()}
          </AlertDescription>
        </Alert>

        {/* Error ID */}
        <div className="flex items-center justify-between p-3 bg-muted rounded">
          <div>
            <p className="text-sm font-medium">Error ID</p>
            <p className="text-xs text-muted-foreground font-mono">{errorId}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-reported
          </Badge>
        </div>

        {/* Action buttons */}
        {getActionButtons().length > 0 && (
          <div className="flex gap-2">
            {getActionButtons()}
          </div>
        )}

        {/* Feedback section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bug size={16} />
            <p className="text-sm font-medium">Help us improve</p>
          </div>
          
          <Textarea
            placeholder="What were you trying to do when this happened? (Optional)"
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            rows={3}
            maxLength={500}
          />
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitFeedback}
              disabled={!userFeedback.trim() || isSubmittingFeedback}
              className="flex-1"
            >
              {isSubmittingFeedback ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Send size={14} className="mr-2" />
              )}
              Send Feedback
            </Button>
            
            {feedbackSubmitted && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                <span className="text-sm">Thank you!</span>
              </div>
            )}
          </div>
        </div>

        {/* Technical details toggle */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full justify-between"
          >
            Technical Details
            <span className="transform transition-transform">
              {showTechnicalDetails ? '▲' : '▼'}
            </span>
          </Button>
          
          {showTechnicalDetails && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-muted rounded text-sm font-mono">
                <p><strong>Error:</strong> {error.name}</p>
                <p><strong>Message:</strong> {error.message}</p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack Trace</summary>
                    <pre className="mt-2 text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyErrorDetails}
                className="w-full"
              >
                {copiedToClipboard ? (
                  <>
                    <CheckCircle size={14} className="mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-2" />
                    Copy Error Details
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground text-center">
          Error details are stored locally and help us improve MixitFixit. 
          No personal conversation data is included.
        </p>
      </CardContent>
    </Card>
  )
}