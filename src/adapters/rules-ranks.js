/**
 * RULES & RANKS MODULE
 * 
 * Purpose: Hand evaluation and poker rules
 * Responsibilities:
 * - Evaluate poker hands (5-card combinations from 7 cards)
 * - Rank hands (high card to royal flush)
 * - Compare hands for showdown
 * 
 * Architecture: Wraps simple-hand-evaluator.js with clean interface
 */

const { evaluatePokerHand } = require('./simple-hand-evaluator');

/**
 * EVALUATE HAND
 * Evaluates a player's best 5-card hand from hole cards + community cards
 * 
 * @param {string[]} holeCards - Player's hole cards (e.g., ['Ah', 'Kd'])
 * @param {string[]} communityCards - Community cards (e.g., ['Qc', 'Jh', 'Ts', '9s', '8h'])
 * @returns {Object} Hand evaluation result
 *   - rank: number (1-10, where 1=high card, 10=royal flush)
 *   - rankName: string (e.g., 'STRAIGHT_FLUSH')
 *   - cards: string[] (best 5 cards used)
 *   - description: string (human-readable description)
 */
function evaluateHand(holeCards, communityCards) {
  if (!holeCards || holeCards.length === 0) {
    return {
      rank: 0,
      rankName: 'NO_HAND',
      cards: [],
      description: 'No cards'
    };
  }

  if (!communityCards || communityCards.length === 0) {
    // Preflop - can't evaluate yet
    return {
      rank: 0,
      rankName: 'PREFLOP',
      cards: holeCards,
      description: 'Preflop'
    };
  }

  try {
    const result = evaluatePokerHand(holeCards, communityCards);
    return result;
  } catch (error) {
    console.error('❌ [RULES] Error evaluating hand:', error);
    return {
      rank: 0,
      rankName: 'ERROR',
      cards: [...holeCards, ...communityCards],
      description: 'Evaluation error'
    };
  }
}

/**
 * COMPARE HANDS
 * Compares two hand evaluations to determine winner
 * 
 * @param {Object} hand1 - First hand evaluation
 * @param {Object} hand2 - Second hand evaluation
 * @returns {number} -1 if hand1 wins, 1 if hand2 wins, 0 if tie
 */
function compareHands(hand1, hand2) {
  // Compare by rank first
  if (hand1.rank > hand2.rank) {
    return -1; // hand1 wins
  }
  if (hand1.rank < hand2.rank) {
    return 1; // hand2 wins
  }
  
  // Same rank - compare kickers (simplified, would need full comparison)
  // For now, return 0 (tie) - full implementation would compare card values
  return 0;
}

/**
 * GET HAND RANK NAME
 * Converts numeric rank to human-readable name
 */
function getHandRankName(rank) {
  const rankNames = {
    1: 'HIGH_CARD',
    2: 'PAIR',
    3: 'TWO_PAIR',
    4: 'THREE_OF_A_KIND',
    5: 'STRAIGHT',
    6: 'FLUSH',
    7: 'FULL_HOUSE',
    8: 'FOUR_OF_A_KIND',
    9: 'STRAIGHT_FLUSH',
    10: 'ROYAL_FLUSH'
  };
  
  return rankNames[rank] || 'UNKNOWN';
}

/**
 * GET HAND DESCRIPTION
 * Human-readable description of hand
 */
function getHandDescription(rank, cards) {
  const rankName = getHandRankName(rank);
  const cardStr = cards ? cards.join(' ') : '';
  return `${rankName}${cardStr ? ` (${cardStr})` : ''}`;
}

module.exports = {
  evaluateHand,
  compareHands,
  getHandRankName,
  getHandDescription
};

