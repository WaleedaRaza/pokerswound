'use client'

import { useState, useCallback, useEffect } from 'react'
import { PokerGameEngine, GameSettings, Player, PlayerAction } from '@entropoker/game-engine'

export function useGameState() {
  const [engine] = useState(() => {
    const settings: GameSettings = {
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      timeBank: 30,
      autoFoldDelay: 10
    }
    return new PokerGameEngine(settings)
  })

  const [gameState, setGameState] = useState(engine.getState())
  const [isUserTurn, setIsUserTurn] = useState(false)
  const [turnTimer, setTurnTimer] = useState(30)
  const [activeMenu, setActiveMenu] = useState<'game' | 'entropy' | 'settings'>('game')

  const currentPlayer = gameState.players[gameState.currentPlayerIndex] || null

  // Update user turn status
  useEffect(() => {
    const isUserTurnNow = currentPlayer?.id === '1'
    setIsUserTurn(isUserTurnNow)
  }, [currentPlayer])

  // Turn timer for user
  useEffect(() => {
    if (isUserTurn && gameState.phase !== 'waiting' && gameState.phase !== 'handComplete') {
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            handlePlayerAction('fold')
            return 30
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setTurnTimer(30)
    }
  }, [isUserTurn, gameState.phase])

  // AI logic for non-user turns
  useEffect(() => {
    if (!isUserTurn && gameState.phase !== 'waiting' && gameState.phase !== 'handComplete' && currentPlayer && currentPlayer.id !== '1') {
      // AI thinking delay - shorter for faster gameplay
      const aiTimer = setTimeout(() => {
        // Simple AI logic
        const aiAction = getAIAction(currentPlayer, gameState)
        console.log(`🤖 AI ${currentPlayer.name} action:`, aiAction)
        if (aiAction.action) {
          handlePlayerAction(aiAction.action, aiAction.amount)
        }
      }, 800) // Reduced to 800ms for faster gameplay
      
      return () => clearTimeout(aiTimer)
    }
  }, [isUserTurn, gameState.phase, currentPlayer])

  // Force action if game gets stuck
  useEffect(() => {
    if (gameState.phase !== 'waiting' && gameState.phase !== 'handComplete' && currentPlayer && currentPlayer.id !== '1') {
      const forceTimer = setTimeout(() => {
        // Force AI to act if they haven't in 3 seconds
        console.log(`🤖 FORCE: AI ${currentPlayer.name} forced to act`)
        const aiAction = getAIAction(currentPlayer, gameState)
        if (aiAction.action) {
          handlePlayerAction(aiAction.action, aiAction.amount)
        }
      }, 3000)
      
      return () => clearTimeout(forceTimer)
    }
  }, [currentPlayer, gameState.phase])

  // Simple AI logic - more aggressive
  const getAIAction = (player: any, gameState: any) => {
    const callAmount = gameState.currentBet - player.bet
    
    // More aggressive AI strategy
    const random = Math.random()
    
    if (callAmount === 0) {
      // No bet to call, check or bet
      if (random < 0.6) {
        return { action: 'check' as PlayerAction }
      } else {
        const betAmount = Math.min(player.chips, gameState.minRaise)
        return { action: 'bet' as PlayerAction, amount: betAmount }
      }
    } else if (callAmount <= player.chips * 0.3) {
      // Small/medium call, 90% chance to call
      if (random < 0.9) {
        return { action: 'call' as PlayerAction }
      } else {
        return { action: 'fold' as PlayerAction }
      }
    } else if (callAmount <= player.chips * 0.7) {
      // Big call, 60% chance to call
      if (random < 0.6) {
        return { action: 'call' as PlayerAction }
      } else {
        return { action: 'fold' as PlayerAction }
      }
    } else {
      // Very big call, 30% chance to call
      if (random < 0.3) {
        return { action: 'call' as PlayerAction }
      } else {
        return { action: 'fold' as PlayerAction }
      }
    }
  }

  const startNewGame = useCallback(async () => {
    try {
      console.log('🎮 GAME: Starting new Texas Hold\'em game with entropy shuffling...')
      
      const players: Omit<Player, 'cards' | 'bet' | 'folded' | 'allIn' | 'isDealer' | 'isSmallBlind' | 'isBigBlind' | 'isCurrentPlayer' | 'lastAction' | 'timeBank'>[] = [
        {
          id: '1',
          name: 'You',
          chips: 1000,
          position: 0
        },
        {
          id: '2',
          name: 'Alice',
          chips: 1000,
          position: 1
        },
        {
          id: '3',
          name: 'Bob',
          chips: 1000,
          position: 2
        }
      ]

      const newState = await engine.startNewGame(players)
      setGameState(newState)
      
      console.log('🎮 GAME: New game started successfully with entropy shuffling:', {
        players: newState.players.length,
        phase: newState.phase,
        deckSize: newState.deck.length
      })
    } catch (error) {
      console.error('❌ GAME: Error starting new game:', error)
    }
  }, [engine])

  const startNewHand = useCallback(async () => {
    try {
      console.log('🔄 GAME: Starting new hand...')
      
      const newState = await engine.startNewHand()
      setGameState(newState)
      
      console.log('🔄 GAME: New hand started:', {
        handNumber: newState.handNumber,
        phase: newState.phase,
        currentPlayer: newState.players[newState.currentPlayerIndex].name
      })
    } catch (error) {
      console.error('❌ GAME: Error starting new hand:', error)
    }
  }, [engine])

  // Auto-start new hand when current hand completes
  useEffect(() => {
    if (gameState.phase === 'handComplete') {
      console.log('🔄 GAME: Hand complete, starting new hand in 2 seconds...')
      const newHandTimer = setTimeout(() => {
        startNewHand()
      }, 2000) // Reduced to 2 seconds
      
      return () => clearTimeout(newHandTimer)
    }
  }, [gameState.phase, startNewHand])

  const dealFlop = useCallback(() => {
    try {
      // Don't allow manual dealing if hand is complete
      if (gameState.phase === 'handComplete') {
        console.log('❌ GAME: Cannot deal flop - hand is complete')
        return
      }
      engine.dealFlop()
      setGameState(engine.getState())
      console.log('🃏 GAME: Dealt flop')
    } catch (error) {
      console.error('❌ GAME: Error dealing flop:', error)
    }
  }, [engine, gameState.phase])

  const dealTurn = useCallback(() => {
    try {
      // Don't allow manual dealing if hand is complete
      if (gameState.phase === 'handComplete') {
        console.log('❌ GAME: Cannot deal turn - hand is complete')
        return
      }
      engine.dealTurn()
      setGameState(engine.getState())
      console.log('🃏 GAME: Dealt turn')
    } catch (error) {
      console.error('❌ GAME: Error dealing turn:', error)
    }
  }, [engine, gameState.phase])

  const dealRiver = useCallback(() => {
    try {
      // Don't allow manual dealing if hand is complete
      if (gameState.phase === 'handComplete') {
        console.log('❌ GAME: Cannot deal river - hand is complete')
        return
      }
      engine.dealRiver()
      setGameState(engine.getState())
      console.log('🃏 GAME: Dealt river')
    } catch (error) {
      console.error('❌ GAME: Error dealing river:', error)
    }
  }, [engine, gameState.phase])

  const handlePlayerAction = useCallback((action: PlayerAction, amount?: number) => {
    if (!currentPlayer) {
      console.log('❌ GAME: No current player for action:', action)
      return
    }

    try {
      console.log(`🎯 GAME: User action: ${action}${amount ? ` ($${amount})` : ''}`)
      console.log('🎯 GAME: Before action - current state:', {
        phase: gameState.phase,
        pot: gameState.pot,
        currentPlayer: gameState.players[gameState.currentPlayerIndex]?.name,
        currentPlayerIndex: gameState.currentPlayerIndex
      })
      
      const newState = engine.handlePlayerAction(currentPlayer.id, action, amount)
      
      console.log('🎯 GAME: After action - new state:', {
        phase: newState.phase,
        pot: newState.pot,
        currentPlayer: newState.players[newState.currentPlayerIndex]?.name,
        currentPlayerIndex: newState.currentPlayerIndex
      })
      
      setGameState(newState)
      
      console.log('✅ GAME: State updated in React')
    } catch (error) {
      console.error('❌ GAME: Error handling player action:', error)
    }
  }, [currentPlayer, engine, gameState])

  // Game state derived values
  const canCheck = currentPlayer?.bet === gameState.currentBet
  const minRaise = gameState.minRaise
  const maxRaise = currentPlayer?.chips || 0

  return {
    gameState,
    currentPlayer,
    handlePlayerAction,
    startNewGame,
    startNewHand,
    dealFlop,
    dealTurn,
    dealRiver,
    canCheck,
    minRaise,
    maxRaise,
    isUserTurn,
    turnTimer,
    activeMenu,
    setActiveMenu
  }
} 