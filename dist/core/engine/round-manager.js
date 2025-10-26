"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundManager = void 0;
const common_types_1 = require("../../types/common.types");
const game_state_1 = require("../models/game-state");
const game_state_machine_1 = require("./game-state-machine");
const betting_engine_1 = require("./betting-engine");
const pot_manager_1 = require("./pot-manager");
const hand_evaluator_1 = require("./hand-evaluator");
class RoundManager {
    constructor(randomFn = Math.random) {
        this.stateMachine = new game_state_machine_1.GameStateMachine(randomFn);
        this.bettingEngine = new betting_engine_1.BettingEngine();
        this.potManager = new pot_manager_1.PotManager();
        this.handEvaluator = new hand_evaluator_1.HandEvaluator();
    }
    async startNewRound(gameState) {
        try {
            if (!gameState.canStartHand()) {
                throw new Error('Cannot start new round: insufficient players or invalid state');
            }
            this.potManager.reset();
            const result = this.stateMachine.processAction(gameState, {
                type: 'START_HAND'
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to start hand');
            }
            return {
                success: true,
                gameState: result.newState,
                events: result.events
            };
        }
        catch (error) {
            return {
                success: false,
                gameState,
                events: [],
                error: error.message
            };
        }
    }
    async processPlayerAction(gameState, action) {
        try {
            const validation = this.validatePlayerAction(gameState, action);
            if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid action');
            }
            const adjustedAmount = validation.adjustedAmount || action.amount;
            const isAllIn = validation.isAllIn || false;
            const result = this.stateMachine.processAction(gameState, {
                type: 'PLAYER_ACTION',
                playerId: action.playerId,
                actionType: action.actionType,
                amount: adjustedAmount,
                metadata: { isAllIn }
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to process action');
            }
            this.updatePotFromAction(action.playerId, action.actionType, adjustedAmount);
            return {
                success: true,
                gameState: result.newState,
                events: result.events
            };
        }
        catch (error) {
            return {
                success: false,
                gameState,
                events: [],
                error: error.message
            };
        }
    }
    async advanceStreet(gameState) {
        try {
            if (!gameState.isBettingRoundComplete()) {
                throw new Error('Cannot advance street: betting round not complete');
            }
            const result = this.stateMachine.processAction(gameState, {
                type: 'ADVANCE_STREET'
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to advance street');
            }
            return {
                success: true,
                gameState: result.newState,
                events: result.events
            };
        }
        catch (error) {
            return {
                success: false,
                gameState,
                events: [],
                error: error.message
            };
        }
    }
    async completeHand(gameState) {
        try {
            const winners = this.determineWinners(gameState);
            const potDistribution = this.distributePot(gameState, winners);
            this.updatePlayerStacks(gameState, potDistribution);
            const result = this.stateMachine.processAction(gameState, {
                type: 'END_HAND',
                metadata: { winners, potDistribution }
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to complete hand');
            }
            return {
                success: true,
                gameState: result.newState,
                events: result.events
            };
        }
        catch (error) {
            return {
                success: false,
                gameState,
                events: [],
                error: error.message
            };
        }
    }
    getLegalActions(gameState, playerId) {
        try {
            if (gameState.toAct !== playerId) {
                return [];
            }
            const player = gameState.getPlayer(playerId);
            if (!player || player.hasFolded || player.isAllIn) {
                return [];
            }
            return this.bettingEngine.getLegalActions(playerId, gameState, gameState.bettingRound.currentBet, gameState.bettingRound.minRaise);
        }
        catch (error) {
            console.error('Error getting legal actions:', error);
            return [];
        }
    }
    isRoundComplete(gameState) {
        return gameState.isHandComplete() ||
            gameState.status === game_state_1.GameStatus.COMPLETED ||
            gameState.getActivePlayers().length <= 1;
    }
    getBettingInfo(gameState) {
        return {
            currentBet: gameState.bettingRound.currentBet,
            minRaise: gameState.bettingRound.minRaise,
            pot: gameState.pot.totalPot,
            toAct: gameState.toAct,
            timeRemaining: this.calculateTimeRemaining(gameState)
        };
    }
    validatePlayerAction(gameState, action) {
        const player = gameState.getPlayer(action.playerId);
        if (!player) {
            return { isValid: false, error: 'Player not found' };
        }
        return this.bettingEngine.validateAction({
            playerUuid: action.playerId,
            actionType: action.actionType,
            amount: action.amount
        }, gameState, gameState.bettingRound.currentBet, gameState.bettingRound.minRaise);
    }
    updatePotFromAction(playerId, actionType, amount) {
        if (!amount || amount <= 0) {
            return;
        }
        const isAllIn = actionType === common_types_1.ActionType.AllIn;
        this.potManager.addContribution(playerId, amount, isAllIn);
    }
    determineWinners(gameState) {
        const activePlayers = gameState.getActivePlayers();
        const communityCards = gameState.handState.communityCards;
        if (activePlayers.length === 1) {
            return [{
                    playerId: activePlayers[0].uuid,
                    amount: gameState.pot.totalPot,
                    handRank: null,
                    handDescription: 'Won by elimination'
                }];
        }
        const playerHands = activePlayers
            .filter(p => !p.hasFolded)
            .map(p => ({
            playerUuid: p.uuid,
            hole: p.holeCards,
            handRank: this.handEvaluator.evaluateHand(p.holeCards, communityCards)
        }));
        const result = this.handEvaluator.findWinners(playerHands);
        return result.winners.map(playerId => ({
            playerId,
            amount: 0,
            handRank: result.handRank,
            handDescription: this.getHandDescription(result.handRank)
        }));
    }
    distributePot(gameState, winners) {
        const winnerShares = new Map();
        winnerShares.set('main', winners);
        return this.potManager.distributePots(winnerShares);
    }
    updatePlayerStacks(gameState, distributions) {
        for (const distribution of distributions) {
            const player = gameState.getPlayer(distribution.playerUuid);
            if (player) {
                const currentStack = player.stack;
                const newStack = currentStack + distribution.amount;
                player.setStack(newStack);
            }
        }
    }
    calculateTimeRemaining(gameState) {
        if (!gameState.timing.actionStartTime) {
            return undefined;
        }
        const elapsed = Date.now() - gameState.timing.actionStartTime;
        const remaining = (gameState.timing.turnTimeLimit * 1000) - elapsed;
        return Math.max(0, Math.floor(remaining / 1000));
    }
    getHandDescription(handRank) {
        return handRank?.description || 'High card';
    }
    resetPotManager() {
        this.potManager.reset();
    }
    getPotBreakdown() {
        return this.potManager.getPotBreakdown();
    }
    getTotalPot() {
        return this.potManager.getTotalPot();
    }
}
exports.RoundManager = RoundManager;
