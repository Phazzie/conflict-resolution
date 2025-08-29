import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatCircle, Users, Lock, Brain, Heart, TrendUp, Share, UserPlus } from '@phosphor-icons/react'
import ErrorBoundary from './ErrorBoundary'
import MultiplayerConnection from './MultiplayerConnection'

interface WelcomeScreenMultiplayerProps {
  currentPlayer: 'player1' | 'player2'
  onStartSession: () => void
  onViewPatterns: () => void
  onViewCouples: () => void
  onViewMLInsights: () => void
  // Multiplayer props
  sessionId?: string
  isHost: boolean
  multiplayerConnectionState: {
    isConnected: boolean
    isReconnecting: boolean
    participants: Array<{
      playerId: string
      isOnline: boolean
      lastSeen: number
      isTyping: boolean
    }>
    connectionError: string | null
  }
  onEnableMultiplayer: () => Promise<string | null>
  onJoinSession: (sessionId: string) => Promise<boolean>
  onDisconnectMultiplayer: () => void
}

export default function WelcomeScreenMultiplayer({
  currentPlayer,
  onStartSession,
  onViewPatterns,
  onViewCouples,
  onViewMLInsights,
  sessionId,
  isHost,
  multiplayerConnectionState,
  onEnableMultiplayer,
  onJoinSession,
  onDisconnectMultiplayer
}: WelcomeScreenMultiplayerProps) {
  const [activeTab, setActiveTab] = useState('session')

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">MixitFixit</h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-2">
              Digital Thunderdome for All Your Conflicts
            </p>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              Whether it's relationship drama, workplace tension, or family feuds - 
              we've got the structured battleground where you're forced to listen, articulate, 
              and maybe (just maybe) not be a complete asshat.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="session">Start Session</TabsTrigger>
              <TabsTrigger value="multiplayer">Real-Time Multiplayer</TabsTrigger>
            </TabsList>

            <TabsContent value="session" className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users size={20} className="sm:w-6 sm:h-6" />
                    Ready to Stop Screaming and Start Scheming?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <ChatCircle size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">Issue Agreement</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Actually agree on what you're fighting about first
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Users size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">Steel-Manning Phase</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Prove you're not a narcissist by understanding the other person
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Lock size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">Statement Locking</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Carve your truth in digital stone - no takebacks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <ChatCircle size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">AI-Moderated Discussion</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Chat with a snarky AI referee calling out your BS
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Brain size={16} className="sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">ML-Enhanced Pattern Detection</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Machine learning that improves accuracy through your feedback
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Heart size={16} className="sm:w-5 sm:h-5 text-pink-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">Couples Dashboard</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Track shared goals and relationship patterns over time
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={onStartSession} 
                      size="lg" 
                      className="w-full text-sm sm:text-base mb-3"
                      aria-label="Start a new conflict resolution session"
                    >
                      Enter the Digital Thunderdome
                    </Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Dashboard options">
                      <Button 
                        onClick={onViewPatterns}
                        variant="outline" 
                        size="lg" 
                        className="text-sm sm:text-base"
                        aria-label="View pattern analysis dashboard"
                      >
                        <Brain size={16} className="mr-2" aria-hidden="true" />
                        Pattern Analysis
                      </Button>
                      <Button 
                        onClick={onViewCouples}
                        variant="outline" 
                        size="lg" 
                        className="text-sm sm:text-base"
                        aria-label="View couples progress dashboard"
                      >
                        <Heart size={16} className="mr-2" aria-hidden="true" />
                        Couples Dashboard
                      </Button>
                      <Button 
                        onClick={onViewMLInsights}
                        variant="outline" 
                        size="lg" 
                        className="text-sm sm:text-base col-span-1 sm:col-span-2"
                        aria-label="View machine learning insights and training"
                      >
                        <TrendUp size={16} className="mr-2" aria-hidden="true" />
                        ML Insights & Training
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      You're {currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} in this session
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multiplayer" className="space-y-6">
              <MultiplayerConnection
                sessionId={sessionId}
                isHost={isHost}
                isConnected={multiplayerConnectionState.isConnected}
                isReconnecting={multiplayerConnectionState.isReconnecting}
                participants={multiplayerConnectionState.participants}
                connectionError={multiplayerConnectionState.connectionError}
                onEnableMultiplayer={onEnableMultiplayer}
                onJoinSession={onJoinSession}
                onDisconnect={onDisconnectMultiplayer}
              />
              
              {sessionId && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground">
                        Ready to start your multiplayer session?
                      </p>
                      <Button 
                        onClick={() => {
                          onStartSession()
                          setActiveTab('session')
                        }}
                        size="lg"
                        className="w-full"
                        disabled={!multiplayerConnectionState.isConnected}
                      >
                        Start Multiplayer Session
                      </Button>
                      {!multiplayerConnectionState.isConnected && (
                        <p className="text-xs text-muted-foreground">
                          Connect to multiplayer first to start a real-time session
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  )
}