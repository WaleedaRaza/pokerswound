'use client'

import { Card } from '@/types/game'

interface PlayingCardProps {
  card: Card
  isFaceDown?: boolean
  className?: string
  onClick?: () => void
}

export default function PlayingCard({ card, isFaceDown = false, className = '', onClick }: PlayingCardProps) {
  if (isFaceDown) {
    return (
      <div 
        className={`relative w-16 h-24 bg-slate-800 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 ${className}`}
        onClick={onClick}
      >
        {/* Card back using the dark back image */}
        <img 
          src="/cards/back_dark.png" 
          alt="Card Back" 
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    )
  }

  // Generate the correct image path based on card properties
  const getCardImagePath = (card: Card): string => {
    const suit = card.suit
    const rank = card.rank
    
    // Map rank to filename format
    const rankMap: Record<string, string> = {
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
      'K': 'K',
      'A': 'A'
    }

    const rankStr = rankMap[rank]
    return `/cards/${suit}_${rankStr}.png`
  }

  return (
    <div 
      className={`relative w-16 h-24 bg-white rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <img 
        src={getCardImagePath(card)} 
        alt={`${card.rank} of ${card.suit}`} 
        className="w-full h-full object-cover rounded-lg"
        onError={(e) => {
          // Fallback to a simple card display if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          target.parentElement!.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center p-1">
              <div class="text-xs font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}">${card.rank}</div>
              <div class="text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}">${card.suit}</div>
            </div>
          `
        }}
      />
    </div>
  )
} 