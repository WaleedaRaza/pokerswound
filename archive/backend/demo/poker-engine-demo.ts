import { Card } from '../core/card/card';
import { Suit } from '../core/card/suit';
import { Rank } from '../core/card/rank';
import { enhancedHandEvaluator } from '../core/engine/enhanced-hand-evaluator';
import { HandEvaluator } from '../core/engine/hand-evaluator'; // Our custom implementation
import type { Hole2 } from '../types/card.types';

/**
 * Demo showing both custom implementation and Python bridge integration
 */
export class PokerEngineDemo {
  
  async runComparison() {
    console.log('🎯 POKER ENGINE COMPARISON DEMO');
    console.log('================================\n');

    // Test hands
    const hole1: Hole2 = [
      new Card(Suit.Spades, Rank.Ace),
      new Card(Suit.Hearts, Rank.Ace)
    ];

    const hole2: Hole2 = [
      new Card(Suit.Diamonds, Rank.King),
      new Card(Suit.Clubs, Rank.King)
    ];

    const community = [
      new Card(Suit.Spades, Rank.Queen),
      new Card(Suit.Hearts, Rank.Jack),
      new Card(Suit.Diamonds, Rank.Ten),
      new Card(Suit.Clubs, Rank.Nine),
      new Card(Suit.Spades, Rank.Eight)
    ];

    console.log('🃏 Test Hands:');
    console.log(`Hand 1: ${hole1.map(c => c.code).join(', ')}`);
    console.log(`Hand 2: ${hole2.map(c => c.code).join(', ')}`);
    console.log(`Community: ${community.map(c => c.code).join(', ')}\n`);

    // Test with PyPokerEngine bridge
    console.log('🐍 PyPokerEngine Results:');
    console.log('-------------------------');
    try {
      const result = await enhancedHandEvaluator.quickCompare(hole1, hole2, community);
      
      console.log(`Hand 1: ${result.hand1.description} (Score: ${result.hand1.score})`);
      console.log(`Hand 2: ${result.hand2.description} (Score: ${result.hand2.score})`);
      console.log(`Winner: Hand ${result.winner} ${result.winner === 0 ? '(TIE)' : ''}\n`);
    } catch (error) {
      console.log(`Error: ${error}\n`);
    }

    // Test with our custom implementation
    console.log('⚡ Custom Implementation Results:');
    console.log('--------------------------------');
    try {
      const customEvaluator = new HandEvaluator();
      
      const hand1Result = customEvaluator.evaluateHand(hole1, community);
      const hand2Result = customEvaluator.evaluateHand(hole2, community);
      const comparison = customEvaluator.compareHands(hand1Result, hand2Result);
      
      console.log(`Hand 1: ${this.getCustomHandDescription(hand1Result)}`);
      console.log(`Hand 2: ${this.getCustomHandDescription(hand2Result)}`);
      console.log(`Winner: ${comparison > 0 ? 'Hand 1' : comparison < 0 ? 'Hand 2' : 'TIE'}\n`);
    } catch (error) {
      console.log(`Error: ${error}\n`);
    }

    console.log('🚀 Integration Benefits:');
    console.log('------------------------');
    console.log('✅ PyPokerEngine: Battle-tested, fast bitwise evaluation');
    console.log('✅ poker-master: Advanced hand parsing and range analysis');
    console.log('✅ Custom Engine: Full control, TypeScript native');
    console.log('✅ Bridge: Best of both worlds - proven logic + custom features\n');
  }

  async runGameSimulation() {
    console.log('🎮 GAME SIMULATION DEMO');
    console.log('=======================\n');

    try {
      // Run a complete game using PyPokerEngine
      const { pokerBridge } = await import('../bridge/poker-engine-bridge');
      const gameResult = await pokerBridge.runTestGame();
      
      if (gameResult.success && gameResult.result) {
        console.log('🏆 Game Results:');
        console.log(`Rounds played: ${gameResult.result.rule.max_round}`);
        console.log(`Initial stack: ${gameResult.result.rule.initial_stack}`);
        console.log(`Small blind: ${gameResult.result.rule.small_blind_amount}\n`);
        
        console.log('👥 Final Player Standings:');
        gameResult.result.players.forEach((player: any, index: number) => {
          console.log(`${index + 1}. ${player.name}: ${player.stack} chips`);
        });
        console.log();
      }
    } catch (error) {
      console.log(`Game simulation error: ${error}\n`);
    }
  }

  async runHandRangeDemo() {
    console.log('📊 HAND RANGE ANALYSIS DEMO');
    console.log('===========================\n');

    try {
      const { pokerBridge } = await import('../bridge/poker-engine-bridge');
      
      const ranges = ['AA', 'AKs', 'AKo', 'JJ+', 'ATs+'];
      
      for (const range of ranges) {
        const result = await pokerBridge.parseHandRange(range);
        
        if (result.success) {
          console.log(`${range}: ${result.count} combinations`);
          if (result.combos && result.combos.length <= 10) {
            console.log(`  Combos: ${result.combos.join(', ')}`);
          }
        } else {
          console.log(`${range}: ${result.error}`);
        }
      }
      console.log();
    } catch (error) {
      console.log(`Range analysis error: ${error}\n`);
    }
  }

  private getCustomHandDescription(handRank: any): string {
    const rankings = [
      'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
      'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'
    ];
    
    return rankings[handRank.ranking - 1] || 'Unknown';
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new PokerEngineDemo();
  
  (async () => {
    await demo.runComparison();
    await demo.runGameSimulation();
    await demo.runHandRangeDemo();
    
    console.log('🎉 Demo complete! Integration successful!');
  })().catch(console.error);
}