'use client'

import { useGameState } from '../hooks/useGameState'
import PokerTable from '../components/PokerTable'
import GameControls from '../components/GameControls'
import HandEvaluation from '../components/HandEvaluation'

export default function Home() {
  const { 
    gameState, 
    currentPlayer, 
    handlePlayerAction, 
    startNewGame, 
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
  } = useGameState()

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation Menu */}
      <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-white">🃏 EntroPoker</h1>
              
              {/* Menu Items */}
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveMenu('game')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeMenu === 'game' 
                      ? 'bg-white/20 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Game
                </button>
                <button
                  onClick={() => setActiveMenu('entropy')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeMenu === 'entropy' 
                      ? 'bg-white/20 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Entropy Demo
                </button>
                <button
                  onClick={() => setActiveMenu('settings')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeMenu === 'settings' 
                      ? 'bg-white/20 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={startNewGame}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeMenu === 'game' && (
          <div className="space-y-8">
            {/* Game Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={startNewGame}
                className="bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700"
              >
                NEW GAME
              </button>
              <button
                onClick={dealFlop}
                disabled={gameState.phase === 'handComplete' || gameState.phase !== 'preflop'}
                className={`p-3 rounded font-bold transition-colors ${
                  gameState.phase === 'handComplete' || gameState.phase !== 'preflop'
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                DEAL FLOP
              </button>
              <button
                onClick={dealTurn}
                disabled={gameState.phase === 'handComplete' || gameState.phase !== 'flop'}
                className={`p-3 rounded font-bold transition-colors ${
                  gameState.phase === 'handComplete' || gameState.phase !== 'flop'
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                DEAL TURN
              </button>
              <button
                onClick={dealRiver}
                disabled={gameState.phase === 'handComplete' || gameState.phase !== 'turn'}
                className={`p-3 rounded font-bold transition-colors ${
                  gameState.phase === 'handComplete' || gameState.phase !== 'turn'
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                DEAL RIVER
              </button>
            </div>

            {/* Game Status */}
            <div className="text-center mb-4">
              <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg">
                <div className="text-2xl font-bold text-white mb-2">
                  Hand #{gameState.handNumber} - {gameState.phase.toUpperCase()}
                </div>
                <div className="text-lg text-emerald-400">
                  Pot: ${gameState.pot.toLocaleString()} | Current Bet: ${gameState.currentBet.toLocaleString()}
                </div>
                {gameState.phase === 'handComplete' && (
                  <div className="text-yellow-400 mt-2">
                    Hand Complete - Starting new hand in 3 seconds...
                  </div>
                )}
              </div>
            </div>

            {/* Poker Table */}
            <div className="mb-6">
              <PokerTable
                gameState={gameState}
                isUserTurn={isUserTurn}
                turnTimer={turnTimer}
              />
            </div>

            {/* Player Controls */}
            <GameControls
              currentPlayer={currentPlayer}
              gameState={gameState}
              onAction={handlePlayerAction}
              canCheck={canCheck}
              minRaise={minRaise}
              maxRaise={maxRaise}
              turnTimer={turnTimer}
            />

            {/* Hand Evaluation */}
            <HandEvaluation
              players={gameState.players}
              communityCards={gameState.communityCards}
              showEvaluations={gameState.phase === 'showdown'}
            />
          </div>
        )}

        {activeMenu === 'entropy' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Entropy System</h2>
              <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                Our cryptographically secure randomness system uses real-time entropy from multiple sources 
                to ensure fair and verifiable card shuffling.
              </p>
            </div>

            {/* Real-time Entropy Status */}
            <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
              <h3 className="text-2xl font-bold text-white mb-6">🔐 Real-Time Entropy Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Total Entropy</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    128 bits
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Active Sources</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    3
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Last Update</div>
                  <div className="text-lg font-bold text-emerald-400">
                    <span suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-white">Twitch Stream</span>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400">32 bits</span>
                    <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                      active
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-white">YouTube Videos</span>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400">48 bits</span>
                    <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                      active
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-white">System Random</span>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400">48 bits</span>
                    <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                      active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Game Settings</h2>
              <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                Configure your poker game preferences and entropy settings.
              </p>
            </div>

            <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
              <h3 className="text-2xl font-bold text-white mb-6">Game Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Small Blind</label>
                  <input type="number" defaultValue={10} className="w-full p-2 bg-gray-700 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Big Blind</label>
                  <input type="number" defaultValue={20} className="w-full p-2 bg-gray-700 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Starting Chips</label>
                  <input type="number" defaultValue={1000} className="w-full p-2 bg-gray-700 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Turn Timeout (seconds)</label>
                  <input type="number" defaultValue={30} className="w-full p-2 bg-gray-700 rounded text-white" />
                </div>
              </div>
              <button className="w-full bg-green-600 text-white p-3 rounded font-bold mt-6 hover:bg-green-700">
                SAVE SETTINGS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 