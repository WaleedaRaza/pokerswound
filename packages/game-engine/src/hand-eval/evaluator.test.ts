import { HandEvaluator } from './evaluator';
import { Card, Rank, Suit } from '../deck/types';

describe('HandEvaluator', () => {
  describe('evaluateFiveCards', () => {
    it('should detect a royal flush', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'hearts_10' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Royal Flush');
    });

    it('should detect a straight flush', () => {
      const cards: Card[] = [
        { suit: Suit.CLUBS, rank: Rank.NINE, id: 'clubs_9' },
        { suit: Suit.CLUBS, rank: Rank.EIGHT, id: 'clubs_8' },
        { suit: Suit.CLUBS, rank: Rank.SEVEN, id: 'clubs_7' },
        { suit: Suit.CLUBS, rank: Rank.SIX, id: 'clubs_6' },
        { suit: Suit.CLUBS, rank: Rank.FIVE, id: 'clubs_5' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Straight Flush');
    });

    it('should detect four of a kind', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.ACE, id: 'spades_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Four of a Kind');
    });

    it('should detect full house', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.KING, id: 'spades_13' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Full House');
    });

    it('should detect flush', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
        { suit: Suit.HEARTS, rank: Rank.NINE, id: 'hearts_9' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Flush');
    });

    it('should detect straight', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.SEVEN, id: 'hearts_7' },
        { suit: Suit.DIAMONDS, rank: Rank.SIX, id: 'diamonds_6' },
        { suit: Suit.CLUBS, rank: Rank.FIVE, id: 'clubs_5' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'spades_4' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'hearts_3' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Straight');
    });

    it('should detect three of a kind', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.KING, id: 'spades_13' },
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Three of a Kind');
    });

    it('should detect two pair', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.KING, id: 'clubs_13' },
        { suit: Suit.SPADES, rank: Rank.KING, id: 'spades_13' },
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Two Pair');
    });

    it('should detect pair', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.KING, id: 'clubs_13' },
        { suit: Suit.SPADES, rank: Rank.QUEEN, id: 'spades_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('Pair');
    });

    it('should detect high card', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'diamonds_13' },
        { suit: Suit.CLUBS, rank: Rank.QUEEN, id: 'clubs_12' },
        { suit: Suit.SPADES, rank: Rank.JACK, id: 'spades_11' },
        { suit: Suit.HEARTS, rank: Rank.NINE, id: 'hearts_9' },
      ];

      const result = HandEvaluator.evaluateFiveCards(cards);
      expect(result.description).toBe('High Card');
    });
  });

  describe('evaluateHand', () => {
    it('should evaluate 7-card hand correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
      ];

      const communityCards: Card[] = [
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.ACE, id: 'spades_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
        { suit: Suit.DIAMONDS, rank: Rank.QUEEN, id: 'diamonds_12' },
        { suit: Suit.CLUBS, rank: Rank.JACK, id: 'clubs_11' },
      ];

      const result = HandEvaluator.evaluateHand(holeCards, communityCards);
      expect(result.description).toBe('Four of a Kind');
    });

    it('should find the best 5-card combination from 7 cards', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'diamonds_13' },
      ];

      const communityCards: Card[] = [
        { suit: Suit.CLUBS, rank: Rank.QUEEN, id: 'clubs_12' },
        { suit: Suit.SPADES, rank: Rank.JACK, id: 'spades_11' },
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'hearts_10' },
        { suit: Suit.DIAMONDS, rank: Rank.NINE, id: 'diamonds_9' },
        { suit: Suit.CLUBS, rank: Rank.EIGHT, id: 'clubs_8' },
      ];

      const result = HandEvaluator.evaluateHand(holeCards, communityCards);
      expect(result.description).toBe('Straight');
    });
  });

  describe('compareHands', () => {
    it('should correctly compare hands of different ranks', () => {
      const royalFlush: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'hearts_10' },
      ];

      const fourOfAKind: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.ACE, id: 'spades_14' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
      ];

      const hand1 = HandEvaluator.evaluateFiveCards(royalFlush);
      const hand2 = HandEvaluator.evaluateFiveCards(fourOfAKind);

      expect(HandEvaluator.compareHands(hand1, hand2)).toBeGreaterThan(0);
    });

    it('should correctly compare hands of the same rank', () => {
      const pair1: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
        { suit: Suit.CLUBS, rank: Rank.KING, id: 'clubs_13' },
        { suit: Suit.SPADES, rank: Rank.QUEEN, id: 'spades_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
      ];

      const pair2: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hearts_13' },
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'diamonds_13' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: 'clubs_14' },
        { suit: Suit.SPADES, rank: Rank.QUEEN, id: 'spades_12' },
        { suit: Suit.HEARTS, rank: Rank.JACK, id: 'hearts_11' },
      ];

      const hand1 = HandEvaluator.evaluateFiveCards(pair1);
      const hand2 = HandEvaluator.evaluateFiveCards(pair2);

      expect(HandEvaluator.compareHands(hand1, hand2)).toBeGreaterThan(0);
    });
  });

  describe('rankHands', () => {
    it('should rank multiple players correctly', () => {
      const players = [
        {
          playerId: 'player1',
          holeCards: [
            { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
            { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
          ]
        },
        {
          playerId: 'player2',
          holeCards: [
            { suit: Suit.CLUBS, rank: Rank.KING, id: 'clubs_13' },
            { suit: Suit.SPADES, rank: Rank.KING, id: 'spades_13' },
          ]
        }
      ];

      const communityCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'hearts_12' },
        { suit: Suit.DIAMONDS, rank: Rank.JACK, id: 'diamonds_11' },
        { suit: Suit.CLUBS, rank: Rank.THREE, id: 'clubs_3' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'spades_4' },
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'hearts_5' },
      ];

      const rankings = HandEvaluator.rankHands(players, communityCards);
      
      // Debug output
      console.log('Rankings:', rankings.map(r => ({
        playerId: r.playerId,
        hand: r.hand.description,
        score: r.hand.score
      })));
      
      expect(rankings).toHaveLength(2);
      // Both players have pairs, but player1 has aces vs player2 has kings
      expect(rankings[0].playerId).toBe('player1'); // Aces should win
      expect(rankings[0].position).toBe(1);
      expect(rankings[1].playerId).toBe('player2'); // Kings should lose
      expect(rankings[1].position).toBe(2);
    });

    it('should handle different hand types correctly', () => {
      const players = [
        {
          playerId: 'player1',
          holeCards: [
            { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts_14' },
            { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds_14' },
          ]
        },
        {
          playerId: 'player2',
          holeCards: [
            { suit: Suit.CLUBS, rank: Rank.KING, id: 'clubs_13' },
            { suit: Suit.SPADES, rank: Rank.QUEEN, id: 'spades_12' },
          ]
        }
      ];

      const communityCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.TWO, id: 'hearts_2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'diamonds_3' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'clubs_4' },
        { suit: Suit.SPADES, rank: Rank.SEVEN, id: 'spades_7' },
        { suit: Suit.HEARTS, rank: Rank.NINE, id: 'hearts_9' },
      ];

      const rankings = HandEvaluator.rankHands(players, communityCards);
      
      // Debug output
      console.log('Different hand types:', rankings.map(r => ({
        playerId: r.playerId,
        hand: r.hand.description,
        score: r.hand.score
      })));
      
      expect(rankings).toHaveLength(2);
      // player1 has a pair of aces, player2 has high card
      expect(rankings[0].playerId).toBe('player1'); // Pair should win
      expect(rankings[0].position).toBe(1);
      expect(rankings[1].playerId).toBe('player2'); // High card should lose
      expect(rankings[1].position).toBe(2);
    });
  });
}); 