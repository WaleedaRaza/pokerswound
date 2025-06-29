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

    it('should detect a full house', () => {
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

    it('should detect a flush', () => {
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

    it('should detect a straight', () => {
      const cards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.NINE, id: 'hearts_9' },
        { suit: Suit.DIAMONDS, rank: Rank.EIGHT, id: 'diamonds_8' },
        { suit: Suit.CLUBS, rank: Rank.SEVEN, id: 'clubs_7' },
        { suit: Suit.SPADES, rank: Rank.SIX, id: 'spades_6' },
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'hearts_5' },
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

    it('should detect a pair', () => {
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
  });
}); 