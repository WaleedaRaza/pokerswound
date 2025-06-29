'use client'

import { useState, useEffect } from 'react'
import PokerTable from '@/components/PokerTable'
import PlayerPanel from '@/components/PlayerPanel'
import GameControls from '@/components/GameControls'
import { GameState, Player } from '@/types/game'

export default function Home() {
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

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-poker-gold mb-2">
            🃏 Entropoker
          </h1>
          <p className="text-lg text-gray-300">
            Cryptographically Secure Texas Hold'em
          </p>
        </header>

        {/* Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1">
            <PlayerPanel player={currentPlayer} />
          </div>

          {/* Center - Poker Table */}
          <div className="lg:col-span-2">
            <PokerTable gameState={gameState} />
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <GameControls 
              gameState={gameState}
              onAction={(action, amount) => {
                console.log('Player action:', action, amount)
                // TODO: Send action to backend
              }}
            />
          </div>
        </div>
      </div>
    </main>
  )
} 