import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Microphone, 
  MicrophoneSlash, 
  Robot, 
  User, 
  Warning,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  ArrowUp,
  ArrowDown
} from '@phosphor-icons/react'
import { Message } from '@/types/session'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileDiscussionInterfaceProps {
  messages: Message[]
  currentMessage: string
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  isLoading?: boolean
  currentPlayer: 'player1' | 'player2'
  onAIFeedback?: (messageId: string, helpful: boolean) => void
  className?: string
}

export default function MobileDiscussionInterface({
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  isLoading = false,
  currentPlayer,
  onAIFeedback,
  className
}: MobileDiscussionInterfaceProps) {
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  // Show scroll hint if there are many messages
  useEffect(() => {
    if (messages.length > 5) {
      setShowScrollHint(true)
      const timer = setTimeout(() => setShowScrollHint(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [messages.length])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [currentMessage])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // On mobile, don't send on enter by default to avoid accidental sends
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleVoiceToggle = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Please type your message instead.')
      return
    }

    try {
      if (!isVoiceRecording) {
        // Start voice recognition
        const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsVoiceRecording(true)
        }

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          onMessageChange(currentMessage + (currentMessage ? ' ' : '') + transcript)
          setIsVoiceRecording(false)
        }

        recognition.onerror = () => {
          setIsVoiceRecording(false)
          alert('Voice recognition error. Please try typing instead.')
        }

        recognition.onend = () => {
          setIsVoiceRecording(false)
        }

        recognition.start()
      } else {
        // Stop recording (browser will handle this automatically)
        setIsVoiceRecording(false)
      }
    } catch (error) {
      setIsVoiceRecording(false)
      alert('Voice recognition failed. Please type your message instead.')
    }
  }

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  const scrollToTop = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  const renderMessage = (message: Message, index: number) => {
    const isCurrentPlayer = message.author === currentPlayer
    const isAI = message.author === 'ai'
    
    return (
      <div
        key={message.id}
        className={`flex ${isCurrentPlayer ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[85%] ${isCurrentPlayer ? 'order-2' : 'order-1'}`}>
          {/* Message bubble */}
          <div
            className={`p-3 rounded-2xl ${
              isAI
                ? 'bg-accent text-accent-foreground'
                : isCurrentPlayer
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {/* Author indicator */}
            <div className="flex items-center gap-2 mb-1">
              {isAI ? (
                <Robot size={14} />
              ) : (
                <User size={14} />
              )}
              <span className="text-xs font-medium">
                {isAI ? 'AI Referee' : `Player ${message.author === 'player1' ? '1' : '2'}`}
              </span>
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            {/* Message content */}
            <p className="text-sm leading-relaxed">{message.content}</p>
            
            {/* AI Analysis indicators */}
            {message.aiAnalysis && (
              <div className="mt-2 pt-2 border-t border-current/20">
                {message.aiAnalysis.hasManipulation && (
                  <div className="flex items-center gap-1 mb-1">
                    <Warning size={12} className="text-amber-500" />
                    <span className="text-xs">Pattern detected</span>
                  </div>
                )}
                {message.aiAnalysis.deescalationNeeded && (
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb size={12} className="text-blue-500" />
                    <span className="text-xs">De-escalation suggested</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* AI feedback buttons for AI messages */}
          {isAI && onAIFeedback && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onAIFeedback(message.id, true)}
              >
                <ThumbsUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onAIFeedback(message.id, false)}
              >
                <ThumbsDown size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!isMobile) {
    // Return a simplified version for desktop
    return (
      <div className={className}>
        <div className="space-y-4">
          {messages.map(renderMessage)}
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Messages Area */}
        <div
          ref={messagesRef}
          className="h-[60vh] overflow-y-auto p-4 space-y-4"
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
          }}
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Robot size={48} className="mx-auto mb-4 opacity-50" />
              <p>Start the conversation...</p>
              <p className="text-sm mt-2">The AI will help moderate your discussion</p>
            </div>
          )}
          
          {messages.map(renderMessage)}
          
          {/* Scroll hint */}
          {showScrollHint && messages.length > 5 && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-10">
              <Alert className="w-auto">
                <ArrowDown size={16} />
                <AlertDescription className="text-xs">
                  Swipe to scroll through messages
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Floating scroll controls */}
        {messages.length > 3 && (
          <div className="fixed right-4 bottom-32 flex flex-col gap-2 z-10">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-full shadow-lg"
              onClick={scrollToTop}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown size={16} />
            </Button>
          </div>
        )}

        {/* Input Area - Fixed at bottom for easy thumb access */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-end gap-2">
            {/* Voice input toggle */}
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 flex-shrink-0"
              onClick={handleVoiceToggle}
              disabled={isLoading}
            >
              {isVoiceRecording ? (
                <MicrophoneSlash size={16} className="text-red-500" />
              ) : (
                <Microphone size={16} />
              )}
            </Button>

            {/* Message input */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="min-h-[44px] max-h-[120px] resize-none text-base"
                rows={1}
              />
            </div>

            {/* Send button - Large and thumb-friendly */}
            <Button
              onClick={onSendMessage}
              disabled={!currentMessage.trim() || isLoading}
              size="sm"
              className="h-10 w-10 p-0 flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>

          {/* Character count for mobile users */}
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>{currentMessage.length}/500 characters</span>
            {currentMessage.length > 400 && (
              <Badge variant="outline" className="text-xs">
                Almost at limit
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}