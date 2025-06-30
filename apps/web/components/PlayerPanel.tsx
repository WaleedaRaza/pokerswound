'use client'

import { Player } from '@/types/game'
import PlayingCard from './PlayingCard'

interface PlayerPanelProps {
  player: Player
}

export default function PlayerPanel({ player }: PlayerPanelProps) {
  return (
    <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
      <h3 className="text-xl font-bold mb-6 text-white">Your Hand</h3>
      
      {/* Player Info */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Name</div>
        <div className="font-bold text-white text-lg">{player.name}</div>
      </div>
      
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Chips</div>
        <div className="text-emerald-400 font-bold text-xl">${player.chips.toLocaleString()}</div>
      </div>
      
      {/* Player Cards */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-3">Your Cards</div>
        <div className="flex gap-3">
          {player.cards.length > 0 ? (
            player.cards.map((card) => (
              <PlayingCard key={card.id} card={card} />
            ))
          ) : (
            <>
              <PlayingCard 
                card={{ suit: 'hearts', rank: 'A', id: 'back1' }} 
                isFaceDown={true} 
              />
              <PlayingCard 
                card={{ suit: 'hearts', rank: 'A', id: 'back2' }} 
                isFaceDown={true} 
              />
            </>
          )}
        </div>
      </div>
      
      {/* Current Bet */}
      {player.currentBet > 0 && (
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-1">Current Bet</div>
          <div className="text-emerald-400 font-bold text-lg">${player.currentBet.toLocaleString()}</div>
        </div>
      )}
      
      {/* Status */}
      <div className="flex flex-wrap gap-2">
        {player.isFolded && (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">FOLDED</span>
        )}
        {player.isAllIn && (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">ALL IN</span>
        )}
        {player.isDealer && (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">DEALER</span>
        )}
      </div>
    </div>
  )
} 