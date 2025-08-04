'use client'

import React, { useState, useEffect } from 'react'
import { createGameAndAdmin, fetchGames, GameInfo, setCookie, getUuid, createPlayer } from '../hooks/GameStateBackend'

type ModalType = 'create' | 'join'

interface JoinCreateModalProps {
  type: ModalType
  isOpen: boolean
  onClose: () => void
  onSubmit: (inputValue?: string) => void
}

interface GameFormData {
  name: string
  maxPlayers?: number
  minPlayers?: number
  smallBlind?: number
  bigBlind?: number
  buyIn?: number
}

export default function JoinCreateModal({
  type,
  isOpen,
  onClose,
  onSubmit,
}: JoinCreateModalProps) {
  const [formData, setFormData] = useState<GameFormData>({
    name: '',
    maxPlayers: 9,
    minPlayers: 2,
    smallBlind: 10,
    bigBlind: 20,
    buyIn: 1000,
  })

  const [games, setGames] = useState<GameInfo[]>([])

  useEffect(() => {
    if (isOpen && type === 'join') {
      fetchGames()
        .then(setGames)
        .catch((e) => {
          console.error('Failed to load games', e)
          setGames([])
        })
    }
  }, [isOpen, type])

  if (!isOpen) return null

  const handleChange = (field: keyof GameFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'name' ? value : Number(value),
    }))
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center bg-gray-900 px-6 py-4">
          <h2 className="text-lg font-semibold">
            {type === 'create' ? 'Create New Game' : 'Join Game'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-6">
          {type === 'join' ? (
            <div className="space-y-4">
              {games.length === 0 ? (
                <p className="text-center text-gray-300">No open lobbies to join.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        // just tell the parent which game we clicked
                        onSubmit(g.id)
                      }}
                      className="w-full flex justify-between items-center border border-gray-700 rounded-lg p-3 hover:bg-gray-700 transition"
                    >
                      <span className="font-medium text-gray-100">{g.name}</span>
                      <span className="text-sm text-gray-400">ID: {g.id}...</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-100 mb-1">
                  Game Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Friday Night Poker"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-1">
                    Min Players
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={9}
                    value={formData.minPlayers}
                    onChange={(e) => handleChange('minPlayers', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-1">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={9}
                    value={formData.maxPlayers}
                    onChange={(e) => handleChange('maxPlayers', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-1">
                    Small Blind
                  </label>
                  <input
                    type="number"
                    value={formData.smallBlind}
                    onChange={(e) => handleChange('smallBlind', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-1">
                    Big Blind
                  </label>
                  <input
                    type="number"
                    value={formData.bigBlind}
                    onChange={(e) => handleChange('bigBlind', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-100 mb-1">
                  Buy-in Amount
                </label>
                <input
                  type="number"
                  value={formData.buyIn}
                  onChange={(e) => handleChange('buyIn', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          {type === 'create' && (
            <button
              onClick={async () => {
                try {
                  const { game } = await createGameAndAdmin(formData)
                  onSubmit(game.id)
                } catch {
                  alert('Failed to create game.')
                }
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
