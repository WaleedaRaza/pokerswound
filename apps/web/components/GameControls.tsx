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
    <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
      <h3 className="text-xl font-bold mb-6 text-white">Game Controls</h3>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => handleAction('fold')}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Fold
        </button>
        
        <button
          onClick={() => handleAction('check')}
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Check
        </button>
        
        <button
          onClick={() => handleAction('call')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Call ${gameState.currentBet.toLocaleString()}
        </button>
        
        <button
          onClick={() => handleAction('all-in')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          All In
        </button>
      </div>
      
      {/* Bet/Raise Input */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3 font-medium">
          Bet/Raise Amount
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 bg-black/20 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            min={gameState.currentBet + 1}
          />
          <button
            onClick={() => handleAction('bet')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Bet
          </button>
          <button
            onClick={() => handleAction('raise')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Raise
          </button>
        </div>
      </div>
      
      {/* Game Info */}
      <div className="bg-black/20 p-4 rounded-lg">
        <div className="text-sm text-gray-300 space-y-2">
          <div className="flex justify-between">
            <span>Phase:</span>
            <span className="text-white font-medium capitalize">{gameState.phase}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Bet:</span>
            <span className="text-white font-medium">${gameState.currentBet.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Pot:</span>
            <span className="text-emerald-400 font-bold">${gameState.pot.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 