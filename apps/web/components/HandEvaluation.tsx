'use client'

import { Player, Card } from '@/types/game'
import { HandEvaluator } from '@entropoker/game-engine'

interface HandEvaluationProps {
  players: Player[]
  communityCards: Card[]
  showEvaluations: boolean
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
        const hand = HandEvaluator.evaluateHand(player.cards, communityCards)
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
    <div className="bg-black bg-opacity-75 p-4 rounded-lg">
      <h3 className="text-poker-gold font-bold mb-3">Hand Evaluations</h3>
      <div className="space-y-2">
        {handEvaluations.map((evaluation, index) => (
          <div 
            key={evaluation.player.id} 
            className={`p-2 rounded ${evaluation.isWinner ? 'bg-poker-gold text-black' : 'bg-gray-800'}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{evaluation.player.name}</span>
              <span className="text-sm">
                {evaluation.hand ? evaluation.hand.description : 'Invalid Hand'}
              </span>
            </div>
            {evaluation.isWinner && (
              <div className="text-center mt-1">
                <span className="text-sm font-bold">🏆 WINNER!</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 