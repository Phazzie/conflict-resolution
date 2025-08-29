import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChartBar, History, Brain, Heart, TrendUp } from '@phosphor-icons/react'
import { PHASE_PROGRESS, PHASE_NAMES, SessionData, PlayerRole } from '../types/session'

interface SessionHeaderProps {
  sessionData: SessionData
  currentPlayer: PlayerRole
  hasActiveSession: boolean
  sessionWarnings: string[]
  onViewAnalytics: () => void
  onViewPatterns: () => void
  onViewCouples: () => void
  onViewMLInsights: () => void
  onViewHistory: () => void
  onReset: () => void
}

export default function SessionHeader({
  sessionData,
  currentPlayer,
  hasActiveSession,
  sessionWarnings,
  onViewAnalytics,
  onViewPatterns,
  onViewCouples,
  onViewMLInsights,
  onViewHistory,
  onReset
}: SessionHeaderProps) {
  return (
    <>
      <header className="border-b bg-card" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">MixitFixit</h1>
              <Badge variant="outline" className="text-xs whitespace-nowrap" aria-label={`Current player: ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}`}>
                {currentPlayer === 'player1' ? 'P1' : 'P2'}
              </Badge>
              {hasActiveSession && (
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex" aria-label="Session has been recovered from previous visit">
                  Session Recovered
                </Badge>
              )}
            </div>
            <nav className="flex items-center gap-2" role="navigation" aria-label="Main navigation">
              {sessionData.messages.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onViewAnalytics}
                  className="text-xs sm:text-sm"
                  aria-label="View session analytics"
                >
                  <ChartBar size={16} className="mr-1" aria-hidden="true" />
                  Analytics
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewPatterns}
                className="text-xs sm:text-sm"
                aria-label="View relationship patterns"
              >
                <Brain size={16} className="mr-1" aria-hidden="true" />
                Patterns
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewCouples}
                className="text-xs sm:text-sm"
                aria-label="View couples dashboard"
              >
                <Heart size={16} className="mr-1" aria-hidden="true" />
                Couples
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewMLInsights}
                className="text-xs sm:text-sm"
                aria-label="View machine learning insights"
              >
                <TrendUp size={16} className="mr-1" aria-hidden="true" />
                ML
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewHistory}
                className="text-xs sm:text-sm"
                aria-label="View session history"
              >
                <History size={16} className="mr-1" aria-hidden="true" />
                History
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset} 
                className="text-xs sm:text-sm"
                aria-label="Reset current session"
              >
                Reset
              </Button>
            </nav>
          </div>
          
          <div className="mt-3 sm:mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate mr-2">
                {PHASE_NAMES[sessionData.phase]}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {PHASE_PROGRESS[sessionData.phase]}%
              </span>
            </div>
            <Progress 
              value={PHASE_PROGRESS[sessionData.phase]} 
              className="w-full" 
              aria-label={`Session progress: ${PHASE_PROGRESS[sessionData.phase]}% complete`}
            />
          </div>
        </div>
      </header>

      {/* Session warnings display */}
      {sessionWarnings.length > 0 && (
        <div className="bg-warning/10 border-b border-warning/20" role="alert" aria-live="polite">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
            <div className="text-sm text-warning-foreground">
              <strong>Session recovered with warnings:</strong> {sessionWarnings[0]}
              {sessionWarnings.length > 1 && (
                <span className="text-xs ml-2">
                  (+{sessionWarnings.length - 1} more)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}