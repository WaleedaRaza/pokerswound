'use client'

import { useState } from 'react'
import { useRealTimeGame } from '@/hooks/useRealTimeGame'

export default function RealTimeDemo() {
  const [gameId, setGameId] = useState('demo-game-1')
  const [userId, setUserId] = useState('user-1')
  
  const {
    gameState,
    isConnected,
    error,
    currentPlayer,
    isUserTurn,
    callAmount,
    fold,
    check,
    call,
    bet,
    raise,
    allIn,
    dealFlop,
    dealTurn,
    dealRiver
  } = useRealTimeGame({ gameId, userId })

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-4">Connecting to Backend...</div>
          <div className="text-gray-400">Game ID: {gameId}</div>
          <div className="text-gray-400">User ID: {userId}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500 mb-4">Error</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Real-Time Poker Demo</h1>
        
        {/* Connection Status */}
        <div className="bg-green-600 text-white p-4 rounded-lg mb-6">
          ✅ Connected to Backend
        </div>

        {/* Game State */}
        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Game Info */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Game Info</h2>
              <div className="space-y-2 text-gray-300">
                <div>Game: {gameState.game.name}</div>
                <div>Status: {gameState.game.status}</div>
                <div>Hand: #{gameState.handNumber}</div>
                <div>Phase: {gameState.phase}</div>
                <div>Pot: ${gameState.pot}</div>
                <div>Current Bet: ${gameState.currentBet}</div>
              </div>
            </div>

            {/* Player Info */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Your Info</h2>
              {currentPlayer ? (
                <div className="space-y-2 text-gray-300">
                  <div>Name: {currentPlayer.username}</div>
                  <div>Position: {currentPlayer.position}</div>
                  <div>Chips: ${currentPlayer.chips}</div>
                  <div>Current Bet: ${currentPlayer.currentBet}</div>
                  <div>Dealer: {currentPlayer.isDealer ? 'Yes' : 'No'}</div>
                  <div>Your Turn: {isUserTurn ? 'Yes' : 'No'}</div>
                  {callAmount > 0 && <div>To Call: ${callAmount}</div>}
                </div>
              ) : (
                <div className="text-gray-400">Not in game</div>
              )}
            </div>
          </div>
        )}

        {/* Community Cards */}
        {gameState && gameState.communityCards.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Community Cards</h2>
            <div className="flex gap-2">
              {gameState.communityCards.map((card, index) => (
                <div key={index} className="bg-white text-black p-2 rounded w-12 h-16 flex items-center justify-center font-bold">
                  {card}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Players */}
        {gameState && (
          <div className="bg-gray-800 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Players</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameState.players.map((player) => (
                <div key={player.id} className="bg-gray-700 p-4 rounded">
                  <div className="font-bold text-white">{player.username}</div>
                  <div className="text-gray-300 text-sm">
                    <div>Chips: ${player.chips}</div>
                    <div>Bet: ${player.currentBet}</div>
                    <div>Position: {player.position}</div>
                    {player.isDealer && <div className="text-yellow-400">Dealer</div>}
                    {player.lastAction && <div className="text-blue-400">Last: {player.lastAction}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {isUserTurn && currentPlayer && (
          <div className="bg-gray-800 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Turn - Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={fold}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded font-bold"
              >
                Fold
              </button>
              
              {callAmount === 0 ? (
                <button
                  onClick={check}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold"
                >
                  Check
                </button>
              ) : (
                <button
                  onClick={call}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold"
                >
                  Call ${callAmount}
                </button>
              )}
              
              <button
                onClick={() => bet(20)}
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded font-bold"
              >
                Bet $20
              </button>
              
              <button
                onClick={() => raise(40)}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded font-bold"
              >
                Raise $40
              </button>
              
              <button
                onClick={allIn}
                className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded font-bold"
              >
                All-In
              </button>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        <div className="bg-gray-800 p-6 rounded-lg mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Admin Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={dealFlop}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded font-bold"
            >
              Deal Flop
            </button>
            <button
              onClick={dealTurn}
              className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded font-bold"
            >
              Deal Turn
            </button>
            <button
              onClick={dealRiver}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded font-bold"
            >
              Deal River
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 p-6 rounded-lg mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Debug Info</h2>
          <div className="text-gray-300 text-sm">
            <div>Game ID: {gameId}</div>
            <div>User ID: {userId}</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Game State: {gameState ? 'Loaded' : 'None'}</div>
          </div>
        </div>
      </div>
    </div>
  )
} 