import { Card, Rank, Suit } from './pokerEngine';

export enum HandRank {
  HIGH_CARD = 0,
  ONE_PAIR = 1 << 8,
  TWO_PAIR = 1 << 9,
  THREE_OF_A_KIND = 1 << 10,
  STRAIGHT = 1 << 11,
  FLUSH = 1 << 12,
  FULL_HOUSE = 1 << 13,
  FOUR_OF_A_KIND = 1 << 14,
  STRAIGHT_FLUSH = 1 << 15
}

export interface HandResult {
  rank: HandRank;
  value: number;
  description: string;
  cards: Card[];
}

export class HandEvaluator {
  static evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
    const allCards = [...holeCards, ...communityCards];
    
    // Check for straight flush
    const straightFlush = this.findStraightFlush(allCards);
    if (straightFlush) return straightFlush;

    // Check for four of a kind
    const fourOfAKind = this.findFourOfAKind(allCards);
    if (fourOfAKind) return fourOfAKind;

    // Check for full house
    const fullHouse = this.findFullHouse(allCards);
    if (fullHouse) return fullHouse;

    // Check for flush
    const flush = this.findFlush(allCards);
    if (flush) return flush;

    // Check for straight
    const straight = this.findStraight(allCards);
    if (straight) return straight;

    // Check for three of a kind
    const threeOfAKind = this.findThreeOfAKind(allCards);
    if (threeOfAKind) return threeOfAKind;

    // Check for two pair
    const twoPair = this.findTwoPair(allCards);
    if (twoPair) return twoPair;

    // Check for one pair
    const onePair = this.findOnePair(allCards);
    if (onePair) return onePair;

    // High card
    return this.findHighCard(allCards);
  }

  private static findStraightFlush(cards: Card[]): HandResult | null {
    const flush = this.findFlush(cards);
    if (!flush) return null;

    const straight = this.findStraight(flush.cards);
    if (!straight) return null;

    return {
      rank: HandRank.STRAIGHT_FLUSH,
      value: straight.value,
      description: `Straight Flush: ${straight.description}`,
      cards: straight.cards
    };
  }

  private static findFourOfAKind(cards: Card[]): HandResult | null {
    const rankCounts = this.getRankCounts(cards);
    const fourRank = Object.entries(rankCounts).find(([_, count]) => count === 4);
    
    if (!fourRank) return null;

    const fourCards = cards.filter(c => c.rank === parseInt(fourRank[0]));
    const kicker = cards.find(c => c.rank !== parseInt(fourRank[0]))!;

    return {
      rank: HandRank.FOUR_OF_A_KIND,
      value: parseInt(fourRank[0]) * 100 + kicker.rank,
      description: `Four of a Kind: ${fourRank[0]}s`,
      cards: [...fourCards, kicker]
    };
  }

  private static findFullHouse(cards: Card[]): HandResult | null {
    const rankCounts = this.getRankCounts(cards);
    const threeRank = Object.entries(rankCounts).find(([_, count]) => count === 3);
    const pairRank = Object.entries(rankCounts).find(([rank, count]) => count === 2 && rank !== threeRank![0]);
    
    if (!threeRank || !pairRank) return null;

    const threeCards = cards.filter(c => c.rank === parseInt(threeRank[0]));
    const pairCards = cards.filter(c => c.rank === parseInt(pairRank[0]));

    return {
      rank: HandRank.FULL_HOUSE,
      value: parseInt(threeRank[0]) * 100 + parseInt(pairRank[0]),
      description: `Full House: ${threeRank[0]}s over ${pairRank[0]}s`,
      cards: [...threeCards, ...pairCards]
    };
  }

  private static findFlush(cards: Card[]): HandResult | null {
    const suitCounts = this.getSuitCounts(cards);
    const flushSuit = Object.entries(suitCounts).find(([_, count]) => count >= 5);
    
    if (!flushSuit) return null;

    const flushCards = cards
      .filter(c => c.suit === flushSuit[0])
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 5);

    return {
      rank: HandRank.FLUSH,
      value: flushCards[0].rank * 10000 + flushCards[1].rank * 1000 + flushCards[2].rank * 100 + flushCards[3].rank * 10 + flushCards[4].rank,
      description: `Flush: ${flushSuit[0]} high`,
      cards: flushCards
    };
  }

  private static findStraight(cards: Card[]): HandResult | null {
    const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a, b) => a - b);
    
    // Check for Ace-low straight (A,2,3,4,5)
    if (uniqueRanks.includes(Rank.ACE)) {
      const lowStraight = [Rank.ACE, Rank.DEUCE, Rank.THREE, Rank.FOUR, Rank.FIVE];
      if (lowStraight.every(rank => uniqueRanks.includes(rank))) {
        const straightCards = lowStraight.map(rank => cards.find(c => c.rank === rank)!);
        return {
          rank: HandRank.STRAIGHT,
          value: 5, // Ace-low straight
          description: 'Straight: 5-high',
          cards: straightCards
        };
      }
    }

    // Check for regular straights
    for (let i = uniqueRanks.length - 5; i >= 0; i--) {
      const straight = uniqueRanks.slice(i, i + 5);
      if (straight[i + 4] - straight[i] === 4) {
        const straightCards = straight.map(rank => cards.find(c => c.rank === rank)!);
        return {
          rank: HandRank.STRAIGHT,
          value: straight[i + 4],
          description: `Straight: ${straight[i + 4]}-high`,
          cards: straightCards
        };
      }
    }

    return null;
  }

  private static findThreeOfAKind(cards: Card[]): HandResult | null {
    const rankCounts = this.getRankCounts(cards);
    const threeRank = Object.entries(rankCounts).find(([_, count]) => count === 3);
    
    if (!threeRank) return null;

    const threeCards = cards.filter(c => c.rank === parseInt(threeRank[0]));
    const kickers = cards
      .filter(c => c.rank !== parseInt(threeRank[0]))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 2);

    return {
      rank: HandRank.THREE_OF_A_KIND,
      value: parseInt(threeRank[0]) * 100 + kickers[0].rank * 10 + kickers[1].rank,
      description: `Three of a Kind: ${threeRank[0]}s`,
      cards: [...threeCards, ...kickers]
    };
  }

  private static findTwoPair(cards: Card[]): HandResult | null {
    const rankCounts = this.getRankCounts(cards);
    const pairs = Object.entries(rankCounts)
      .filter(([_, count]) => count === 2)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));

    if (pairs.length < 2) return null;

    const highPair = cards.filter(c => c.rank === parseInt(pairs[0][0]));
    const lowPair = cards.filter(c => c.rank === parseInt(pairs[1][0]));
    const kicker = cards.find(c => c.rank !== parseInt(pairs[0][0]) && c.rank !== parseInt(pairs[1][0]))!;

    return {
      rank: HandRank.TWO_PAIR,
      value: parseInt(pairs[0][0]) * 100 + parseInt(pairs[1][0]) * 10 + kicker.rank,
      description: `Two Pair: ${pairs[0][0]}s and ${pairs[1][0]}s`,
      cards: [...highPair, ...lowPair, kicker]
    };
  }

  private static findOnePair(cards: Card[]): HandResult | null {
    const rankCounts = this.getRankCounts(cards);
    const pairRank = Object.entries(rankCounts).find(([_, count]) => count === 2);
    
    if (!pairRank) return null;

    const pairCards = cards.filter(c => c.rank === parseInt(pairRank[0]));
    const kickers = cards
      .filter(c => c.rank !== parseInt(pairRank[0]))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3);

    return {
      rank: HandRank.ONE_PAIR,
      value: parseInt(pairRank[0]) * 1000 + kickers[0].rank * 100 + kickers[1].rank * 10 + kickers[2].rank,
      description: `One Pair: ${pairRank[0]}s`,
      cards: [...pairCards, ...kickers]
    };
  }

  private static findHighCard(cards: Card[]): HandResult {
    const highCards = cards
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 5);

    return {
      rank: HandRank.HIGH_CARD,
      value: highCards[0].rank * 10000 + highCards[1].rank * 1000 + highCards[2].rank * 100 + highCards[3].rank * 10 + highCards[4].rank,
      description: `High Card: ${highCards[0].rank}`,
      cards: highCards
    };
  }

  private static getRankCounts(cards: Card[]): { [rank: number]: number } {
    const counts: { [rank: number]: number } = {};
    cards.forEach(card => {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    });
    return counts;
  }

  private static getSuitCounts(cards: Card[]): { [suit: string]: number } {
    const counts: { [suit: string]: number } = {};
    cards.forEach(card => {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    });
    return counts;
  }

  static compareHands(hand1: HandResult, hand2: HandResult): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }
    return hand1.value - hand2.value;
  }

  static getHandDescription(rank: HandRank): string {
    switch (rank) {
      case HandRank.HIGH_CARD: return 'High Card';
      case HandRank.ONE_PAIR: return 'One Pair';
      case HandRank.TWO_PAIR: return 'Two Pair';
      case HandRank.THREE_OF_A_KIND: return 'Three of a Kind';
      case HandRank.STRAIGHT: return 'Straight';
      case HandRank.FLUSH: return 'Flush';
      case HandRank.FULL_HOUSE: return 'Full House';
      case HandRank.FOUR_OF_A_KIND: return 'Four of a Kind';
      case HandRank.STRAIGHT_FLUSH: return 'Straight Flush';
      default: return 'Unknown';
    }
  }
} 