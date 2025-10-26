"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandEvaluator = exports.HandRanking = void 0;
const rank_1 = require("../card/rank");
var HandRanking;
(function (HandRanking) {
    HandRanking[HandRanking["HighCard"] = 1] = "HighCard";
    HandRanking[HandRanking["Pair"] = 2] = "Pair";
    HandRanking[HandRanking["TwoPair"] = 3] = "TwoPair";
    HandRanking[HandRanking["ThreeOfAKind"] = 4] = "ThreeOfAKind";
    HandRanking[HandRanking["Straight"] = 5] = "Straight";
    HandRanking[HandRanking["Flush"] = 6] = "Flush";
    HandRanking[HandRanking["FullHouse"] = 7] = "FullHouse";
    HandRanking[HandRanking["FourOfAKind"] = 8] = "FourOfAKind";
    HandRanking[HandRanking["StraightFlush"] = 9] = "StraightFlush";
    HandRanking[HandRanking["RoyalFlush"] = 10] = "RoyalFlush";
})(HandRanking || (exports.HandRanking = HandRanking = {}));
class HandEvaluator {
    evaluateHand(hole, community) {
        if (hole.length !== 2) {
            throw new Error('Hole cards must be exactly 2 cards');
        }
        if (community.length !== 5) {
            throw new Error('Community cards must be exactly 5 cards');
        }
        const allCards = [...hole, ...community];
        return this.findBestHand(allCards);
    }
    compareHands(hand1, hand2) {
        if (hand1.ranking !== hand2.ranking) {
            return hand1.ranking - hand2.ranking;
        }
        if (hand1.primaryRank !== hand2.primaryRank) {
            return hand1.primaryRank - hand2.primaryRank;
        }
        if (hand1.secondaryRank !== hand2.secondaryRank) {
            return hand1.secondaryRank - hand2.secondaryRank;
        }
        for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
            const k1 = hand1.kickers[i] || 0;
            const k2 = hand2.kickers[i] || 0;
            if (k1 !== k2) {
                return k1 - k2;
            }
        }
        return 0;
    }
    findWinners(playerHands) {
        if (playerHands.length === 0) {
            throw new Error('No player hands to evaluate');
        }
        let bestHand = playerHands[0].handRank;
        let winners = [playerHands[0].playerUuid];
        for (let i = 1; i < playerHands.length; i++) {
            const comparison = this.compareHands(playerHands[i].handRank, bestHand);
            if (comparison > 0) {
                bestHand = playerHands[i].handRank;
                winners = [playerHands[i].playerUuid];
            }
            else if (comparison === 0) {
                winners.push(playerHands[i].playerUuid);
            }
        }
        return {
            winners,
            handRank: bestHand,
            description: this.getHandDescription(bestHand),
        };
    }
    findBestHand(cards) {
        if (cards.length !== 7) {
            throw new Error('Must evaluate exactly 7 cards');
        }
        let bestHand = null;
        const combinations = this.getCombinations(cards, 5);
        for (const combo of combinations) {
            const handRank = this.evaluateFiveCards(combo);
            if (!bestHand || this.compareHands(handRank, bestHand) > 0) {
                bestHand = handRank;
            }
        }
        if (!bestHand) {
            throw new Error('Failed to evaluate hand');
        }
        return bestHand;
    }
    evaluateFiveCards(cards) {
        if (cards.length !== 5) {
            throw new Error('Must evaluate exactly 5 cards');
        }
        const sortedCards = [...cards].sort((a, b) => HandEvaluator.RANK_VALUES[b.rank] - HandEvaluator.RANK_VALUES[a.rank]);
        const ranks = sortedCards.map(c => HandEvaluator.RANK_VALUES[c.rank]);
        const suits = sortedCards.map(c => c.suit);
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(ranks);
        const isLowStraight = this.isLowStraight(ranks);
        if (isFlush && isStraight && ranks[0] === 14) {
            return {
                ranking: HandRanking.RoyalFlush,
                primaryRank: 14,
                secondaryRank: 0,
                kickers: [],
                cards: sortedCards,
            };
        }
        if (isFlush && (isStraight || isLowStraight)) {
            return {
                ranking: HandRanking.StraightFlush,
                primaryRank: isLowStraight ? 5 : ranks[0],
                secondaryRank: 0,
                kickers: [],
                cards: sortedCards,
            };
        }
        const rankCounts = new Map();
        ranks.forEach(rank => {
            rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
        });
        const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
        const ranksByCount = Array.from(rankCounts.entries())
            .sort((a, b) => b[1] - a[1] || b[0] - a[0])
            .map(([rank]) => rank);
        if (counts[0] === 4) {
            return {
                ranking: HandRanking.FourOfAKind,
                primaryRank: ranksByCount[0],
                secondaryRank: 0,
                kickers: [ranksByCount[1]],
                cards: sortedCards,
            };
        }
        if (counts[0] === 3 && counts[1] === 2) {
            return {
                ranking: HandRanking.FullHouse,
                primaryRank: ranksByCount[0],
                secondaryRank: ranksByCount[1],
                kickers: [],
                cards: sortedCards,
            };
        }
        if (isFlush) {
            return {
                ranking: HandRanking.Flush,
                primaryRank: ranks[0],
                secondaryRank: 0,
                kickers: ranks.slice(1),
                cards: sortedCards,
            };
        }
        if (isStraight || isLowStraight) {
            return {
                ranking: HandRanking.Straight,
                primaryRank: isLowStraight ? 5 : ranks[0],
                secondaryRank: 0,
                kickers: [],
                cards: sortedCards,
            };
        }
        if (counts[0] === 3) {
            return {
                ranking: HandRanking.ThreeOfAKind,
                primaryRank: ranksByCount[0],
                secondaryRank: 0,
                kickers: ranksByCount.slice(1),
                cards: sortedCards,
            };
        }
        if (counts[0] === 2 && counts[1] === 2) {
            return {
                ranking: HandRanking.TwoPair,
                primaryRank: Math.max(ranksByCount[0], ranksByCount[1]),
                secondaryRank: Math.min(ranksByCount[0], ranksByCount[1]),
                kickers: [ranksByCount[2]],
                cards: sortedCards,
            };
        }
        if (counts[0] === 2) {
            return {
                ranking: HandRanking.Pair,
                primaryRank: ranksByCount[0],
                secondaryRank: 0,
                kickers: ranksByCount.slice(1),
                cards: sortedCards,
            };
        }
        return {
            ranking: HandRanking.HighCard,
            primaryRank: ranks[0],
            secondaryRank: 0,
            kickers: ranks.slice(1),
            cards: sortedCards,
        };
    }
    isStraight(ranks) {
        const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
        if (uniqueRanks.length !== 5)
            return false;
        for (let i = 1; i < uniqueRanks.length; i++) {
            if (uniqueRanks[i - 1] - uniqueRanks[i] !== 1) {
                return false;
            }
        }
        return true;
    }
    isLowStraight(ranks) {
        const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
        return uniqueRanks.length === 5 &&
            uniqueRanks[0] === 2 && uniqueRanks[1] === 3 &&
            uniqueRanks[2] === 4 && uniqueRanks[3] === 5 &&
            uniqueRanks[4] === 14;
    }
    getCombinations(arr, k) {
        if (k === 1)
            return arr.map(item => [item]);
        if (k === arr.length)
            return [arr];
        const result = [];
        for (let i = 0; i <= arr.length - k; i++) {
            const head = arr[i];
            const tailCombos = this.getCombinations(arr.slice(i + 1), k - 1);
            for (const tailCombo of tailCombos) {
                result.push([head, ...tailCombo]);
            }
        }
        return result;
    }
    getHandDescription(hand) {
        const baseDesc = HandEvaluator.HAND_DESCRIPTIONS[hand.ranking];
        switch (hand.ranking) {
            case HandRanking.Pair:
                return `Pair of ${this.rankToString(hand.primaryRank)}s`;
            case HandRanking.TwoPair:
                return `Two Pair, ${this.rankToString(hand.primaryRank)}s and ${this.rankToString(hand.secondaryRank)}s`;
            case HandRanking.ThreeOfAKind:
                return `Three ${this.rankToString(hand.primaryRank)}s`;
            case HandRanking.Straight:
                return `Straight, ${this.rankToString(hand.primaryRank)} high`;
            case HandRanking.Flush:
                return `Flush, ${this.rankToString(hand.primaryRank)} high`;
            case HandRanking.FullHouse:
                return `Full House, ${this.rankToString(hand.primaryRank)}s full of ${this.rankToString(hand.secondaryRank)}s`;
            case HandRanking.FourOfAKind:
                return `Four ${this.rankToString(hand.primaryRank)}s`;
            case HandRanking.StraightFlush:
                return `Straight Flush, ${this.rankToString(hand.primaryRank)} high`;
            case HandRanking.RoyalFlush:
                return 'Royal Flush';
            default:
                return `${baseDesc}, ${this.rankToString(hand.primaryRank)} high`;
        }
    }
    rankToString(rank) {
        switch (rank) {
            case 2: return 'Two';
            case 3: return 'Three';
            case 4: return 'Four';
            case 5: return 'Five';
            case 6: return 'Six';
            case 7: return 'Seven';
            case 8: return 'Eight';
            case 9: return 'Nine';
            case 10: return 'Ten';
            case 11: return 'Jack';
            case 12: return 'Queen';
            case 13: return 'King';
            case 14: return 'Ace';
            default: return rank.toString();
        }
    }
}
exports.HandEvaluator = HandEvaluator;
HandEvaluator.RANK_VALUES = {
    [rank_1.Rank.Two]: 2,
    [rank_1.Rank.Three]: 3,
    [rank_1.Rank.Four]: 4,
    [rank_1.Rank.Five]: 5,
    [rank_1.Rank.Six]: 6,
    [rank_1.Rank.Seven]: 7,
    [rank_1.Rank.Eight]: 8,
    [rank_1.Rank.Nine]: 9,
    [rank_1.Rank.Ten]: 10,
    [rank_1.Rank.Jack]: 11,
    [rank_1.Rank.Queen]: 12,
    [rank_1.Rank.King]: 13,
    [rank_1.Rank.Ace]: 14,
};
HandEvaluator.HAND_DESCRIPTIONS = {
    [HandRanking.HighCard]: 'High Card',
    [HandRanking.Pair]: 'Pair',
    [HandRanking.TwoPair]: 'Two Pair',
    [HandRanking.ThreeOfAKind]: 'Three of a Kind',
    [HandRanking.Straight]: 'Straight',
    [HandRanking.Flush]: 'Flush',
    [HandRanking.FullHouse]: 'Full House',
    [HandRanking.FourOfAKind]: 'Four of a Kind',
    [HandRanking.StraightFlush]: 'Straight Flush',
    [HandRanking.RoyalFlush]: 'Royal Flush',
};
