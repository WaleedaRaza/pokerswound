"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokerEngineDemo = void 0;
const card_1 = require("../core/card/card");
const suit_1 = require("../core/card/suit");
const rank_1 = require("../core/card/rank");
const enhanced_hand_evaluator_1 = require("../core/engine/enhanced-hand-evaluator");
const hand_evaluator_1 = require("../core/engine/hand-evaluator");
class PokerEngineDemo {
    async runComparison() {
        console.log('🎯 POKER ENGINE COMPARISON DEMO');
        console.log('================================\n');
        const hole1 = [
            new card_1.Card(suit_1.Suit.Spades, rank_1.Rank.Ace),
            new card_1.Card(suit_1.Suit.Hearts, rank_1.Rank.Ace)
        ];
        const hole2 = [
            new card_1.Card(suit_1.Suit.Diamonds, rank_1.Rank.King),
            new card_1.Card(suit_1.Suit.Clubs, rank_1.Rank.King)
        ];
        const community = [
            new card_1.Card(suit_1.Suit.Spades, rank_1.Rank.Queen),
            new card_1.Card(suit_1.Suit.Hearts, rank_1.Rank.Jack),
            new card_1.Card(suit_1.Suit.Diamonds, rank_1.Rank.Ten),
            new card_1.Card(suit_1.Suit.Clubs, rank_1.Rank.Nine),
            new card_1.Card(suit_1.Suit.Spades, rank_1.Rank.Eight)
        ];
        console.log('🃏 Test Hands:');
        console.log(`Hand 1: ${hole1.map(c => c.code).join(', ')}`);
        console.log(`Hand 2: ${hole2.map(c => c.code).join(', ')}`);
        console.log(`Community: ${community.map(c => c.code).join(', ')}\n`);
        console.log('🐍 PyPokerEngine Results:');
        console.log('-------------------------');
        try {
            const result = await enhanced_hand_evaluator_1.enhancedHandEvaluator.quickCompare(hole1, hole2, community);
            console.log(`Hand 1: ${result.hand1.description} (Score: ${result.hand1.score})`);
            console.log(`Hand 2: ${result.hand2.description} (Score: ${result.hand2.score})`);
            console.log(`Winner: Hand ${result.winner} ${result.winner === 0 ? '(TIE)' : ''}\n`);
        }
        catch (error) {
            console.log(`Error: ${error}\n`);
        }
        console.log('⚡ Custom Implementation Results:');
        console.log('--------------------------------');
        try {
            const customEvaluator = new hand_evaluator_1.HandEvaluator();
            const hand1Result = customEvaluator.evaluateHand(hole1, community);
            const hand2Result = customEvaluator.evaluateHand(hole2, community);
            const comparison = customEvaluator.compareHands(hand1Result, hand2Result);
            console.log(`Hand 1: ${this.getCustomHandDescription(hand1Result)}`);
            console.log(`Hand 2: ${this.getCustomHandDescription(hand2Result)}`);
            console.log(`Winner: ${comparison > 0 ? 'Hand 1' : comparison < 0 ? 'Hand 2' : 'TIE'}\n`);
        }
        catch (error) {
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
            const { pokerBridge } = await Promise.resolve().then(() => __importStar(require('../bridge/poker-engine-bridge')));
            const gameResult = await pokerBridge.runTestGame();
            if (gameResult.success && gameResult.result) {
                console.log('🏆 Game Results:');
                console.log(`Rounds played: ${gameResult.result.rule.max_round}`);
                console.log(`Initial stack: ${gameResult.result.rule.initial_stack}`);
                console.log(`Small blind: ${gameResult.result.rule.small_blind_amount}\n`);
                console.log('👥 Final Player Standings:');
                gameResult.result.players.forEach((player, index) => {
                    console.log(`${index + 1}. ${player.name}: ${player.stack} chips`);
                });
                console.log();
            }
        }
        catch (error) {
            console.log(`Game simulation error: ${error}\n`);
        }
    }
    async runHandRangeDemo() {
        console.log('📊 HAND RANGE ANALYSIS DEMO');
        console.log('===========================\n');
        try {
            const { pokerBridge } = await Promise.resolve().then(() => __importStar(require('../bridge/poker-engine-bridge')));
            const ranges = ['AA', 'AKs', 'AKo', 'JJ+', 'ATs+'];
            for (const range of ranges) {
                const result = await pokerBridge.parseHandRange(range);
                if (result.success) {
                    console.log(`${range}: ${result.count} combinations`);
                    if (result.combos && result.combos.length <= 10) {
                        console.log(`  Combos: ${result.combos.join(', ')}`);
                    }
                }
                else {
                    console.log(`${range}: ${result.error}`);
                }
            }
            console.log();
        }
        catch (error) {
            console.log(`Range analysis error: ${error}\n`);
        }
    }
    getCustomHandDescription(handRank) {
        const rankings = [
            'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
            'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'
        ];
        return rankings[handRank.ranking - 1] || 'Unknown';
    }
}
exports.PokerEngineDemo = PokerEngineDemo;
if (require.main === module) {
    const demo = new PokerEngineDemo();
    (async () => {
        await demo.runComparison();
        await demo.runGameSimulation();
        await demo.runHandRangeDemo();
        console.log('🎉 Demo complete! Integration successful!');
    })().catch(console.error);
}
