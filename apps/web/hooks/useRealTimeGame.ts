'use client'

import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface GameState {
  game: {
    id: string
    name: string
    status: string
    smallBlind: number
    bigBlind: number
  }
  currentHand: {
    id: string
    handNumber: number
    phase: string
    pot: number
    communityCards: string[]
  } | null
  players: Array<{
    id: string
    userId: string
    username: string
    position: number
    chips: number
    isDealer: boolean
    isActive: boolean
    holeCards?: string[]
    currentBet: number
    lastAction?: string
  }>
  communityCards: string[]
  pot: number
  currentBet: number
  phase: string
  currentPlayerId?: string
  handNumber: number
}

interface UseRealTimeGameProps {
  gameId: string
  userId: string
}

export function useRealTimeGame({ gameId, userId }: UseRealTimeGameProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001')
    
    newSocket.on('connect', () => {
      console.log('🔌 Connected to backend')
      setIsConnected(true)
      setError(null)
      
      // Join the game
      newSocket.emit('join-game', { gameId, userId })
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend')
      setIsConnected(false)
    })

    newSocket.on('game-state', (state: GameState) => {
      console.log('🎮 Received game state:', state)
      setGameState(state)
    })

    newSocket.on('error', (data: { message: string }) => {
      console.error('❌ Socket error:', data.message)
      setError(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [gameId, userId])

  // Send player action
  const sendAction = useCallback((action: string, amount?: number) => {
    if (!socket || !isConnected) {
      setError('Not connected to game')
      return
    }

    console.log(`🎯 Sending action: ${action}${amount ? ` ($${amount})` : ''}`)
    socket.emit('player-action', { action, amount })
  }, [socket, isConnected])

  // Game actions
  const fold = useCallback(() => sendAction('FOLD'), [sendAction])
  const check = useCallback(() => sendAction('CHECK'), [sendAction])
  const call = useCallback(() => sendAction('CALL'), [sendAction])
  const bet = useCallback((amount: number) => sendAction('BET', amount), [sendAction])
  const raise = useCallback((amount: number) => sendAction('RAISE', amount), [sendAction])
  const allIn = useCallback(() => sendAction('ALL_IN'), [sendAction])

  // Deal community cards (admin only)
  const dealFlop = useCallback(() => {
    if (!socket || !isConnected) return
    socket.emit('admin-action', { action: 'DEAL_FLOP' })
  }, [socket, isConnected])

  const dealTurn = useCallback(() => {
    if (!socket || !isConnected) return
    socket.emit('admin-action', { action: 'DEAL_TURN' })
  }, [socket, isConnected])

  const dealRiver = useCallback(() => {
    if (!socket || !isConnected) return
    socket.emit('admin-action', { action: 'DEAL_RIVER' })
  }, [socket, isConnected])

  // Get current player info
  const currentPlayer = gameState?.players.find(p => p.userId === userId)
  const isUserTurn = gameState?.currentPlayerId === userId

  // Calculate call amount
  const callAmount = gameState ? gameState.currentBet - (currentPlayer?.currentBet || 0) : 0

  return {
    // State
    gameState,
    isConnected,
    error,
    currentPlayer,
    isUserTurn,
    callAmount,
    
    // Actions
    fold,
    check,
    call,
    bet,
    raise,
    allIn,
    dealFlop,
    dealTurn,
    dealRiver,
    
    // Utilities
    sendAction
  }
} 