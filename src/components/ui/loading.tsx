import { CircleNotch } from '@phosphor-icons/react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  return (
    <div className="flex items-center gap-2">
      <CircleNotch className={`${sizeClasses[size]} animate-spin`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

interface TypingIndicatorProps {
  author: string
}

export function TypingIndicator({ author }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 p-3 text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '160ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '320ms' }} />
      </div>
      <span className="text-sm">{author} is thinking...</span>
    </div>
  )
}

interface SuccessCheckmarkProps {
  text?: string
  onAnimationComplete?: () => void
}

export function SuccessCheckmark({ text, onAnimationComplete }: SuccessCheckmarkProps) {
  return (
    <div 
      className="flex items-center gap-2 text-green-600 animate-in slide-in-from-left-5 duration-300"
      onAnimationEnd={onAnimationComplete}
    >
      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  )
}

interface PulsingDotProps {
  color?: 'blue' | 'green' | 'red' | 'yellow'
}

export function PulsingDot({ color = 'blue' }: PulsingDotProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500', 
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  }

  return (
    <div className={`w-2 h-2 ${colorClasses[color]} rounded-full animate-pulse`} />
  )
}