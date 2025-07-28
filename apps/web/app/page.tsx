'use client'

import { useGameState } from '../hooks/useGameState'
import PokerTable from '../components/PokerTable'
import PlayerPanel from '../components/PlayerPanel'
import GameControls from '../components/GameControls'
import HandEvaluation from '../components/HandEvaluation'
import { useState } from 'react'

export default function Home() {
  const { 
    gameState, 
    currentPlayer, 
    handlePlayerAction, 
    startNewGame, 
    dealCards,
    canCheck,
    minRaise,
    maxRaise,
    gameHistory,
    blinds,
    isUserTurn,
    turnTimer,
    entropyLog,
    gameEntropyProvider
  } = useGameState()
  const [activeMenu, setActiveMenu] = useState<'game' | 'entropy' | 'settings'>('game')

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
              <button 
                onClick={dealCards}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Deal Cards
              </button>
              <a 
                href="/entropy-demo" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Full Demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeMenu === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Game Table */}
            <div className="lg:col-span-3">
              <PokerTable 
                gameState={gameState} 
                isUserTurn={isUserTurn}
                turnTimer={turnTimer}
              />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {currentPlayer && (
                <PlayerPanel player={currentPlayer} />
              )}
              
                          <GameControls
              currentPlayer={currentPlayer}
              gameState={gameState}
              onAction={handlePlayerAction}
              canCheck={canCheck}
              minRaise={minRaise}
              maxRaise={maxRaise}
              turnTimer={turnTimer}
            />
              
              <HandEvaluation 
                players={gameState.players}
                communityCards={gameState.communityCards}
                showEvaluations={gameState.phase === 'showdown'}
              />

              {/* Game History */}
              {gameHistory.length > 0 && (
                <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-white">Game History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {gameHistory.slice(-10).map((entry, index) => (
                      <div key={index} className="text-sm text-gray-300 flex justify-between">
                        <span>{entry.playerId}</span>
                        <span className="text-emerald-400">{entry.action}</span>
                        {entry.amount && (
                          <span className="text-white">${entry.amount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entropy Status */}
              <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4 text-white">🔐 Entropy Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Entropy:</span>
                    <span className="text-emerald-400 font-bold">
                      {gameEntropyProvider.getStats().totalEntropyBits} bits
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Active Sources:</span>
                    <span className="text-emerald-400 font-bold">
                      {gameEntropyProvider.getStats().sources.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Game Entropy:</span>
                    <span className="text-emerald-400 font-mono text-xs">
                      {gameState.entropyHash ? gameState.entropyHash.substring(0, 16) + '...' : 'None'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Last updated: <span suppressHydrationWarning>{new Date(gameEntropyProvider.getStats().lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
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
                    {gameEntropyProvider.getStats().totalEntropyBits} bits
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Active Sources</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {gameEntropyProvider.getStats().sources.filter(s => s.status === 'active').length}
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Last Update</div>
                  <div className="text-lg font-bold text-emerald-400">
                    <span suppressHydrationWarning>{new Date(gameEntropyProvider.getStats().lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {gameEntropyProvider.getStats().sources.map((source: any) => (
                  <div key={source.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                    <span className="text-white">{source.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400">{source.entropyBits} bits</span>
                      <span className={`px-2 py-1 rounded text-xs ${source.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {source.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Game Entropy */}
            {gameState.entropyHash && (
              <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
                <h3 className="text-2xl font-bold text-white mb-4">🎮 Current Game Entropy</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Game ID:</span>
                    <span className="text-emerald-400 font-mono">{gameState.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Entropy Hash:</span>
                    <span className="text-emerald-400 font-mono text-xs">
                      {gameState.entropyHash.substring(0, 32)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Shuffle Time:</span>
                    <span className="text-emerald-400">
                      <span suppressHydrationWarning>
                        {gameState.shuffleTimestamp ? new Date(gameState.shuffleTimestamp).toLocaleTimeString() : 'Not shuffled'}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Hand Number:</span>
                    <span className="text-emerald-400 font-bold">#{gameState.handNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Entropy Log */}
            {entropyLog.length > 0 && (
              <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
                <h3 className="text-2xl font-bold text-white mb-4">📊 Recent Entropy Log</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {entropyLog.slice(-10).map((entry, index) => (
                    <div key={index} className="bg-black/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-emerald-400 font-medium">{entry.source}</span>
                        <span className="text-gray-400 text-xs">
                          <span suppressHydrationWarning>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 font-mono">
                        {entry.data.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-emerald-400 mt-1">
                        {entry.entropyBits} bits
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <a 
                href="/entropy-demo" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                View Full Entropy Demo
              </a>
            </div>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Settings</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Configure your poker game preferences and entropy sources.
            </p>
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white">Sound Effects</span>
                  <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Animations</span>
                  <button className="w-12 h-6 bg-emerald-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Entropy Sources</span>
                  <span className="text-emerald-400">3 Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 