/**
 * Real-Time Typing Indicator
 * 
 * Shows when the other participant is typing in real-time
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from '@phosphor-icons/react'

interface TypingIndicatorProps {
  participants: Array<{
    playerId: string
    isOnline: boolean
    isTyping: boolean
  }>
  currentPlayer: string
}

export default function TypingIndicator({ participants, currentPlayer }: TypingIndicatorProps) {
  const typingParticipants = participants.filter(
    p => p.playerId !== currentPlayer && p.isTyping && p.isOnline
  )

  if (typingParticipants.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <Badge variant="secondary" className="flex items-center gap-2">
        <Loader2 size={12} className="animate-spin" />
        <span className="text-xs">
          {typingParticipants.length === 1 
            ? `${typingParticipants[0].playerId} is typing...`
            : 'Multiple participants are typing...'
          }
        </span>
      </Badge>
    </div>
  )
}