'use client'

import { Player } from '@/types/game'
import PlayingCard from './PlayingCard'

interface PlayerPanelProps {
  player: Player
}

export default function PlayerPanel({ player }: PlayerPanelProps) {
  return (
    <div className="bg-black bg-opacity-50 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-poker-gold">Your Hand</h3>
      
      {/* Player Info */}
      <div className="mb-4">
        <div className="text-sm text-gray-300">Name</div>
        <div className="font-bold">{player.name}</div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-300">Chips</div>
        <div className="text-poker-gold font-bold">${player.chips}</div>
      </div>
      
      {/* Player Cards */}
      <div className="mb-4">
        <div className="text-sm text-gray-300 mb-2">Your Cards</div>
        <div className="flex gap-2">
          {player.cards.length > 0 ? (
            player.cards.map((card) => (
              <PlayingCard key={card.id} card={card} />
            ))
          ) : (
            <>
              <PlayingCard 
                card={{ suit: 'hearts', rank: 'A', id: 'back1' }} 
                faceDown={true} 
              />
              <PlayingCard 
                card={{ suit: 'hearts', rank: 'A', id: 'back2' }} 
                faceDown={true} 
              />
            </>
          )}
        </div>
      </div>
      
      {/* Current Bet */}
      {player.currentBet > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-300">Current Bet</div>
          <div className="text-poker-gold font-bold">${player.currentBet}</div>
        </div>
      )}
      
      {/* Status */}
      <div className="text-sm">
        {player.isFolded && <span className="text-red-400">Folded</span>}
        {player.isAllIn && <span className="text-poker-gold">All In</span>}
        {player.isDealer && <span className="text-blue-400">Dealer</span>}
      </div>
    </div>
  )
} 