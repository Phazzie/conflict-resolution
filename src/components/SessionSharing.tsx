import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Copy, 
  Share, 
  UserCheck, 
  UserX, 
  Wifi, 
  WifiSlash,
  Crown,
  Clock
} from '@phosphor-icons/react'
import { SessionParticipant, PlayerRole } from '@/types/session'
import { realTimeSessionService } from '@/services/realTimeSession'
import { toast } from 'sonner'

interface SessionSharingProps {
  sessionId?: string
  currentPlayer: PlayerRole
  participants: SessionParticipant[]
  isMultiplayer: boolean
  onEnableMultiplayer: () => void
  onJoinSession: (sessionId: string) => Promise<boolean>
}

export default function SessionSharing({ 
  sessionId, 
  currentPlayer,
  participants,
  isMultiplayer,
  onEnableMultiplayer,
  onJoinSession
}: SessionSharingProps) {
  const [inviteLink, setInviteLink] = useState<string>('')
  const [joinSessionId, setJoinSessionId] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    setIsConnected(realTimeSessionService.isConnected())
    
    // Generate invite link if we have a session ID
    if (sessionId && isMultiplayer) {
      const link = realTimeSessionService.getSessionInviteLink()
      if (link) {
        setInviteLink(link)
      }
    }
  }, [sessionId, isMultiplayer])

  const handleCopyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied to clipboard!')
    }
  }

  const handleCreateSession = async () => {
    try {
      const newSessionId = await realTimeSessionService.createSession()
      onEnableMultiplayer()
      toast.success('Multiplayer session created! Share the link to invite someone.')
    } catch (error) {
      toast.error('Failed to create multiplayer session')
    }
  }

  const handleJoinSession = async () => {
    if (!joinSessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    setIsJoining(true)
    try {
      const success = await onJoinSession(joinSessionId.trim())
      if (success) {
        toast.success('Successfully joined session!')
      } else {
        toast.error('Session not found or full')
      }
    } catch (error) {
      toast.error('Failed to join session')
    } finally {
      setIsJoining(false)
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (!isMultiplayer) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users size={20} />
            Enable Real-Time Session Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Turn this into a multiplayer session to resolve conflicts together in real-time. 
            Both participants will see messages, AI analysis, and progress synchronously.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <UserCheck size={16} className="text-green-600" />
              <span className="text-green-900">Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Share size={16} className="text-blue-600" />
              <span className="text-blue-900">Synchronized AI analysis</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Clock size={16} className="text-purple-600" />
              <span className="text-purple-900">Typing indicators</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Wifi size={16} className="text-orange-600" />
              <span className="text-orange-900">Session persistence</span>
            </div>
          </div>

          <Button onClick={handleCreateSession} className="w-full">
            <Users size={16} className="mr-2" />
            Enable Multiplayer Session
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Or Join Existing Session</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter session ID"
                value={joinSessionId}
                onChange={(e) => setJoinSessionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
              />
              <Button 
                onClick={handleJoinSession}
                disabled={isJoining || !joinSessionId.trim()}
                variant="outline"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isConnected ? (
            <Wifi size={20} className="text-green-600" />
          ) : (
            <WifiSlash size={20} className="text-red-600" />
          )}
          Real-Time Session
          <Badge variant={isConnected ? 'default' : 'destructive'} className="ml-auto">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Session ID</span>
            <Badge variant="outline" className="font-mono text-xs">
              {sessionId}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this ID with someone to invite them to your conflict resolution session
          </p>
        </div>

        {/* Invite Link */}
        {inviteLink && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite Link</label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button onClick={handleCopyInviteLink} variant="outline" size="sm">
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send this link to someone. They'll join as the other participant.
            </p>
          </div>
        )}

        {/* Participants */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Participants ({participants.length}/2)</h4>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div 
                key={participant.playerId}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    participant.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {participant.playerId === currentPlayer ? 'You' : `Player ${participant.playerId.slice(-1)}`}
                    {participant.playerId === currentPlayer && (
                      <Crown size={14} className="inline ml-1 text-yellow-600" />
                    )}
                  </span>
                  {participant.isTyping && (
                    <Badge variant="secondary" className="text-xs">
                      typing...
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {participant.isOnline ? 'Online' : `Last seen ${formatLastSeen(participant.lastSeen)}`}
                </div>
              </div>
            ))}
            
            {participants.length < 2 && (
              <div className="flex items-center justify-between p-2 border rounded-lg border-dashed">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-sm text-muted-foreground">Waiting for second participant...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Alert>
            <WifiSlash size={16} />
            <AlertDescription>
              Connection lost. Attempting to reconnect... Messages will be sent when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Tips */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Real-Time Features Active:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <UserCheck size={12} />
              <span>Live message sync</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>Typing indicators</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>Presence detection</span>
            </div>
            <div className="flex items-center gap-1">
              <Share size={12} />
              <span>AI analysis sharing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}