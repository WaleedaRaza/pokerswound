'use client'

import { Player, Card } from '@/types/game'
import { HandEvaluator } from '@entropoker/game-engine'
import { Card as EngineCard, Suit, Rank } from '@entropoker/game-engine'

interface HandEvaluationProps {
  players: Player[]
  communityCards: Card[]
  showEvaluations: boolean
}

// Type conversion functions (same as in useGameState)
const convertFrontendCardToEngine = (frontendCard: Card): EngineCard => {
  const rankMap: Record<string, Rank> = {
    '2': Rank.TWO,
    '3': Rank.THREE,
    '4': Rank.FOUR,
    '5': Rank.FIVE,
    '6': Rank.SIX,
    '7': Rank.SEVEN,
    '8': Rank.EIGHT,
    '9': Rank.NINE,
    '10': Rank.TEN,
    'J': Rank.JACK,
    'Q': Rank.QUEEN,
    'K': Rank.KING,
    'A': Rank.ACE,
  }

  const suitMap: Record<string, Suit> = {
    'hearts': Suit.HEARTS,
    'diamonds': Suit.DIAMONDS,
    'clubs': Suit.CLUBS,
    'spades': Suit.SPADES,
  }

  return {
    suit: suitMap[frontendCard.suit],
    rank: rankMap[frontendCard.rank],
    id: frontendCard.id,
  }
}

export default function HandEvaluation({ players, communityCards, showEvaluations }: HandEvaluationProps) {
  if (!showEvaluations || communityCards.length < 5) {
    return null
  }

  const evaluateHands = () => {
    const activePlayers = players.filter(p => !p.isFolded && p.cards.length === 2)
    
    if (activePlayers.length === 0) return []

    const evaluations = activePlayers.map(player => {
      try {
        const hand = HandEvaluator.evaluateHand(
          player.cards.map(convertFrontendCardToEngine), 
          communityCards.map(convertFrontendCardToEngine)
        )
        return {
          player,
          hand,
          score: hand.score
        }
      } catch (error) {
        console.error('Error evaluating hand for player:', player.name, error)
        return {
          player,
          hand: null,
          score: 0
        }
      }
    })

    // Sort by score (highest first)
    evaluations.sort((a, b) => b.score - a.score)
    
    // Determine winners (handle ties)
    const winners = evaluations.filter(evaluation => evaluation.score === evaluations[0].score)
    
    return evaluations.map(evaluation => ({
      ...evaluation,
      isWinner: winners.includes(evaluation)
    }))
  }

  const handEvaluations = evaluateHands()

  if (handEvaluations.length === 0) {
    return null
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm p-6 rounded-xl">
      <h3 className="text-xl font-bold mb-4 text-white">Hand Evaluations</h3>
      <div className="space-y-3">
        {handEvaluations.map((evaluation, index) => (
          <div 
            key={evaluation.player.id} 
            className={`p-4 rounded-lg transition-colors ${
              evaluation.isWinner 
                ? 'bg-emerald-500/20 border border-emerald-500/30' 
                : 'bg-black/20 border border-white/10'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{evaluation.player.name}</span>
              <span className="text-sm text-emerald-400">
                {evaluation.hand ? evaluation.hand.description : 'Invalid Hand'}
              </span>
            </div>
            {evaluation.isWinner && (
              <div className="text-center mt-2">
                <span className="text-sm font-bold text-emerald-400">🏆 WINNER!</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 