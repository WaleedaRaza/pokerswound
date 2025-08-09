'use client'

import { useState } from 'react'
import { PlayerAction } from '../types/game'

interface GameControlsProps {
  currentPlayer: any
  gameState: any
  onAction: (action: PlayerAction, amount?: number) => void
  canCheck: boolean
  minRaise: number
  maxRaise: number
  turnTimer?: number
}

export default function GameControls({ 
  currentPlayer, 
  gameState, 
  onAction, 
  canCheck, 
  minRaise, 
  maxRaise,
  turnTimer = 30 
}: GameControlsProps) {
  const [betAmount, setBetAmount] = useState(minRaise)
  const [showBetInput, setShowBetInput] = useState(false)

  if (!currentPlayer) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="text-gray-400 mb-2">Waiting for other players...</div>
          <div className="text-lg font-bold text-emerald-400 mb-2">
            {currentPlayer?.name || 'Unknown'}'s turn
          </div>
          <div className="text-sm text-gray-500">AI thinking...</div>
        </div>
      </div>
    )
  }

  const isUserTurn = currentPlayer.id === '1'
  const callAmount = gameState.currentBet - currentPlayer.bet
  const canCall = callAmount > 0 && callAmount <= currentPlayer.chips
  const canRaise = currentPlayer.chips > callAmount && maxRaise > gameState.currentBet

  if (!isUserTurn) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="text-gray-400 mb-2">Waiting for other players...</div>
          <div className="text-lg font-bold text-emerald-400 mb-2">
            {currentPlayer.name}'s turn
          </div>
          <div className="text-sm text-gray-500">AI thinking...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-6 text-white">Your Turn</h3>
        
        {/* Turn Timer */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Time Remaining</div>
          <div className="flex items-center justify-center">
            <div className="w-48 bg-gray-700 rounded-full h-2 mr-3">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  turnTimer <= 10 ? 'bg-red-500' : turnTimer <= 20 ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${(turnTimer / 30) * 100}%` }}
              ></div>
            </div>
            <span className="text-white font-bold">{turnTimer}s</span>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current Bet:</span>
              <span className="text-white font-bold ml-2">${gameState.currentBet}</span>
            </div>
            <div>
              <span className="text-gray-400">Your Bet:</span>
              <span className="text-white font-bold ml-2">${currentPlayer.bet}</span>
            </div>
            <div>
              <span className="text-gray-400">To Call:</span>
              <span className="text-white font-bold ml-2">${callAmount}</span>
            </div>
            <div>
              <span className="text-gray-400">Your Chips:</span>
              <span className="text-white font-bold ml-2">${currentPlayer.chips}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => onAction('fold')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Fold
          </button>
          
          {canCheck ? (
            <button
              onClick={() => onAction('check')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Check
            </button>
          ) : canCall ? (
            <button
              onClick={() => onAction('call')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Call ${callAmount}
            </button>
          ) : null}
        </div>

        {/* Betting Controls */}
        <div className="space-y-3">
          {canRaise && (
            <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Raise Amount</span>
                <button
                  onClick={() => setShowBetInput(!showBetInput)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  {showBetInput ? 'Hide' : 'Custom Amount'}
                </button>
              </div>
              
              {showBetInput ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    min={minRaise}
                    max={maxRaise}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-emerald-500 focus:outline-none"
                    placeholder={`Min: $${minRaise}, Max: $${maxRaise}`}
                  />
                  <button
                    onClick={() => onAction('raise', betAmount)}
                    disabled={betAmount < minRaise || betAmount > maxRaise}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Raise to ${betAmount}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onAction('raise', minRaise)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Min Raise ${minRaise}
                  </button>
                  <button
                    onClick={() => onAction('raise', Math.floor(maxRaise * 0.5))}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Half Pot ${Math.floor(maxRaise * 0.5)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* All-in Button */}
          <button
            onClick={() => onAction('allIn')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            All-In ${currentPlayer.chips}
          </button>
        </div>
      </div>
    </div>
  )
} 