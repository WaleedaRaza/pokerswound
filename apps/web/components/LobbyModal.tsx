'use client'

import React, { useEffect, useState } from 'react'
import { fetchLobbyPlayers, LobbyPlayer } from '../components/services/player'

/** Safe cookie getter (works client-only) */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  )
  return m ? decodeURIComponent(m[1]) : null
}

type LobbyModalProps = {
  isOpen:    boolean
  gameId:    string
  adminUuid: string           // ← host’s *user* UUID
  onClose:   () => void
  onStart:   () => void
}

export default function LobbyModal({
  isOpen,
  gameId,
  adminUuid,
  onClose,
  onStart,
}: LobbyModalProps) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([])

  /** user’s own UUID from cookie */
  const currentUuid = getCookie('uuid') || ''
  const isAdmin     = currentUuid === adminUuid

  // -------- DEBUG ----------
  console.log('🏓 LobbyModal render', { isOpen, gameId, adminUuid, currentUuid, isAdmin })
  // --------------------------

  /** Poll roster every 2 s while open */
  useEffect(() => {
    if (!isOpen || !gameId) return
    let cancelled = false

    const load = async () => {
      try {
        console.log('⏳ fetching players for', gameId)
        const list = await fetchLobbyPlayers(gameId)
        if (!cancelled) setPlayers(list)
      } catch (err) {
        console.error('🔴 roster fetch failed', err)
      }
    }

    load()
    const iv = setInterval(load, 2000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [isOpen, gameId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 z-50">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* ── header ───────────────────────────────────────────────── */}
        <div className="flex justify-between items-center bg-gray-900 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-100">Lobby</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        {/* ── roster ──────────────────────────────────────────────── */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Players in Lobby</h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {players.map((p) => {
              // p.userId holds the user’s UUID (host check)
              const isHostRow    = p.userId === adminUuid
              const showStartBtn = isHostRow && isAdmin

              console.log('🔍 player', p.username, { userId: p.userId, isHostRow })

              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-2"
                >
                  <span className="text-gray-100">
                    {p.username}
                    {isHostRow && ' (Host)'}
                  </span>

                  {showStartBtn && (
                    <button
                      onClick={onStart}
                      className="text-xs px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Start&nbsp;Game
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── footer ──────────────────────────────────────────────── */}
        <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white"
          >
            Cancel
          </button>

          {/* keep a big bottom-bar button if you like */}
          {isAdmin && (
            <button
              onClick={onStart}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Start&nbsp;Game
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
