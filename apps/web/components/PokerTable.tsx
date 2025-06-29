'use client'

import { GameState, Card } from '@/types/game'
import PlayingCard from './PlayingCard'
import PlayerSeat from './PlayerSeat'

interface PokerTableProps {
  gameState: GameState
}

export default function PokerTable({ gameState }: PokerTableProps) {
  // Mock players for demo - replace with real data
  const mockPlayers = [
    { id: '1', name: 'You', chips: 1000, position: 'bottom' },
    { id: '2', name: 'Alice', chips: 1500, position: 'bottom-right' },
    { id: '3', name: 'Bob', chips: 800, position: 'right' },
    { id: '4', name: 'Charlie', chips: 1200, position: 'top-right' },
    { id: '5', name: 'Diana', chips: 900, position: 'top' },
    { id: '6', name: 'Eve', chips: 1100, position: 'top-left' },
  ]

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto">
      {/* Poker Table */}
      <div className="poker-table w-full h-full relative">
        
        {/* Community Cards */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-2">
            {gameState.communityCards.length > 0 ? (
              gameState.communityCards.map((card, index) => (
                <PlayingCard key={card.id} card={card} />
              ))
            ) : (
              // Show card backs for flop
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="poker-card card-back w-16 h-24 flex items-center justify-center">
                  <span className="text-xs">🂠</span>
                </div>
              ))
            )}
          </div>
          
          {/* Pot */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-black bg-opacity-50 px-4 py-2 rounded-full">
              <span className="text-poker-gold font-bold">Pot:</span>
              <span className="text-white font-bold">${gameState.pot}</span>
            </div>
          </div>
        </div>

        {/* Player Seats */}
        {mockPlayers.map((player, index) => (
          <PlayerSeat
            key={player.id}
            player={player}
            position={player.position as any}
            isCurrentTurn={gameState.currentPlayer === index}
            isDealer={gameState.dealer === index}
          />
        ))}

        {/* Game Phase Indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-50 px-4 py-2 rounded-full">
            <span className="text-poker-gold font-bold capitalize">
              {gameState.phase}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 