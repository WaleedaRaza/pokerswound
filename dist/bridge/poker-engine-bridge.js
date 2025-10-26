"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pokerBridge = void 0;
exports.pokerBridge = {
    evaluateHand: (hand, boardCards) => {
        return {
            success: true,
            strength: 'HIGH_CARD',
            score: 0,
            hand_info: {
                hand: {
                    high: 0,
                    low: 0
                }
            },
            description: 'High Card'
        };
    },
    compareHands: (hand1, hand2, community) => {
        return {
            success: true,
            winner: 0,
            hand1: {
                strength: 'HIGH_CARD',
                score: 0,
                hand_info: {
                    hand: {
                        high: 0,
                        low: 0
                    }
                }
            },
            hand2: {
                strength: 'HIGH_CARD',
                score: 0,
                hand_info: {
                    hand: {
                        high: 0,
                        low: 0
                    }
                }
            }
        };
    },
    runTestGame: (options) => {
        return {
            success: true,
            result: {}
        };
    },
    parseHandRange: (range) => {
        return [];
    }
};
