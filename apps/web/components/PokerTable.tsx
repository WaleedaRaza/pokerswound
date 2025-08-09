'use client'

import { GameState, Card } from '@/types/game'
import PlayingCard from './PlayingCard'
import PlayerSeat from './PlayerSeat'

interface PokerTableProps {
  gameState: GameState
  isUserTurn?: boolean
  turnTimer?: number
}

export default function PokerTable({ gameState, isUserTurn = false, turnTimer = 30 }: PokerTableProps) {
  // Map player positions around the table
  const getPlayerPosition = (index: number, totalPlayers: number): string => {
    if (totalPlayers === 1) return 'bottom'
    if (totalPlayers === 2) return index === 0 ? 'bottom' : 'top'
    if (totalPlayers === 3) {
      if (index === 0) return 'bottom'
      if (index === 1) return 'top-right'
      return 'top-left'
    }
    if (totalPlayers === 4) {
      if (index === 0) return 'bottom'
      if (index === 1) return 'right'
      if (index === 2) return 'top'
      return 'left'
    }
    if (totalPlayers === 5) {
      if (index === 0) return 'bottom'
      if (index === 1) return 'bottom-right'
      if (index === 2) return 'top-right'
      if (index === 3) return 'top-left'
      return 'bottom-left'
    }
    if (totalPlayers === 6) {
      if (index === 0) return 'bottom'
      if (index === 1) return 'bottom-right'
      if (index === 2) return 'top-right'
      if (index === 3) return 'top'
      if (index === 4) return 'top-left'
      return 'bottom-left'
    }
    return 'bottom'
  }

  return (
    <div className="relative w-full aspect-[4/3] max-w-5xl mx-auto">
      {/* Clean Modern Poker Table */}
      <div className="relative w-full h-full">
        {/* Table Background */}
        <div className="absolute inset-0 bg-emerald-700 rounded-3xl shadow-2xl">
          {/* Center Area */}
          <div className="absolute inset-8 bg-emerald-600 rounded-2xl">
            
            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="flex gap-3 mb-6">
                {gameState.communityCards.length > 0 ? (
                  gameState.communityCards.map((card, index) => (
                    <PlayingCard key={card.id} card={card} className="w-16 h-24" />
                  ))
                ) : (
                  // Show card backs for flop
                  Array.from({ length: 5 }).map((_, index) => (
                    <PlayingCard 
                      key={index} 
                      card={{ suit: 'clubs', rank: 'A', id: `back-${index}`, value: 14 }} 
                      isFaceDown={true}
                      className="w-16 h-24"
                    />
                  ))
                )}
              </div>
              
              {/* Pot Display */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full">
                  <span className="text-white font-bold text-lg">Pot:</span>
                  <span className="text-white font-bold text-xl">${gameState.pot.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Seats */}
        {gameState.players.map((player, index) => (
          <PlayerSeat
            key={player.id}
            player={{
              id: player.id,
              name: player.name,
              chips: player.chips,
              position: getPlayerPosition(index, gameState.players.length),
              cards: player.cards,
              bet: player.bet,
              folded: player.folded
            }}
            position={getPlayerPosition(index, gameState.players.length)}
            isCurrentTurn={gameState.currentPlayerIndex === index}
            isDealer={gameState.dealerIndex === index}
            isUser={player.id === '1'}
            isUserTurn={isUserTurn && player.id === '1'}
            turnTimer={turnTimer}
          />
        ))}

        {/* Game Phase Indicator */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full">
            <span className="text-white font-bold capitalize text-lg">
              {gameState.phase}
            </span>
          </div>
        </div>

        {/* Turn Indicator */}
        {isUserTurn && (
          <div className="absolute top-6 right-6">
            <div className="bg-emerald-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 font-bold text-sm">YOUR TURN</span>
                <span className="text-emerald-400 text-sm">({turnTimer}s)</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Bet Indicator */}
        {gameState.currentBet > 0 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-blue-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/30">
              <span className="text-blue-400 font-bold text-sm">
                Current Bet: ${gameState.currentBet.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Game Status */}
        <div className="absolute bottom-6 right-6">
          <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-gray-300 text-sm">
              Hand #{gameState.handNumber}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 