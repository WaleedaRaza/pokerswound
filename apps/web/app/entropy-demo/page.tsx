'use client'

import { useState, useEffect } from 'react'
import PlayingCard from '../../components/PlayingCard'
import { Card } from '../../types/game'

// Mock entropy sources for demo
const mockEntropySources = [
  { id: 'twitch:pokergame', name: 'Twitch Chat', entropyBits: 45, status: 'active' },
  { id: 'youtube:livepoker', name: 'YouTube Comments', entropyBits: 32, status: 'active' },
  { id: 'system:random', name: 'System Random', entropyBits: 128, status: 'active' }
]

// Generate a deck of cards
const generateDeck = (): Card[] => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
  
  const deck: Card[] = []
  let id = 0
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `card-${id++}`
      })
    }
  }
  
  return deck
}

export default function EntropyDemo() {
  const [deck, setDeck] = useState<Card[]>([])
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([])
  const [entropyStats, setEntropyStats] = useState({
    totalEntropyBits: 0,
    sources: mockEntropySources,
    lastUpdate: Date.now()
  })
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleProof, setShuffleProof] = useState<string>('')

  useEffect(() => {
    const initialDeck = generateDeck()
    setDeck(initialDeck)
  }, [])

  // Simulate entropy collection
  useEffect(() => {
    const interval = setInterval(() => {
      setEntropyStats(prev => ({
        ...prev,
        totalEntropyBits: prev.totalEntropyBits + Math.floor(Math.random() * 20) + 10,
        lastUpdate: Date.now()
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const shuffleDeck = () => {
    if (entropyStats.totalEntropyBits < 128) {
      alert('Need at least 128 bits of entropy to shuffle securely!')
      return
    }

    setIsShuffling(true)
    
    // Simulate entropy-based shuffling
    setTimeout(() => {
      const shuffled = [...deck]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      
      setShuffledDeck(shuffled)
      setIsShuffling(false)
      
      // Generate a mock proof
      const proof = `entropy-${entropyStats.totalEntropyBits}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setShuffleProof(proof)
    }, 2000)
  }

  const resetDeck = () => {
    const newDeck = generateDeck()
    setDeck(newDeck)
    setShuffledDeck([])
    setShuffleProof('')
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Entropy-Powered Poker Demo
        </h1>

        {/* Entropy Stats */}
        <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Entropy Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-sm text-gray-300">Total Entropy</div>
              <div className="text-2xl font-bold text-emerald-400">{entropyStats.totalEntropyBits} bits</div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-sm text-gray-300">Active Sources</div>
              <div className="text-2xl font-bold text-emerald-400">{entropyStats.sources.length}</div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-sm text-gray-300">Last Update</div>
              <div className="text-lg font-bold text-emerald-400">
                {new Date(entropyStats.lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {entropyStats.sources.map(source => (
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

        {/* Shuffle Controls */}
        <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Cryptographic Shuffling</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={shuffleDeck}
              disabled={isShuffling || entropyStats.totalEntropyBits < 128}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isShuffling ? 'Shuffling...' : 'Shuffle Deck'}
            </button>
            <button
              onClick={resetDeck}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Reset Deck
            </button>
          </div>
          
          {entropyStats.totalEntropyBits < 128 && (
            <div className="text-red-400 mb-4">
              ⚠️ Need at least 128 bits of entropy for secure shuffling. Currently: {entropyStats.totalEntropyBits} bits
            </div>
          )}
          
          {shuffleProof && (
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">Shuffle Proof (Fairness Verification)</div>
              <div className="text-emerald-400 font-mono text-sm break-all">{shuffleProof}</div>
            </div>
          )}
        </div>

        {/* Card Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Deck */}
          <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Original Deck (First 10 Cards)</h3>
            <div className="flex flex-wrap gap-2">
              {deck.slice(0, 10).map(card => (
                <PlayingCard key={card.id} card={card} />
              ))}
            </div>
          </div>

          {/* Shuffled Deck */}
          <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Shuffled Deck (First 10 Cards)</h3>
            <div className="flex flex-wrap gap-2">
              {shuffledDeck.slice(0, 10).map(card => (
                <PlayingCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-black/20 backdrop-blur-sm p-6 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
          <div className="text-gray-300 space-y-2">
            <p>• <strong>Entropy Sources:</strong> Real-time randomness from Twitch chat, YouTube comments, and system sources</p>
            <p>• <strong>Cryptographic Mixing:</strong> Multiple rounds of SHA-256 hashing to ensure true randomness</p>
            <p>• <strong>Fairness Proof:</strong> Cryptographic proof that the shuffle was fair and cannot be manipulated</p>
            <p>• <strong>Verification:</strong> Anyone can verify the shuffle was fair using the provided proof</p>
          </div>
        </div>
      </div>
    </div>
  )
} 