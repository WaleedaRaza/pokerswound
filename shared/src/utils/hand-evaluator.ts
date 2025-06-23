import { Card, Hand, HandRank } from '../types/card';
import { HAND_RANKINGS } from './constants';
import { sortCards } from './card-utils';

/**
 * Evaluates the best 5-card hand from 7 cards (2 hole cards + 5 community cards)
 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  
  let bestHand: Hand = {
    cards: [],
    rank: 'high-card',
    value: 0
  };
  
  for (const combination of combinations) {
    const hand = evaluateFiveCardHand(combination);
    if (compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }
  
  return bestHand;
}

/**
 * Evaluates a 5-card hand
 */
function evaluateFiveCardHand(cards: Card[]): Hand {
  const sorted = sortCards(cards);
  
  // Check for flush
  const isFlush = cards.every(card => card.suit === cards[0].suit);
  
  // Check for straight
  const isStraight = checkStraight(sorted);
  
  // Count ranks
  const rankCounts = new Map<number, number>();
  for (const card of cards) {
    rankCounts.set(card.value, (rankCounts.get(card.value) || 0) + 1);
  }
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const uniqueRanks = rankCounts.size;
  
  // Determine hand rank
  let rank: HandRank;
  let value = 0;
  
  if (isFlush && isStraight) {
    if (sorted[0].value === 14) { // Ace high straight flush
      rank = 'royal-flush';
      value = 14;
    } else {
      rank = 'straight-flush';
      value = sorted[0].value;
    }
  } else if (counts[0] === 4) {
    rank = 'four-of-a-kind';
    value = getRankByCount(rankCounts, 4);
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = 'full-house';
    value = getRankByCount(rankCounts, 3);
  } else if (isFlush) {
    rank = 'flush';
    value = sorted[0].value;
  } else if (isStraight) {
    rank = 'straight';
    value = sorted[0].value;
  } else if (counts[0] === 3) {
    rank = 'three-of-a-kind';
    value = getRankByCount(rankCounts, 3);
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = 'two-pair';
    value = getHighestPairValue(rankCounts);
  } else if (counts[0] === 2) {
    rank = 'pair';
    value = getRankByCount(rankCounts, 2);
  } else {
    rank = 'high-card';
    value = sorted[0].value;
  }
  
  return {
    cards: sorted,
    rank,
    value
  };
}

/**
 * Checks if cards form a straight
 */
function checkStraight(cards: Card[]): boolean {
  // Handle Ace-low straight (A,2,3,4,5)
  if (cards[0].value === 14) {
    const aceLowValues = [1, ...cards.slice(1).map(c => c.value)];
    if (checkConsecutive(aceLowValues)) {
      return true;
    }
  }
  
  // Check normal straight
  const values = cards.map(c => c.value);
  return checkConsecutive(values);
}

/**
 * Checks if values are consecutive
 */
function checkConsecutive(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] - 1) {
      return false;
    }
  }
  return true;
}

/**
 * Gets the rank value for a specific count
 */
function getRankByCount(rankCounts: Map<number, number>, count: number): number {
  for (const [rank, rankCount] of rankCounts) {
    if (rankCount === count) {
      return rank;
    }
  }
  return 0;
}

/**
 * Gets the highest pair value for two-pair
 */
function getHighestPairValue(rankCounts: Map<number, number>): number {
  const pairs = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 2)
    .map(([rank, _]) => rank)
    .sort((a, b) => b - a);
  
  return pairs[0] || 0;
}

/**
 * Compares two hands
 */
export function compareHands(a: Hand, b: Hand): number {
  const rankDiff = HAND_RANKINGS[b.rank] - HAND_RANKINGS[a.rank];
  if (rankDiff !== 0) {
    return rankDiff;
  }
  
  // Same rank, compare values
  return b.value - a.value;
}

/**
 * Gets all combinations of n items from an array
 */
function getCombinations<T>(arr: T[], n: number): T[][] {
  if (n === 1) {
    return arr.map(item => [item]);
  }
  
  const combinations: T[][] = [];
  
  for (let i = 0; i <= arr.length - n; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), n - 1);
    
    for (const tailCombination of tailCombinations) {
      combinations.push([head, ...tailCombination]);
    }
  }
  
  return combinations;
}

/**
 * Determines the winner(s) among multiple players
 */
export function determineWinners(players: Array<{ id: string; hand: Hand }>): string[] {
  if (players.length === 0) return [];
  if (players.length === 1) return [players[0].id];
  
  const sorted = [...players].sort((a, b) => compareHands(b.hand, a.hand));
  const winners = [sorted[0].id];
  
  // Check for ties
  for (let i = 1; i < sorted.length; i++) {
    if (compareHands(sorted[i].hand, sorted[0].hand) === 0) {
      winners.push(sorted[i].id);
    } else {
      break;
    }
  }
  
  return winners;
} 