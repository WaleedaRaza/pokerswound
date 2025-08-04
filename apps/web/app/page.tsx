'use client'

import JoinCreateModal from '../components/CreateJoinModal'
import { useGameState } from '../hooks/useGameState'
import PokerTable from '../components/PokerTable'
import PlayerPanel from '../components/PlayerPanel'
import GameControls from '../components/GameControls'
import HandEvaluation from '../components/HandEvaluation'
import AuthButtons from '../components/account/AuthButtons'
import { useState } from 'react'
import LobbyModal, { type LobbyPlayer } from '../components/LobbyModal'
import { getCookie, joinGameById } from '@/hooks/GameStateBackend'
import { fetchLobbyPlayers } from '@/components/services/player'

export default function Home() {
<<<<<<< Updated upstream
  const { gameState, currentPlayer, handlePlayerAction, startNewGame } =
    useGameState()
  const [activeMenu, setActiveMenu] =
    useState<'game' | 'entropy' | 'settings'>('game')
=======

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLobbyModal, setShowLobbyModal] = useState(false)
  const [lobbyPlayers, setLobbyPlayers]   = useState<LobbyPlayer[]>([])
  const [lobbyAdminUuid, setLobbyAdminUuid] = useState<string>('')
  const [lobbyGameId, setLobbyGameId]       = useState<string>('')

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
>>>>>>> Stashed changes

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation Menu */}
      <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* ————— Left side (brand + menu) ————— */}
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-white">🃏 EntroPoker</h1>

              {/* Menu Items */}
              <div className="flex space-x-1">
                {(['game', 'entropy', 'settings'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveMenu(key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeMenu === key
                        ? 'bg-white/20 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {key[0].toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

<<<<<<< Updated upstream
            {/* ————— Right side (actions) ————— */}
            <div className="flex items-center space-x-6">
              <button
                onClick={startNewGame}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                New Game
              </button>
              <a
                href="/entropy-demo"
=======
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Game
            </button>
            <button 
              onClick={() => setShowJoinModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Join Game
            </button>
              <button 
                onClick={dealCards}
>>>>>>> Stashed changes
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Full Demo
              </a>

              {/* ——— NEW auth buttons ——— */}
              <AuthButtons />
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
              <PokerTable gameState={gameState} />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {currentPlayer && (
                <PlayerPanel player={currentPlayer} />
              )}
              
              <GameControls 
                gameState={gameState}
                onAction={handlePlayerAction}
              />
              
              <HandEvaluation 
                players={gameState.players}
                communityCards={gameState.communityCards}
                showEvaluations={gameState.phase === 'showdown'}
              />
            </div>
          </div>
        )}

        {activeMenu === 'entropy' && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Entropy System</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Our cryptographically secure randomness system uses real-time entropy from multiple sources 
              to ensure fair and verifiable card shuffling.
            </p>
            <a 
              href="/entropy-demo" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              View Full Entropy Demo
            </a>
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

       <JoinCreateModal
        type="create"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (gameId) => {
          /* game was just created & the admin player already inserted */

          setLobbyGameId(gameId)
          setLobbyAdminUuid(getCookie('uuid') || '')      // host is “me”

          const roster = await fetchLobbyPlayers(gameId)
          setLobbyPlayers(roster)

          setShowCreateModal(false)
          setShowLobbyModal(true)
        }}
      />

      /* ---------- JOIN ---------- */
      <JoinCreateModal
        type="join"
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={async (gameId) => {
          // hit backend join (adds me as player)
          const { game } = await joinGameById(gameId)

          setLobbyGameId(game.id)
          setLobbyAdminUuid(game.adminUuid)

          const roster = await fetchLobbyPlayers(game.id)
          setLobbyPlayers(roster)

          setShowJoinModal(false)
          setShowLobbyModal(true)
        }}
      />

      {/* NEW: Lobby modal after create */}
      <LobbyModal
        isOpen={showLobbyModal}
        gameId={lobbyGameId}
        adminUuid={lobbyAdminUuid}
        onClose={() => setShowLobbyModal(false)}
        onStart={() => {
          // TODO: Trigger your real “start game” logic here
        }}
      />
    </div>
  )
} 