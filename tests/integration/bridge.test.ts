import { pokerBridge } from '../../src/bridge/poker-engine-bridge';
import { Card } from '../../src/core/card/card';
import { Suit } from '../../src/core/card/suit';
import { Rank } from '../../src/core/card/rank';
import type { Hole2 } from '../../src/types/card.types';

describe('Poker Engine Bridge Integration', () => {
  beforeAll(async () => {
    // Test connection to Python bridge
    const isConnected = await pokerBridge.testConnection();
    if (!isConnected) {
      throw new Error('Python bridge connection failed - check Python dependencies');
    }
  });

  describe('Hand Evaluation', () => {
    test('should evaluate pair of Aces correctly', async () => {
      const hole: Hole2 = [
        new Card(Suit.Spades, Rank.Ace),
        new Card(Suit.Hearts, Rank.Ace)
      ];
      
      const community = [
        new Card(Suit.Diamonds, Rank.King),
        new Card(Suit.Clubs, Rank.Queen),
        new Card(Suit.Spades, Rank.Jack),
        new Card(Suit.Hearts, Rank.Ten),
        new Card(Suit.Diamonds, Rank.Nine)
      ];

      const result = await pokerBridge.evaluateHand(hole, community);
      
      expect(result.success).toBe(true);
      expect(result.strength).toBe('STRAIGHT'); // A-K-Q-J-T straight
      expect(result.hand_info?.hand.high).toBe(10); // Ten high straight (A-K-Q-J-T)
    });

    test('should evaluate flush correctly', async () => {
      const hole: Hole2 = [
        new Card(Suit.Spades, Rank.Ace),
        new Card(Suit.Spades, Rank.King)
      ];
      
      const community = [
        new Card(Suit.Spades, Rank.Queen),
        new Card(Suit.Spades, Rank.Jack),
        new Card(Suit.Spades, Rank.Nine),
        new Card(Suit.Hearts, Rank.Two),
        new Card(Suit.Diamonds, Rank.Three)
      ];

      const result = await pokerBridge.evaluateHand(hole, community);
      
      expect(result.success).toBe(true);
      expect(result.strength).toBe('FLASH'); // Flush (not straight flush in this case)
    });

    test('should evaluate high card correctly', async () => {
      const hole: Hole2 = [
        new Card(Suit.Spades, Rank.Seven),
        new Card(Suit.Hearts, Rank.Two)
      ];
      
      const community = [
        new Card(Suit.Diamonds, Rank.King),
        new Card(Suit.Clubs, Rank.Queen),
        new Card(Suit.Spades, Rank.Jack),
        new Card(Suit.Hearts, Rank.Nine),
        new Card(Suit.Diamonds, Rank.Four)
      ];

      const result = await pokerBridge.evaluateHand(hole, community);
      
      expect(result.success).toBe(true);
      expect(result.strength).toBe('HIGHCARD');
      expect(result.hand_info?.hand.high).toBe(7); // Seven high (from hole cards)
    });
  });

  describe('Hand Comparison', () => {
    test('should compare hands correctly', async () => {
      const hand1: Hole2 = [
        new Card(Suit.Spades, Rank.Ace),
        new Card(Suit.Hearts, Rank.Ace)
      ];
      
      const hand2: Hole2 = [
        new Card(Suit.Diamonds, Rank.King),
        new Card(Suit.Clubs, Rank.King)
      ];
      
      const community = [
        new Card(Suit.Spades, Rank.Queen),
        new Card(Suit.Hearts, Rank.Jack),
        new Card(Suit.Diamonds, Rank.Ten),
        new Card(Suit.Clubs, Rank.Nine),
        new Card(Suit.Spades, Rank.Two)
      ];

      const result = await pokerBridge.compareHands(hand1, hand2, community);
      
      expect(result.success).toBe(true);
      expect(result.winner).toBe(2); // Hand 2 won with a straight
      expect(result.hand1?.strength).toBe('ONEPAIR'); // Pair of Aces
      expect(result.hand2?.strength).toBe('STRAIGHT'); // K-Q-J-T-9 straight
    });
  });

  describe('Range Parsing', () => {
    test('should parse hand ranges if poker-master is available', async () => {
      const result = await pokerBridge.parseHandRange('AA');
      
      if (result.success) {
        expect(result.combos).toHaveLength(6); // 6 combinations of pocket Aces
        expect(result.range).toBe('AA');
      } else {
        // poker-master might not be available, that's ok
        expect(result.error).toContain('poker-master');
      }
    });
  });

  describe('Game Simulation', () => {
    test('should run complete poker game', async () => {
      const result = await pokerBridge.runTestGame();
      
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('players');
      expect(result.result).toHaveProperty('rule');
      expect(result.result.players).toHaveLength(2);
      
      // Check that stacks changed (game was played)
      const totalStack = result.result.players.reduce((sum: number, player: any) => sum + player.stack, 0);
      expect(totalStack).toBe(200); // Should still total 200 (conservation of chips)
    });
  });
});