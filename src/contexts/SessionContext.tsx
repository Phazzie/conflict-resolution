import React, { createContext, useContext, ReactNode } from 'react'
import { SessionData, PlayerRole } from '../types/session'

interface SessionContextType {
  sessionData: SessionData
  currentPlayer: PlayerRole
  updateSessionData: (updates: Partial<SessionData>) => void
  isLoading?: boolean
  error?: string
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
  children: ReactNode
  sessionData: SessionData
  currentPlayer: PlayerRole
  updateSessionData: (updates: Partial<SessionData>) => void
  isLoading?: boolean
  error?: string
}

export function SessionProvider({ 
  children, 
  sessionData, 
  currentPlayer, 
  updateSessionData,
  isLoading,
  error
}: SessionProviderProps) {
  return (
    <SessionContext.Provider value={{
      sessionData,
      currentPlayer,
      updateSessionData,
      isLoading,
      error
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// Utility hook to get current player's data
export function useCurrentPlayerData() {
  const { sessionData, currentPlayer } = useSession()
  
  return {
    steelMan: currentPlayer === 'player1' ? sessionData.playerOneSteelMan : sessionData.playerTwoSteelMan,
    statement: currentPlayer === 'player1' ? sessionData.playerOneStatement : sessionData.playerTwoStatement,
    isPlayer1: currentPlayer === 'player1'
  }
}

// Utility hook to get other player's data
export function useOtherPlayerData() {
  const { sessionData, currentPlayer } = useSession()
  const otherPlayer = currentPlayer === 'player1' ? 'player2' : 'player1'
  
  return {
    steelMan: currentPlayer === 'player1' ? sessionData.playerTwoSteelMan : sessionData.playerOneSteelMan,
    statement: currentPlayer === 'player1' ? sessionData.playerTwoStatement : sessionData.playerOneStatement,
    role: otherPlayer
  }
}