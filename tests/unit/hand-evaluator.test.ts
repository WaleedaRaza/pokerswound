import { HandEvaluator, HandRanking } from '../../src/core/engine/hand-evaluator';
import { Card } from '../../src/core/card/card';
import { Suit } from '../../src/core/card/suit';
import { Rank } from '../../src/core/card/rank';
import type { Hole2 } from '../../src/types/card.types';

describe('HandEvaluator', () => {
  let evaluator: HandEvaluator;

  beforeEach(() => {
    evaluator = new HandEvaluator();
  });

  // Helper function to create cards
  const createCard = (suit: Suit, rank: Rank): Card => new Card(suit, rank);
  
  const createHole = (cards: [Suit, Rank][]): Hole2 => {
    const cardArray = cards.map(([suit, rank]) => createCard(suit, rank));
    if (cardArray.length !== 2) {
      throw new Error('Hole must have exactly 2 cards');
    }
    return [cardArray[0], cardArray[1]] as Hole2;
  };

  const createCommunity = (cards: [Suit, Rank][]): Card[] =>
    cards.map(([suit, rank]) => createCard(suit, rank));

  describe('Hand Rankings', () => {
    test('should identify Royal Flush', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Spades, Rank.King]]);
      const community = createCommunity([
        [Suit.Spades, Rank.Queen],
        [Suit.Spades, Rank.Jack],
        [Suit.Spades, Rank.Ten],
        [Suit.Hearts, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.RoyalFlush);
      expect(result.primaryRank).toBe(14); // Ace high
    });

    test('should identify Straight Flush', () => {
      const hole = createHole([[Suit.Hearts, Rank.Nine], [Suit.Hearts, Rank.Eight]]);
      const community = createCommunity([
        [Suit.Hearts, Rank.Seven],
        [Suit.Hearts, Rank.Six],
        [Suit.Hearts, Rank.Five],
        [Suit.Spades, Rank.Ace],
        [Suit.Clubs, Rank.King]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.StraightFlush);
      expect(result.primaryRank).toBe(9); // Nine high straight flush
    });

    test('should identify Four of a Kind', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.Ace]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Ace],
        [Suit.Clubs, Rank.Ace],
        [Suit.Hearts, Rank.King],
        [Suit.Spades, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.FourOfAKind);
      expect(result.primaryRank).toBe(14); // Four Aces
      expect(result.kickers[0]).toBe(13); // King kicker
    });

    test('should identify Full House', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.Ace]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Ace],
        [Suit.Clubs, Rank.King],
        [Suit.Hearts, Rank.King],
        [Suit.Spades, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.FullHouse);
      expect(result.primaryRank).toBe(14); // Aces full
      expect(result.secondaryRank).toBe(13); // of Kings
    });

    test('should identify Flush', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Spades, Rank.Nine]]);
      const community = createCommunity([
        [Suit.Spades, Rank.Seven],
        [Suit.Spades, Rank.Five],
        [Suit.Spades, Rank.Three],
        [Suit.Hearts, Rank.King],
        [Suit.Clubs, Rank.Queen]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.Flush);
      expect(result.primaryRank).toBe(14); // Ace high flush
      expect(result.kickers).toEqual([9, 7, 5, 3]); // Remaining flush cards
    });

    test('should identify Straight', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Queen],
        [Suit.Clubs, Rank.Jack],
        [Suit.Hearts, Rank.Ten],
        [Suit.Spades, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.Straight);
      expect(result.primaryRank).toBe(14); // Ace high straight
    });

    test('should identify low Straight (A-2-3-4-5)', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.Two]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Three],
        [Suit.Clubs, Rank.Four],
        [Suit.Hearts, Rank.Five],
        [Suit.Spades, Rank.King],
        [Suit.Clubs, Rank.Queen]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.Straight);
      expect(result.primaryRank).toBe(5); // Five high straight (wheel)
    });

    test('should identify Three of a Kind', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.Ace]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Ace],
        [Suit.Clubs, Rank.King],
        [Suit.Hearts, Rank.Queen],
        [Suit.Spades, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.ThreeOfAKind);
      expect(result.primaryRank).toBe(14); // Three Aces
      expect(result.kickers).toEqual([13, 12]); // King, Queen kickers
    });

    test('should identify Two Pair', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Ace],
        [Suit.Clubs, Rank.King],
        [Suit.Hearts, Rank.Queen],
        [Suit.Spades, Rank.Two],
        [Suit.Clubs, Rank.Three]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.TwoPair);
      expect(result.primaryRank).toBe(14); // Aces
      expect(result.secondaryRank).toBe(13); // Kings
      expect(result.kickers).toEqual([12]); // Queen kicker
    });

    test('should identify One Pair', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Ace],
        [Suit.Clubs, Rank.Queen],
        [Suit.Hearts, Rank.Jack],
        [Suit.Spades, Rank.Nine],
        [Suit.Clubs, Rank.Seven]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.Pair);
      expect(result.primaryRank).toBe(14); // Pair of Aces
      expect(result.kickers).toEqual([13, 12, 11]); // King, Queen, Jack kickers
    });

    test('should identify High Card', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]);
      const community = createCommunity([
        [Suit.Diamonds, Rank.Queen],
        [Suit.Clubs, Rank.Jack],
        [Suit.Hearts, Rank.Nine],
        [Suit.Spades, Rank.Seven],
        [Suit.Clubs, Rank.Five]
      ]);

      const result = evaluator.evaluateHand(hole, community);
      
      expect(result.ranking).toBe(HandRanking.HighCard);
      expect(result.primaryRank).toBe(14); // Ace high
      expect(result.kickers).toEqual([13, 12, 11, 9]); // Remaining high cards
    });
  });

  describe('Hand Comparison', () => {
    test('should compare hands by ranking', () => {
      const flush = {
        ranking: HandRanking.Flush,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [10, 8, 6, 4],
        cards: []
      };

      const straight = {
        ranking: HandRanking.Straight,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [],
        cards: []
      };

      expect(evaluator.compareHands(flush, straight)).toBeGreaterThan(0);
      expect(evaluator.compareHands(straight, flush)).toBeLessThan(0);
    });

    test('should compare hands by primary rank when same ranking', () => {
      const acesFullOfKings = {
        ranking: HandRanking.FullHouse,
        primaryRank: 14,
        secondaryRank: 13,
        kickers: [],
        cards: []
      };

      const kingsFullOfAces = {
        ranking: HandRanking.FullHouse,
        primaryRank: 13,
        secondaryRank: 14,
        kickers: [],
        cards: []
      };

      expect(evaluator.compareHands(acesFullOfKings, kingsFullOfAces)).toBeGreaterThan(0);
    });

    test('should compare hands by kickers', () => {
      const aceKingHigh = {
        ranking: HandRanking.HighCard,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [13, 11, 9, 7],
        cards: []
      };

      const aceQueenHigh = {
        ranking: HandRanking.HighCard,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [12, 11, 9, 7],
        cards: []
      };

      expect(evaluator.compareHands(aceKingHigh, aceQueenHigh)).toBeGreaterThan(0);
    });

    test('should identify ties', () => {
      const hand1 = {
        ranking: HandRanking.Pair,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [13, 12, 11],
        cards: []
      };

      const hand2 = {
        ranking: HandRanking.Pair,
        primaryRank: 14,
        secondaryRank: 0,
        kickers: [13, 12, 11],
        cards: []
      };

      expect(evaluator.compareHands(hand1, hand2)).toBe(0);
    });
  });

  describe('Winner Determination', () => {
    test('should find single winner', () => {
      const playerHands = [
        {
          playerUuid: 'player1',
          hole: createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.Ace]]),
          handRank: {
            ranking: HandRanking.Pair,
            primaryRank: 14,
            secondaryRank: 0,
            kickers: [13, 12, 11],
            cards: []
          }
        },
        {
          playerUuid: 'player2',
          hole: createHole([[Suit.Spades, Rank.King], [Suit.Hearts, Rank.King]]),
          handRank: {
            ranking: HandRanking.Pair,
            primaryRank: 13,
            secondaryRank: 0,
            kickers: [14, 12, 11],
            cards: []
          }
        }
      ];

      const result = evaluator.findWinners(playerHands);
      
      expect(result.winners).toEqual(['player1']);
      expect(result.handRank.ranking).toBe(HandRanking.Pair);
      expect(result.handRank.primaryRank).toBe(14);
    });

    test('should find multiple winners in tie', () => {
      const playerHands = [
        {
          playerUuid: 'player1',
          hole: createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]),
          handRank: {
            ranking: HandRanking.HighCard,
            primaryRank: 14,
            secondaryRank: 0,
            kickers: [13, 12, 11, 9],
            cards: []
          }
        },
        {
          playerUuid: 'player2',
          hole: createHole([[Suit.Diamonds, Rank.Ace], [Suit.Clubs, Rank.King]]),
          handRank: {
            ranking: HandRanking.HighCard,
            primaryRank: 14,
            secondaryRank: 0,
            kickers: [13, 12, 11, 9],
            cards: []
          }
        }
      ];

      const result = evaluator.findWinners(playerHands);
      
      expect(result.winners).toEqual(['player1', 'player2']);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid hole cards', () => {
      const invalidHole = [createCard(Suit.Spades, Rank.Ace)] as any;
      const community = createCommunity([
        [Suit.Hearts, Rank.King],
        [Suit.Diamonds, Rank.Queen],
        [Suit.Clubs, Rank.Jack],
        [Suit.Hearts, Rank.Ten],
        [Suit.Spades, Rank.Nine]
      ]);

      expect(() => evaluator.evaluateHand(invalidHole, community)).toThrow('Hole cards must be exactly 2 cards');
    });

    test('should throw error for invalid community cards', () => {
      const hole = createHole([[Suit.Spades, Rank.Ace], [Suit.Hearts, Rank.King]]);
      const invalidCommunity = createCommunity([
        [Suit.Diamonds, Rank.Queen],
        [Suit.Clubs, Rank.Jack],
        [Suit.Hearts, Rank.Ten]
      ]); // Only 3 cards instead of 5

      expect(() => evaluator.evaluateHand(hole, invalidCommunity)).toThrow('Community cards must be exactly 5 cards');
    });

    test('should throw error for empty player hands', () => {
      expect(() => evaluator.findWinners([])).toThrow('No player hands to evaluate');
    });
  });
});