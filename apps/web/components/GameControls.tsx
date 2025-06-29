'use client'

import { GameState, PlayerAction } from '@/types/game'
import { useState } from 'react'

interface GameControlsProps {
  gameState: GameState
  onAction: (action: PlayerAction, amount?: number) => void
}

export default function GameControls({ gameState, onAction }: GameControlsProps) {
  const [betAmount, setBetAmount] = useState('')

  const handleAction = (action: PlayerAction) => {
    if (action === 'bet' || action === 'raise') {
      const amount = parseInt(betAmount)
      if (amount > 0) {
        onAction(action, amount)
        setBetAmount('')
      }
    } else {
      onAction(action)
    }
  }

  return (
    <div className="bg-black bg-opacity-50 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-poker-gold">Game Controls</h3>
      
      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => handleAction('fold')}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Fold
        </button>
        
        <button
          onClick={() => handleAction('check')}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Check
        </button>
        
        <button
          onClick={() => handleAction('call')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Call ${gameState.currentBet}
        </button>
        
        <button
          onClick={() => handleAction('all-in')}
          className="w-full bg-poker-gold hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
        >
          All In
        </button>
      </div>
      
      {/* Bet/Raise Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">
          Bet/Raise Amount
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
            min={gameState.currentBet + 1}
          />
          <button
            onClick={() => handleAction('bet')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Bet
          </button>
          <button
            onClick={() => handleAction('raise')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Raise
          </button>
        </div>
      </div>
      
      {/* Game Info */}
      <div className="text-sm text-gray-300">
        <div>Phase: {gameState.phase}</div>
        <div>Current Bet: ${gameState.currentBet}</div>
        <div>Pot: ${gameState.pot}</div>
      </div>
    </div>
  )
} 