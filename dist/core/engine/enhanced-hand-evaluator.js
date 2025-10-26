"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedHandEvaluator = exports.EnhancedHandEvaluator = void 0;
const poker_engine_bridge_1 = require("../../bridge/poker-engine-bridge");
class EnhancedHandEvaluator {
    async evaluateHand(hole, community) {
        const result = await poker_engine_bridge_1.pokerBridge.evaluateHand(hole, community);
        if (!result.success || !result.hand_info) {
            throw new Error(`Hand evaluation failed: ${result.error}`);
        }
        return {
            strength: result.strength || 'UNKNOWN',
            score: result.score || 0,
            high: result.hand_info.hand.high,
            low: result.hand_info.hand.low,
            description: this.getHandDescription(result.strength || 'UNKNOWN', result.hand_info.hand.high)
        };
    }
    async compareHands(hand1, hand2) {
        if (hand1.score > hand2.score)
            return 1;
        if (hand2.score > hand1.score)
            return -1;
        return 0;
    }
    async findWinners(playerHands) {
        if (playerHands.length === 0) {
            throw new Error('No player hands to evaluate');
        }
        if (playerHands.length === 1) {
            return {
                winners: [playerHands[0].playerUuid],
                handRank: playerHands[0].handRank,
                description: `${playerHands[0].handRank.description} wins`
            };
        }
        let bestHand = playerHands[0];
        let winners = [playerHands[0].playerUuid];
        for (let i = 1; i < playerHands.length; i++) {
            const comparison = await this.compareHands(playerHands[i].handRank, bestHand.handRank);
            if (comparison > 0) {
                bestHand = playerHands[i];
                winners = [playerHands[i].playerUuid];
            }
            else if (comparison === 0) {
                winners.push(playerHands[i].playerUuid);
            }
        }
        return {
            winners,
            handRank: bestHand.handRank,
            description: winners.length > 1
                ? `${bestHand.handRank.description} (${winners.length}-way tie)`
                : `${bestHand.handRank.description} wins`
        };
    }
    async evaluateMultipleHands(playerHoles, community) {
        const results = [];
        for (const playerHole of playerHoles) {
            try {
                const handRank = await this.evaluateHand(playerHole.hole, community);
                results.push({
                    playerUuid: playerHole.playerUuid,
                    hole: playerHole.hole,
                    handRank
                });
            }
            catch (error) {
                console.error(`Failed to evaluate hand for ${playerHole.playerUuid}:`, error);
                results.push({
                    playerUuid: playerHole.playerUuid,
                    hole: playerHole.hole,
                    handRank: {
                        strength: 'HIGHCARD',
                        score: 0,
                        high: 2,
                        low: 0,
                        description: 'High Card (evaluation failed)'
                    }
                });
            }
        }
        return results;
    }
    async quickCompare(hand1Hole, hand2Hole, community) {
        const result = await poker_engine_bridge_1.pokerBridge.compareHands(hand1Hole, hand2Hole, community);
        if (!result.success) {
            throw new Error(`Hand comparison failed: ${result.error}`);
        }
        const hand1Rank = {
            strength: result.hand1?.strength || 'UNKNOWN',
            score: result.hand1?.score || 0,
            high: result.hand1?.hand_info?.hand.high || 0,
            low: result.hand1?.hand_info?.hand.low || 0,
            description: this.getHandDescription(result.hand1?.strength || 'UNKNOWN', result.hand1?.hand_info?.hand.high || 0)
        };
        const hand2Rank = {
            strength: result.hand2?.strength || 'UNKNOWN',
            score: result.hand2?.score || 0,
            high: result.hand2?.hand_info?.hand.high || 0,
            low: result.hand2?.hand_info?.hand.low || 0,
            description: this.getHandDescription(result.hand2?.strength || 'UNKNOWN', result.hand2?.hand_info?.hand.high || 0)
        };
        return {
            winner: result.winner || 0,
            hand1: hand1Rank,
            hand2: hand2Rank
        };
    }
    getHandDescription(strength, high) {
        const rankNames = {
            2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
            8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
        };
        const rankName = rankNames[high] || high.toString();
        switch (strength) {
            case 'HIGHCARD': return `${rankName} High`;
            case 'ONEPAIR': return `Pair of ${rankName}s`;
            case 'TWOPAIR': return `Two Pair, ${rankName}s high`;
            case 'THREECARD': return `Three ${rankName}s`;
            case 'STRAIGHT': return `Straight, ${rankName} high`;
            case 'FLASH': return `Flush, ${rankName} high`;
            case 'FULLHOUSE': return `Full House, ${rankName}s full`;
            case 'FOURCARD': return `Four ${rankName}s`;
            case 'STRAIGHTFLASH': return `Straight Flush, ${rankName} high`;
            default: return `${strength} (${rankName} high)`;
        }
    }
}
exports.EnhancedHandEvaluator = EnhancedHandEvaluator;
exports.enhancedHandEvaluator = new EnhancedHandEvaluator();
