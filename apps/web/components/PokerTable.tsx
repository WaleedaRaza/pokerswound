'use client'

import { GameState, Card } from '@/types/game'
import PlayingCard from './PlayingCard'
import PlayerSeat from './PlayerSeat'

interface PokerTableProps {
  gameState: GameState
}

export default function PokerTable({ gameState }: PokerTableProps) {
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
                    <PlayingCard key={card.id} card={card} />
                  ))
                ) : (
                  // Show card backs for flop
                  Array.from({ length: 5 }).map((_, index) => (
                    <PlayingCard 
                      key={index} 
                      card={{ suit: 'clubs', rank: 'A', id: `back-${index}` }} 
                      isFaceDown={true}
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
              position: getPlayerPosition(index, gameState.players.length)
            }}
            position={getPlayerPosition(index, gameState.players.length)}
            isCurrentTurn={gameState.currentPlayer === index}
            isDealer={gameState.dealer === index}
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
      </div>
    </div>
  )
} 