'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameState, Player, PlayerAction, Card } from '@/types/game'

// Import the real game engine
import { DeckManager, HandEvaluator } from '@entropoker/game-engine'

interface UseGameStateReturn {
  gameState: GameState
  currentPlayer: Player
  handlePlayerAction: (action: PlayerAction, amount?: number) => void
  startNewGame: () => void
  dealCards: () => void
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    pot: 0,
    currentBet: 0,
    communityCards: [],
    players: [],
    dealer: 0,
    currentPlayer: 0,
  })

  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    id: '1',
    name: 'You',
    chips: 1000,
    cards: [],
    isDealer: false,
    isActive: true,
    currentBet: 0,
    isFolded: false,
    isAllIn: false,
  })

  // Use the real deck manager
  const [deck, setDeck] = useState<any>(null)

  // Auto-deal community cards when phase changes
  useEffect(() => {
    if (!deck) return

    if (gameState.phase === 'flop' && deck.cards.length >= 3) {
      const { drawn, remaining } = DeckManager.drawCards(deck, 3)
      setDeck(remaining)
      setGameState(prev => ({
        ...prev,
        communityCards: drawn
      }))
    } else if (gameState.phase === 'turn' && deck.cards.length >= 1) {
      const { drawn, remaining } = DeckManager.drawCards(deck, 1)
      setDeck(remaining)
      setGameState(prev => ({
        ...prev,
        communityCards: [...prev.communityCards, ...drawn]
      }))
    } else if (gameState.phase === 'river' && deck.cards.length >= 1) {
      const { drawn, remaining } = DeckManager.drawCards(deck, 1)
      setDeck(remaining)
      setGameState(prev => ({
        ...prev,
        communityCards: [...prev.communityCards, ...drawn]
      }))
    }
  }, [gameState.phase, deck])

  const startNewGame = useCallback(() => {
    // Create a real deck using the game engine
    const newDeck = DeckManager.createDeck()
    setDeck(newDeck)
    
    // Create mock players
    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'You',
        chips: 1000,
        cards: [],
        isDealer: false,
        isActive: true,
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
      },
      {
        id: '2',
        name: 'Alice',
        chips: 1500,
        cards: [],
        isDealer: true,
        isActive: true,
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
      },
      {
        id: '3',
        name: 'Bob',
        chips: 800,
        cards: [],
        isDealer: false,
        isActive: true,
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
      },
    ]

    setGameState({
      phase: 'preflop',
      pot: 0,
      currentBet: 0,
      communityCards: [],
      players: mockPlayers,
      dealer: 1,
      currentPlayer: 0,
    })

    setCurrentPlayer(mockPlayers[0])
  }, [])

  const dealCards = useCallback(() => {
    if (!deck || deck.cards.length < 6) return // Need at least 6 cards (2 per player)

    const newDeck = { ...deck }
    const newPlayers = gameState.players.map(player => {
      const { drawn, remaining } = DeckManager.drawCards(newDeck, 2)
      newDeck.cards = remaining.cards
      return {
        ...player,
        cards: drawn
      }
    })

    setDeck(newDeck)
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      phase: 'preflop'
    }))
    setCurrentPlayer(newPlayers[0])
  }, [deck, gameState.players])

  const handlePlayerAction = useCallback((action: PlayerAction, amount?: number) => {
    console.log('Player action:', action, amount)

    setGameState(prev => {
      const newState = { ...prev }
      const currentPlayerIndex = newState.currentPlayer
      const currentPlayerState = newState.players[currentPlayerIndex]

      switch (action) {
        case 'fold':
          currentPlayerState.isFolded = true
          break
        case 'check':
          // Can only check if no bet to call
          if (newState.currentBet === 0) {
            // Move to next player
          }
          break
        case 'call':
          const callAmount = newState.currentBet - currentPlayerState.currentBet
          if (callAmount <= currentPlayerState.chips) {
            currentPlayerState.chips -= callAmount
            currentPlayerState.currentBet = newState.currentBet
            newState.pot += callAmount
          }
          break
        case 'bet':
        case 'raise':
          if (amount && amount <= currentPlayerState.chips) {
            const betAmount = action === 'raise' 
              ? amount - currentPlayerState.currentBet 
              : amount
            currentPlayerState.chips -= betAmount
            currentPlayerState.currentBet = amount
            newState.currentBet = amount
            newState.pot += betAmount
          }
          break
        case 'all-in':
          const allInAmount = currentPlayerState.chips
          currentPlayerState.chips = 0
          currentPlayerState.currentBet += allInAmount
          currentPlayerState.isAllIn = true
          newState.pot += allInAmount
          if (allInAmount > newState.currentBet) {
            newState.currentBet = allInAmount
          }
          break
      }

      // Move to next player
      newState.currentPlayer = (currentPlayerIndex + 1) % newState.players.length

      // Check if round is complete
      const activePlayers = newState.players.filter(p => !p.isFolded && !p.isAllIn)
      if (activePlayers.length <= 1) {
        // Move to next phase or end game
        if (newState.phase === 'preflop') {
          newState.phase = 'flop'
        } else if (newState.phase === 'flop') {
          newState.phase = 'turn'
        } else if (newState.phase === 'turn') {
          newState.phase = 'river'
        } else if (newState.phase === 'river') {
          newState.phase = 'showdown'
          // TODO: Evaluate hands and determine winner
        }
      }

      return newState
    })

    // Update current player state
    setCurrentPlayer(prev => {
      const newState = { ...prev }
      switch (action) {
        case 'fold':
          newState.isFolded = true
          break
        case 'call':
          const callAmount = gameState.currentBet - newState.currentBet
          if (callAmount <= newState.chips) {
            newState.chips -= callAmount
            newState.currentBet = gameState.currentBet
          }
          break
        case 'bet':
        case 'raise':
          if (amount && amount <= newState.chips) {
            const betAmount = action === 'raise' 
              ? amount - newState.currentBet 
              : amount
            newState.chips -= betAmount
            newState.currentBet = amount
          }
          break
        case 'all-in':
          newState.chips = 0
          newState.isAllIn = true
          break
      }
      return newState
    })
  }, [gameState.currentBet, gameState.phase])

  return {
    gameState,
    currentPlayer,
    handlePlayerAction,
    startNewGame,
    dealCards,
  }
} 