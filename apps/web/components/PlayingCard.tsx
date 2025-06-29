'use client'

import { Card } from '@/types/game'

interface PlayingCardProps {
  card: Card
  faceDown?: boolean
}

export default function PlayingCard({ card, faceDown = false }: PlayingCardProps) {
  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black'
  }

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥'
      case 'diamonds': return '♦'
      case 'clubs': return '♣'
      case 'spades': return '♠'
      default: return ''
    }
  }

  if (faceDown) {
    return (
      <div className="poker-card card-back w-16 h-24 flex items-center justify-center">
        <span className="text-xs">🂠</span>
      </div>
    )
  }

  return (
    <div className="poker-card w-16 h-24 p-1 flex flex-col justify-between">
      <div className={`text-xs font-bold ${getSuitColor(card.suit)}`}>
        {card.rank}
      </div>
      <div className={`text-lg ${getSuitColor(card.suit)}`}>
        {getSuitSymbol(card.suit)}
      </div>
      <div className={`text-xs font-bold ${getSuitColor(card.suit)} rotate-180`}>
        {card.rank}
      </div>
    </div>
  )
} 