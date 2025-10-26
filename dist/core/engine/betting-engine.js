"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BettingEngine = void 0;
const common_types_1 = require("../../types/common.types");
class BettingEngine {
    validateAction(action, gameState, currentBet, minRaise) {
        const player = gameState.getPlayer(action.playerUuid);
        if (!player) {
            return { isValid: false, error: 'Player not found' };
        }
        if (player.hasFolded) {
            return { isValid: false, error: 'Player has already folded' };
        }
        if (player.isAllIn) {
            return { isValid: false, error: 'Player is already all-in' };
        }
        const playerStack = player.stack;
        const playerBetThisStreet = player.betThisStreet;
        const currentBetNum = currentBet;
        const actionAmount = action.amount || 0;
        switch (action.actionType) {
            case common_types_1.ActionType.Fold:
                return { isValid: true };
            case common_types_1.ActionType.Check:
                if (currentBetNum > playerBetThisStreet) {
                    return { isValid: false, error: 'Cannot check when facing a bet' };
                }
                return { isValid: true };
            case common_types_1.ActionType.Call:
                const callAmount = currentBetNum - playerBetThisStreet;
                if (callAmount <= 0) {
                    return { isValid: false, error: 'No bet to call' };
                }
                if (callAmount > playerStack) {
                    return {
                        isValid: true,
                        adjustedAmount: playerStack,
                        isAllIn: true
                    };
                }
                if (actionAmount !== callAmount && actionAmount !== playerStack) {
                    return {
                        isValid: false,
                        error: `Call amount must be ${callAmount}, got ${actionAmount}`
                    };
                }
                if (actionAmount === playerStack && actionAmount < callAmount) {
                    return {
                        isValid: true,
                        adjustedAmount: playerStack,
                        isAllIn: true
                    };
                }
                return { isValid: true };
            case common_types_1.ActionType.Bet:
                if (currentBetNum > 0) {
                    return { isValid: false, error: 'Cannot bet when there is already a bet' };
                }
                return this.validateBetAmount(actionAmount, playerStack, minRaise);
            case common_types_1.ActionType.Raise:
                if (currentBetNum === 0) {
                    return { isValid: false, error: 'Cannot raise when there is no bet' };
                }
                const totalRaiseAmount = actionAmount;
                const callPortion = currentBetNum - playerBetThisStreet;
                const raisePortion = totalRaiseAmount - callPortion;
                if (raisePortion < minRaise) {
                    return {
                        isValid: false,
                        error: `Raise must be at least ${minRaise}, raise portion is ${raisePortion}`
                    };
                }
                return this.validateBetAmount(totalRaiseAmount, playerStack, minRaise);
            case common_types_1.ActionType.AllIn:
                if (playerStack <= 0) {
                    return { isValid: false, error: 'Player has no chips to go all-in' };
                }
                return {
                    isValid: true,
                    adjustedAmount: playerStack,
                    isAllIn: true
                };
            case common_types_1.ActionType.SmallBlind:
            case common_types_1.ActionType.BigBlind:
                return { isValid: true };
            default:
                return { isValid: false, error: `Unknown action type: ${action.actionType}` };
        }
    }
    calculateMinRaise(_gameState, currentBet, lastRaiseAmount, bigBlind) {
        const currentBetNum = currentBet;
        const lastRaiseNum = lastRaiseAmount;
        const bigBlindNum = bigBlind;
        if (currentBetNum === 0) {
            return bigBlind;
        }
        const minRaiseAmount = Math.max(lastRaiseNum, bigBlindNum);
        return minRaiseAmount;
    }
    processAction(action, gameState, currentBet, minRaise) {
        const validation = this.validateAction(action, gameState, currentBet, minRaise);
        if (!validation.isValid) {
            throw new Error(`Invalid action: ${validation.error}`);
        }
        const player = gameState.getPlayer(action.playerUuid);
        if (!player) {
            throw new Error('Player not found');
        }
        const actionAmount = validation.adjustedAmount || action.amount || 0;
        const actionAmountNum = actionAmount;
        const currentBetNum = currentBet;
        const playerBetThisStreet = player.betThisStreet;
        let newCurrentBet = currentBet;
        let newMinRaise = minRaise;
        let lastAggressor;
        let potContribution = 0;
        switch (action.actionType) {
            case common_types_1.ActionType.Fold:
                player.fold();
                break;
            case common_types_1.ActionType.Check:
                break;
            case common_types_1.ActionType.Call:
                const callAmount = Math.min(actionAmountNum, currentBetNum - playerBetThisStreet);
                player.collectBet(callAmount);
                potContribution = callAmount;
                if (validation.isAllIn) {
                    player.allIn();
                }
                break;
            case common_types_1.ActionType.Bet:
                player.collectBet(actionAmount);
                newCurrentBet = (playerBetThisStreet + actionAmountNum);
                newMinRaise = actionAmount;
                lastAggressor = action.playerUuid;
                potContribution = actionAmount;
                if (validation.isAllIn) {
                    player.allIn();
                }
                break;
            case common_types_1.ActionType.Raise:
                player.collectBet(actionAmount);
                const newTotalBet = playerBetThisStreet + actionAmountNum;
                const raiseAmount = newTotalBet - currentBetNum;
                newCurrentBet = newTotalBet;
                newMinRaise = raiseAmount;
                lastAggressor = action.playerUuid;
                potContribution = actionAmount;
                if (validation.isAllIn) {
                    player.allIn();
                }
                break;
            case common_types_1.ActionType.AllIn:
                player.allIn();
                const allInAmount = player.betThisStreet;
                if (allInAmount > currentBetNum) {
                    newCurrentBet = allInAmount;
                    newMinRaise = (allInAmount - currentBetNum);
                    lastAggressor = action.playerUuid;
                }
                potContribution = actionAmount;
                break;
            case common_types_1.ActionType.SmallBlind:
            case common_types_1.ActionType.BigBlind:
                player.collectBet(actionAmount);
                potContribution = actionAmount;
                if (action.actionType === common_types_1.ActionType.BigBlind) {
                    newCurrentBet = actionAmount;
                    newMinRaise = actionAmount;
                }
                break;
        }
        return {
            newCurrentBet,
            newMinRaise,
            ...(lastAggressor && { lastAggressor }),
            potContribution,
        };
    }
    postBlinds(gameState, smallBlindPlayer, bigBlindPlayer, smallBlind, bigBlind) {
        const sbPlayer = gameState.getPlayer(smallBlindPlayer);
        const bbPlayer = gameState.getPlayer(bigBlindPlayer);
        if (!sbPlayer || !bbPlayer) {
            throw new Error('Blind players not found');
        }
        const sbAmount = Math.min(sbPlayer.stack, smallBlind);
        const sbAction = {
            playerUuid: smallBlindPlayer,
            actionType: common_types_1.ActionType.SmallBlind,
            amount: sbAmount,
        };
        const sbResult = this.processAction(sbAction, gameState, 0, bigBlind);
        const bbAmount = Math.min(bbPlayer.stack, bigBlind);
        const bbAction = {
            playerUuid: bigBlindPlayer,
            actionType: common_types_1.ActionType.BigBlind,
            amount: bbAmount,
        };
        const bbResult = this.processAction(bbAction, gameState, sbResult.newCurrentBet, bigBlind);
        return {
            sbContribution: sbResult.potContribution,
            bbContribution: bbResult.potContribution,
        };
    }
    isBettingRoundComplete(gameState, currentBet, lastAggressor) {
        const activePlayers = gameState.getActivePlayers();
        if (activePlayers.length <= 1) {
            return true;
        }
        const currentBetNum = currentBet;
        for (const player of activePlayers) {
            if (player.isAllIn) {
                continue;
            }
            const playerBet = player.betThisStreet;
            if (playerBet < currentBetNum) {
                return false;
            }
        }
        if (lastAggressor) {
            const aggressorPlayer = gameState.getPlayer(lastAggressor);
            if (!aggressorPlayer) {
                return true;
            }
            const aggressorBet = aggressorPlayer.betThisStreet;
            if (aggressorBet === currentBetNum) {
                return true;
            }
        }
        return true;
    }
    getLegalActions(playerUuid, gameState, currentBet, minRaise) {
        const player = gameState.getPlayer(playerUuid);
        if (!player || player.hasFolded || player.isAllIn) {
            return [];
        }
        const actions = [];
        const currentBetNum = currentBet;
        const playerBetThisStreet = player.betThisStreet;
        const playerStack = player.stack;
        actions.push(common_types_1.ActionType.Fold);
        if (currentBetNum === playerBetThisStreet) {
            actions.push(common_types_1.ActionType.Check);
        }
        const callAmount = currentBetNum - playerBetThisStreet;
        if (callAmount > 0 && callAmount <= playerStack) {
            actions.push(common_types_1.ActionType.Call);
        }
        if (currentBetNum === 0 && playerStack >= minRaise) {
            actions.push(common_types_1.ActionType.Bet);
        }
        if (currentBetNum > 0) {
            const minRaiseTotal = currentBetNum + minRaise;
            if (playerStack >= minRaiseTotal - playerBetThisStreet) {
                actions.push(common_types_1.ActionType.Raise);
            }
        }
        if (playerStack > 0) {
            actions.push(common_types_1.ActionType.AllIn);
        }
        return actions;
    }
    validateBetAmount(amount, playerStack, minRaise) {
        if (amount <= 0) {
            return { isValid: false, error: 'Bet amount must be positive' };
        }
        if (amount > playerStack) {
            return { isValid: false, error: 'Bet amount exceeds player stack' };
        }
        const minRaiseNum = minRaise;
        if (amount < minRaiseNum && amount < playerStack) {
            return {
                isValid: false,
                error: `Bet must be at least ${minRaiseNum} or all-in`
            };
        }
        if (amount === playerStack && amount < minRaiseNum) {
            return {
                isValid: true,
                adjustedAmount: amount,
                isAllIn: true
            };
        }
        return { isValid: true };
    }
}
exports.BettingEngine = BettingEngine;
