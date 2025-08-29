/**
 * Multiplayer Connection Component
 * 
 * Handles session sharing, joining, and real-time connection status.
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Copy, 
  Wifi, 
  WifiOff, 
  Share, 
  UserPlus,
  AlertCircle,
  CheckCircle,
  Loader2
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface MultiplayerConnectionProps {
  sessionId?: string
  isHost: boolean
  isConnected: boolean
  isReconnecting: boolean
  participants: Array<{
    playerId: string
    isOnline: boolean
    lastSeen: number
    isTyping: boolean
  }>
  connectionError: string | null
  onEnableMultiplayer: () => Promise<string | null>
  onJoinSession: (sessionId: string) => Promise<boolean>
  onDisconnect: () => void
}

export default function MultiplayerConnection({
  sessionId,
  isHost,
  isConnected,
  isReconnecting,
  participants,
  connectionError,
  onEnableMultiplayer,
  onJoinSession,
  onDisconnect
}: MultiplayerConnectionProps) {
  const [joinSessionId, setJoinSessionId] = useState('')
  const [isEnabling, setIsEnabling] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleEnableMultiplayer = useCallback(async () => {
    setIsEnabling(true)
    try {
      const newSessionId = await onEnableMultiplayer()
      if (newSessionId) {
        toast.success('Multiplayer session created! Share the session ID with your partner.')
      } else {
        toast.error('Failed to create multiplayer session. Please try again.')
      }
    } catch (error) {
      toast.error('Failed to create multiplayer session')
    } finally {
      setIsEnabling(false)
    }
  }, [onEnableMultiplayer])

  const handleJoinSession = useCallback(async () => {
    if (!joinSessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    setIsJoining(true)
    try {
      const success = await onJoinSession(joinSessionId.trim())
      if (success) {
        toast.success('Successfully joined multiplayer session!')
        setJoinSessionId('')
      } else {
        toast.error('Invalid session ID or failed to join session')
      }
    } catch (error) {
      toast.error('Failed to join session')
    } finally {
      setIsJoining(false)
    }
  }, [joinSessionId, onJoinSession])

  const copySessionId = useCallback(() => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast.success('Session ID copied to clipboard!')
    }
  }, [sessionId])

  const getConnectionStatus = () => {
    if (isReconnecting) {
      return {
        icon: <Loader2 size={16} className="animate-spin" />,
        text: 'Reconnecting...',
        variant: 'secondary' as const
      }
    }
    
    if (isConnected) {
      return {
        icon: <Wifi size={16} />,
        text: 'Connected',
        variant: 'default' as const
      }
    }
    
    return {
      icon: <WifiOff size={16} />,
      text: 'Disconnected',
      variant: 'destructive' as const
    }
  }

  const status = getConnectionStatus()

  // Not in multiplayer mode
  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Real-Time Multiplayer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Work through your conflict together in real-time. Changes sync instantly between participants.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start New Session</Label>
              <Button 
                onClick={handleEnableMultiplayer}
                disabled={isEnabling}
                className="w-full"
                variant="default"
              >
                {isEnabling ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share size={16} className="mr-2" />
                    Create & Share
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Generate a session ID to share with your partner
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-session-id" className="text-sm font-medium">
                Join Existing Session
              </Label>
              <div className="flex gap-2">
                <Input
                  id="join-session-id"
                  placeholder="session-123456-abc123"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                />
                <Button 
                  onClick={handleJoinSession}
                  disabled={isJoining || !joinSessionId.trim()}
                  variant="outline"
                >
                  {isJoining ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the session ID shared by your partner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // In multiplayer mode
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} />
            Multiplayer Session
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            {status.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Session ID</Label>
          <div className="flex items-center gap-2">
            <Input
              value={sessionId}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={copySessionId}
              variant="outline"
              size="sm"
            >
              <Copy size={16} />
            </Button>
          </div>
          {isHost && (
            <p className="text-xs text-muted-foreground">
              Share this ID with your partner to join this session
            </p>
          )}
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle size={16} className="text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Connection Error</p>
              <p className="text-xs text-destructive/80">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Participants</Label>
          <div className="grid gap-2">
            {participants.map((participant) => (
              <div
                key={participant.playerId}
                className="flex items-center justify-between p-2 bg-muted/50 rounded border"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    participant.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {participant.playerId === 'player1' ? 'Player 1' : 'Player 2'}
                  </span>
                  {participant.isTyping && (
                    <Badge variant="secondary" className="text-xs">
                      Typing...
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {participant.isOnline ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle size={12} className="mr-1" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Last seen: {new Date(participant.lastSeen).toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isHost ? 'Hosting session' : 'Joined session'} • {participants.filter(p => p.isOnline).length} online
          </p>
          
          <Button
            onClick={onDisconnect}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}