"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionValidator = void 0;
const common_types_1 = require("../../types/common.types");
class ActionValidator {
    validateAction(playerUuid, actionType, amount, context) {
        const basicValidation = this.validateBasicAction(playerUuid, actionType, amount, context);
        if (!basicValidation.isValid) {
            return basicValidation;
        }
        const positionValidation = this.validatePositionAction(playerUuid, actionType, context);
        if (!positionValidation.isValid) {
            return positionValidation;
        }
        const streetValidation = this.validateStreetAction(actionType, amount, context);
        if (!streetValidation.isValid) {
            return streetValidation;
        }
        const stackValidation = this.validateStackConstraints(playerUuid, actionType, amount, context);
        if (!stackValidation.isValid) {
            return stackValidation;
        }
        const stringBettingValidation = this.validateStringBetting(playerUuid, actionType, amount, context);
        if (!stringBettingValidation.isValid) {
            return stringBettingValidation;
        }
        const sequenceValidation = this.validateActionSequence(playerUuid, actionType, context);
        if (!sequenceValidation.isValid) {
            return sequenceValidation;
        }
        return { isValid: true };
    }
    getLegalActions(playerUuid, context) {
        const player = context.gameState.getPlayer(playerUuid);
        if (!player) {
            return [];
        }
        if (player.hasFolded || player.isAllIn) {
            return [];
        }
        if (context.playerToAct !== playerUuid) {
            return [];
        }
        const legalActions = [];
        const currentBetNum = context.currentBet;
        const playerBetThisStreet = player.betThisStreet;
        const playerStack = player.stack;
        legalActions.push(common_types_1.ActionType.Fold);
        if (currentBetNum === playerBetThisStreet) {
            legalActions.push(common_types_1.ActionType.Check);
        }
        const callAmount = currentBetNum - playerBetThisStreet;
        if (callAmount > 0) {
            if (callAmount <= playerStack) {
                legalActions.push(common_types_1.ActionType.Call);
            }
        }
        if (currentBetNum === 0) {
            const minBet = context.minRaise;
            if (playerStack >= minBet) {
                legalActions.push(common_types_1.ActionType.Bet);
            }
        }
        if (currentBetNum > 0) {
            const minRaiseTotal = currentBetNum + context.minRaise;
            const additionalNeeded = minRaiseTotal - playerBetThisStreet;
            if (playerStack >= additionalNeeded) {
                legalActions.push(common_types_1.ActionType.Raise);
            }
        }
        if (playerStack > 0) {
            legalActions.push(common_types_1.ActionType.AllIn);
        }
        return legalActions;
    }
    getPositionInfo(playerUuid, gameState) {
        const player = gameState.getPlayer(playerUuid);
        if (!player) {
            return null;
        }
        const table = gameState.table;
        const activePlayers = gameState.getActivePlayers();
        const playerCount = activePlayers.length;
        const dealerSeat = table.dealerPosition;
        const playerSeat = player.seatIndex;
        let seatDistance = (playerSeat - dealerSeat + 10) % 10;
        const seatOrder = activePlayers
            .map(p => ({
            uuid: p.uuid,
            seat: p.seatIndex,
            distance: (p.seatIndex - dealerSeat + 10) % 10
        }))
            .sort((a, b) => a.distance - b.distance);
        const playerIndex = seatOrder.findIndex(p => p.uuid === playerUuid);
        let position;
        let isBlind = false;
        if (playerCount === 2) {
            position = playerIndex === 0 ? common_types_1.Position.BTN : common_types_1.Position.BB;
            isBlind = playerIndex === 1;
        }
        else {
            switch (playerIndex) {
                case 0:
                    position = common_types_1.Position.BTN;
                    break;
                case 1:
                    position = common_types_1.Position.SB;
                    isBlind = true;
                    break;
                case 2:
                    position = common_types_1.Position.BB;
                    isBlind = true;
                    break;
                case 3:
                    position = playerCount <= 6 ? common_types_1.Position.UTG : common_types_1.Position.UTG;
                    break;
                case 4:
                    position = playerCount <= 6 ? common_types_1.Position.MP : common_types_1.Position.UTG1;
                    break;
                case 5:
                    position = playerCount <= 6 ? common_types_1.Position.CO : common_types_1.Position.MP;
                    break;
                default:
                    if (playerIndex === playerCount - 1) {
                        position = common_types_1.Position.CO;
                    }
                    else if (playerIndex === playerCount - 2) {
                        position = common_types_1.Position.HJ;
                    }
                    else {
                        position = common_types_1.Position.MP;
                    }
            }
        }
        return {
            position,
            isInPosition: playerIndex >= Math.floor(playerCount / 2),
            isBlind,
            actingOrder: playerIndex,
        };
    }
    validateBasicAction(playerUuid, actionType, amount, context) {
        const player = context.gameState.getPlayer(playerUuid);
        if (!player) {
            return { isValid: false, error: 'Player not found in game' };
        }
        if (player.hasFolded) {
            return { isValid: false, error: 'Player has already folded' };
        }
        if (player.isAllIn && actionType !== common_types_1.ActionType.Fold) {
            return { isValid: false, error: 'Player is already all-in' };
        }
        if (context.playerToAct !== playerUuid) {
            return { isValid: false, error: 'Not player\'s turn to act' };
        }
        if ([common_types_1.ActionType.Bet, common_types_1.ActionType.Raise, common_types_1.ActionType.Call].includes(actionType)) {
            if (amount === undefined || amount <= 0) {
                return { isValid: false, error: `${actionType} requires a positive amount` };
            }
        }
        return { isValid: true };
    }
    validatePositionAction(playerUuid, actionType, context) {
        const positionInfo = this.getPositionInfo(playerUuid, context.gameState);
        if (!positionInfo) {
            return { isValid: false, error: 'Could not determine player position' };
        }
        if (context.isPreflop && !context.blindsPosted) {
            if (positionInfo.isBlind) {
                if (positionInfo.position === common_types_1.Position.SB && actionType !== common_types_1.ActionType.SmallBlind) {
                    return { isValid: false, error: 'Small blind must post small blind' };
                }
                if (positionInfo.position === common_types_1.Position.BB && actionType !== common_types_1.ActionType.BigBlind) {
                    return { isValid: false, error: 'Big blind must post big blind' };
                }
            }
            else {
                if ([common_types_1.ActionType.SmallBlind, common_types_1.ActionType.BigBlind].includes(actionType)) {
                    return { isValid: false, error: 'Only blind positions can post blinds' };
                }
            }
        }
        return { isValid: true };
    }
    validateStreetAction(actionType, amount, context) {
        if ([common_types_1.ActionType.SmallBlind, common_types_1.ActionType.BigBlind].includes(actionType)) {
            if (context.currentStreet !== common_types_1.Street.Preflop) {
                return { isValid: false, error: 'Blinds can only be posted preflop' };
            }
        }
        if (actionType === common_types_1.ActionType.Ante) {
            if (context.currentStreet !== common_types_1.Street.Preflop) {
                return { isValid: false, error: 'Antes can only be posted preflop' };
            }
        }
        return { isValid: true };
    }
    validateStackConstraints(playerUuid, actionType, amount, context) {
        const player = context.gameState.getPlayer(playerUuid);
        if (!player) {
            return { isValid: false, error: 'Player not found' };
        }
        const playerStack = player.stack;
        const playerBetThisStreet = player.betThisStreet;
        const currentBetNum = context.currentBet;
        const amountNum = amount || 0;
        switch (actionType) {
            case common_types_1.ActionType.Call:
                const callAmount = currentBetNum - playerBetThisStreet;
                if (callAmount > playerStack) {
                    return {
                        isValid: true,
                        adjustedAmount: playerStack,
                        isAllIn: true,
                        warnings: ['Call amount exceeds stack, converted to all-in']
                    };
                }
                break;
            case common_types_1.ActionType.Bet:
            case common_types_1.ActionType.Raise:
                if (amountNum > playerStack) {
                    return { isValid: false, error: 'Bet/raise amount exceeds player stack' };
                }
                const minAmount = context.minRaise;
                if (amountNum < minAmount && amountNum < playerStack) {
                    return {
                        isValid: false,
                        error: `Minimum ${actionType.toLowerCase()} is ${minAmount} (or all-in)`
                    };
                }
                if (amountNum === playerStack && amountNum < minAmount) {
                    return {
                        isValid: true,
                        isAllIn: true,
                        warnings: [`${actionType} amount below minimum, converted to all-in`]
                    };
                }
                break;
            case common_types_1.ActionType.AllIn:
                if (playerStack <= 0) {
                    return { isValid: false, error: 'Player has no chips to go all-in' };
                }
                return {
                    isValid: true,
                    adjustedAmount: playerStack,
                    isAllIn: true
                };
        }
        return { isValid: true };
    }
    validateStringBetting(playerUuid, actionType, amount, context) {
        if ([common_types_1.ActionType.Bet, common_types_1.ActionType.Raise].includes(actionType)) {
            const player = context.gameState.getPlayer(playerUuid);
            if (!player) {
                return { isValid: false, error: 'Player not found' };
            }
            return {
                isValid: true,
                preventStringBetting: true
            };
        }
        return { isValid: true };
    }
    validateActionSequence(playerUuid, actionType, context) {
        const currentBetNum = context.currentBet;
        const player = context.gameState.getPlayer(playerUuid);
        if (!player) {
            return { isValid: false, error: 'Player not found' };
        }
        const playerBetThisStreet = player.betThisStreet;
        if (actionType === common_types_1.ActionType.Check && currentBetNum > playerBetThisStreet) {
            return { isValid: false, error: 'Cannot check when facing a bet' };
        }
        if (actionType === common_types_1.ActionType.Call && currentBetNum <= playerBetThisStreet) {
            return { isValid: false, error: 'No bet to call' };
        }
        if (actionType === common_types_1.ActionType.Bet && currentBetNum > 0) {
            return { isValid: false, error: 'Cannot bet when there is already a bet (use raise)' };
        }
        if (actionType === common_types_1.ActionType.Raise && currentBetNum === 0) {
            return { isValid: false, error: 'Cannot raise when there is no bet (use bet)' };
        }
        return { isValid: true };
    }
}
exports.ActionValidator = ActionValidator;
