import { Suspense, lazy } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { SessionData, PlayerRole } from '../types/session'
import { useFocusManagement, useScreenReaderAnnouncements } from '../hooks/useAccessibility'
import PhaseErrorBoundary from './PhaseErrorBoundary'
import ConflictContextSelector from './ConflictContextSelector'
import IssueAgreement from './IssueAgreement'
import SteelManningPhase from './SteelManningPhase'
import StatementLocking from './StatementLocking'
import DiscussionPhase from './DiscussionPhase'
import ResolutionPhase from './ResolutionPhase'
import SessionSummary from './SessionSummary'
import AIPreferencesSettings from './AIPreferencesSettings'
import AIPersonalityTesting from './AIPersonalityTesting'

// Lazy load heavy dashboard components
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))
const SessionHistoryDashboard = lazy(() => import('./SessionHistoryDashboard'))
const CouplesDashboard = lazy(() => import('./CouplesDashboard'))
const PatternRecognitionDashboard = lazy(() => import('./PatternRecognitionDashboard'))
const MLInsightsDashboard = lazy(() => import('./MLInsightsDashboard'))

// Loading component for lazy-loaded features
const DashboardLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Card className="max-w-md mx-auto">
      <CardContent className="flex items-center gap-3 p-6">
        <CircleNotch size={24} className="animate-spin text-primary" />
        <p className="text-muted-foreground">
          Loading advanced features...
        </p>
      </CardContent>
    </Card>
  </div>
)

interface PhaseRendererProps {
  sessionData: SessionData
  currentPlayer: PlayerRole
  updateSessionData: (updates: Partial<SessionData>) => void
  onReset: () => void
  onExportAnalytics: (data: string) => void
  // Multiplayer support
  isMultiplayer?: boolean
  participants?: Array<{
    playerId: string
    isOnline: boolean
    lastSeen: number
    isTyping: boolean
  }>
  onSendMessage?: (message: any) => void
  onTypingStatusChange?: (isTyping: boolean) => void
}

export default function PhaseRenderer({
  sessionData,
  currentPlayer,
  updateSessionData,
  onReset,
  onExportAnalytics,
  isMultiplayer = false,
  participants = [],
  onSendMessage,
  onTypingStatusChange
}: PhaseRendererProps) {
  const headingRef = useFocusManagement(sessionData.phase)
  const { announce } = useScreenReaderAnnouncements()

  // AI Preferences Phase
  if (sessionData.phase === 'ai-preferences') {
    return (
      <PhaseErrorBoundary phase="AI Preferences" onReset={onReset}>
        <section aria-labelledby="ai-preferences-heading">
          <div className="space-y-6">
            <div className="text-center">
              <h2 
                id="ai-preferences-heading" 
                ref={headingRef} 
                className="text-2xl font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" 
                tabIndex={-1}
              >
                AI Personality Setup
              </h2>
              <p className="text-muted-foreground">
                Before we dive into conflict resolution, let's customize how the AI communicates with you.
                This is crucial for a successful session.
              </p>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <AIPersonalityTesting 
                onComplete={(personality) => {
                  announce('AI personality selected. Continuing to context selection.')
                  // Auto-continue after A/B test
                  setTimeout(() => updateSessionData({ phase: 'context-selection' }), 2000)
                }}
              />
              <AIPreferencesSettings />
            </div>
            
            <div className="flex justify-center pt-4">
              <button 
                onClick={() => {
                  announce('Skipping to context selection')
                  updateSessionData({ phase: 'context-selection' })
                }}
                className="btn btn-outline btn-lg"
              >
                Skip to Context Selection
              </button>
            </div>
          </div>
        </section>
      </PhaseErrorBoundary>
    )
  }

  // Context Selection Phase
  if (sessionData.phase === 'context-selection') {
    return (
      <PhaseErrorBoundary phase="Context Selection" onReset={onReset}>
        <section aria-labelledby="context-selection-heading">
          <h2 
            id="context-selection-heading" 
            ref={headingRef} 
            className="sr-only focus:not-sr-only focus:text-2xl focus:font-bold focus:mb-4" 
            tabIndex={-1}
          >
            Choose Your Arena
          </h2>
          <ConflictContextSelector 
            sessionData={sessionData}
            updateSessionData={(updates) => {
              announce('Context selected. Moving to issue agreement.')
              updateSessionData(updates)
            }}
          />
        </section>
      </PhaseErrorBoundary>
    )
  }

  // Issue Agreement Phase
  if (sessionData.phase === 'issue-agreement') {
    return (
      <PhaseErrorBoundary phase="Issue Agreement" onReset={onReset}>
        <section aria-labelledby="issue-agreement-heading">
          <h2 
            id="issue-agreement-heading" 
            ref={headingRef} 
            className="sr-only focus:not-sr-only focus:text-2xl focus:font-bold focus:mb-4" 
            tabIndex={-1}
          >
            Issue Agreement
          </h2>
          <IssueAgreement 
            sessionData={sessionData}
            updateSessionData={(updates) => {
              if (updates.phase === 'steel-manning') {
                announce('Issue agreed upon. Moving to steel-manning phase.')
              }
              updateSessionData(updates)
            }}
          />
        </section>
      </PhaseErrorBoundary>
    )
  }
  
  // Steel-Manning Phase
  if (sessionData.phase === 'steel-manning') {
    return (
      <PhaseErrorBoundary phase="Steel Manning" onReset={onReset}>
        <SteelManningPhase
          sessionData={sessionData}
          currentPlayer={currentPlayer}
          updateSessionData={updateSessionData}
        />
      </PhaseErrorBoundary>
    )
  }

  // Statement Locking Phase
  if (sessionData.phase === 'statement-locking') {
    return (
      <PhaseErrorBoundary phase="Statement Locking" onReset={onReset}>
        <StatementLocking
          sessionData={sessionData}
          currentPlayer={currentPlayer}
          updateSessionData={updateSessionData}
        />
      </PhaseErrorBoundary>
    )
  }

  // Discussion Phase
  if (sessionData.phase === 'discussion') {
    return (
      <PhaseErrorBoundary phase="Discussion" onReset={onReset}>
        <DiscussionPhase
          sessionData={sessionData}
          currentPlayer={currentPlayer}
          updateSessionData={updateSessionData}
          isMultiplayer={isMultiplayer}
          participants={participants}
          onSendMessage={onSendMessage}
          onTypingStatusChange={onTypingStatusChange}
        />
      </PhaseErrorBoundary>
    )
  }

  // Resolution Phase
  if (sessionData.phase === 'resolution') {
    return (
      <PhaseErrorBoundary phase="Resolution" onReset={onReset}>
        <ResolutionPhase
          sessionData={sessionData}
          updateSessionData={updateSessionData}
        />
      </PhaseErrorBoundary>
    )
  }

  // Summary Phase
  if (sessionData.phase === 'summary') {
    return (
      <PhaseErrorBoundary phase="Summary" onReset={onReset}>
        <SessionSummary
          sessionData={sessionData}
          onReset={onReset}
        />
      </PhaseErrorBoundary>
    )
  }

  // Analytics Dashboard
  if (sessionData.phase === 'analytics') {
    return (
      <PhaseErrorBoundary phase="Analytics" onReset={onReset}>
        <Suspense fallback={<DashboardLoader />}>
          <AnalyticsDashboard onExport={onExportAnalytics} />
        </Suspense>
      </PhaseErrorBoundary>
    )
  }

  // Session History Dashboard
  if (sessionData.phase === 'history') {
    return (
      <PhaseErrorBoundary phase="Session History" onReset={onReset}>
        <Suspense fallback={<DashboardLoader />}>
          <SessionHistoryDashboard 
            currentSession={sessionData}
            onClose={() => updateSessionData({ phase: 'welcome' })}
            onExport={onExportAnalytics}
          />
        </Suspense>
      </PhaseErrorBoundary>
    )
  }

  // Couples Dashboard
  if (sessionData.phase === 'couples-dashboard') {
    return (
      <PhaseErrorBoundary phase="Couples Dashboard" onReset={onReset}>
        <Suspense fallback={<DashboardLoader />}>
          <CouplesDashboard 
            currentSession={sessionData}
            onClose={() => updateSessionData({ phase: 'welcome' })}
            onExport={onExportAnalytics}
          />
        </Suspense>
      </PhaseErrorBoundary>
    )
  }

  // Pattern Recognition Dashboard
  if (sessionData.phase === 'pattern-recognition') {
    return (
      <PhaseErrorBoundary phase="Pattern Recognition" onReset={onReset}>
        <Suspense fallback={<DashboardLoader />}>
          <PatternRecognitionDashboard 
            currentSession={sessionData}
            onClose={() => updateSessionData({ phase: 'welcome' })}
          />
        </Suspense>
      </PhaseErrorBoundary>
    )
  }

  // ML Insights Dashboard
  if (sessionData.phase === 'ml-insights') {
    return (
      <PhaseErrorBoundary phase="ML Insights" onReset={onReset}>
        <Suspense fallback={<DashboardLoader />}>
          <MLInsightsDashboard 
            onClose={() => updateSessionData({ phase: 'welcome' })}
            onExport={onExportAnalytics}
          />
        </Suspense>
      </PhaseErrorBoundary>
    )
  }

  // Fallback for unknown phases
  return (
    <PhaseErrorBoundary phase="Unknown" onReset={onReset}>
      <div className="text-center p-8">
        <p className="text-muted-foreground">Unknown phase: {sessionData.phase}</p>
        <button onClick={onReset} className="btn btn-primary mt-4">
          Reset Session
        </button>
      </div>
    </PhaseErrorBoundary>
  )
}