'use client'

import React from 'react'
import { Card } from '../types/game'

interface PlayingCardProps {
  card: Card
  isFaceDown?: boolean
  className?: string
  onClick?: () => void
}

const PlayingCard: React.FC<PlayingCardProps> = ({ 
  card, 
  isFaceDown = false, 
  className = '',
  onClick 
}) => {
  const getCardImage = (card: Card): string => {
    if (isFaceDown) {
      return '' // No image for face-down cards - we'll use CSS styling
    }

    const suitMap: Record<string, string> = {
      'clubs': 'clubs',
      'diamonds': 'diamonds', 
      'hearts': 'hearts',
      'spades': 'spades'
    }

    const rankMap: Record<string, string> = {
      'A': 'A',
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9',
      '10': '10',
      'J': 'J',
      'Q': 'Q',
      'K': 'K'
    }

    const suit = suitMap[card.suit]
    const rank = rankMap[card.rank]
    
    return `/cards/${suit}_${rank}.png`
  }

  const getCardColor = (): string => {
    if (isFaceDown) return 'text-gray-800'
    return card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'
  }

  if (isFaceDown) {
    return (
      <div 
        className={`relative w-16 h-24 bg-slate-800 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 ${className}`}
        onClick={onClick}
      >
        {/* Simple card back pattern */}
        <div className="absolute inset-2 bg-slate-700 rounded border border-slate-600">
          <div className="absolute inset-1 bg-slate-600 rounded border border-slate-500">
            {/* Center pattern */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-slate-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`relative w-16 h-24 bg-white rounded-lg shadow-xl border-2 border-gray-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}
      onClick={onClick}
    >
      <img
        src={getCardImage(card)}
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-cover rounded-lg"
        onError={(e) => {
          // Fallback to text representation if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const fallback = target.parentElement?.querySelector('.card-fallback') as HTMLElement
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      
      {/* Fallback text representation */}
      <div className="card-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-white rounded-lg">
        <div className={`text-lg font-bold ${getCardColor()}`}>
          {card.rank}
        </div>
        <div className={`text-sm ${getCardColor()}`}>
          {card.suit}
        </div>
      </div>
    </div>
  )
}

export default PlayingCard 