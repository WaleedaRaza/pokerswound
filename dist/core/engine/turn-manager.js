"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnManager = void 0;
const common_types_1 = require("../../types/common.types");
class TurnManager {
    getNextToAct(gameState, currentStreet, lastAggressor) {
        const activePlayers = this.getActivePlayersInOrder(gameState);
        if (activePlayers.length <= 1) {
            return null;
        }
        const currentToAct = gameState.toAct;
        if (!currentToAct) {
            return this.getFirstToAct(gameState, currentStreet);
        }
        const currentIndex = activePlayers.findIndex(p => p.uuid === currentToAct);
        if (currentIndex === -1) {
            return this.getFirstToAct(gameState, currentStreet);
        }
        for (let i = 1; i <= activePlayers.length; i++) {
            const nextIndex = (currentIndex + i) % activePlayers.length;
            const nextPlayer = activePlayers[nextIndex];
            if (this.canPlayerAct(nextPlayer)) {
                return nextPlayer.uuid;
            }
        }
        return null;
    }
    getTurnInfo(gameState, currentStreet, lastAggressor) {
        const activePlayers = this.getActivePlayersInOrder(gameState);
        const currentPlayer = gameState.toAct;
        const nextPlayer = this.getNextToAct(gameState, currentStreet, lastAggressor);
        const turnOrder = activePlayers.map((player, index) => ({
            playerUuid: player.uuid,
            seatIndex: player.seatIndex,
            position: this.getPositionName(index, activePlayers.length),
            isActive: this.canPlayerAct(player),
        }));
        const playersToAct = activePlayers
            .filter(p => this.canPlayerAct(p))
            .map(p => p.uuid);
        const isRoundComplete = this.isBettingRoundComplete(gameState, currentStreet, lastAggressor);
        return {
            currentPlayer: currentPlayer || (activePlayers[0]?.uuid || null),
            nextPlayer,
            turnOrder,
            playersToAct,
            isRoundComplete,
        };
    }
    advanceTurn(gameState, currentStreet, lastAggressor) {
        const nextPlayer = this.getNextToAct(gameState, currentStreet, lastAggressor);
        gameState.setToAct(nextPlayer);
        return nextPlayer;
    }
    isBettingRoundComplete(gameState, currentStreet, lastAggressor) {
        const activePlayers = this.getActivePlayersInOrder(gameState);
        if (activePlayers.length <= 1) {
            return true;
        }
        const nonAllInPlayers = activePlayers.filter(p => !p.isAllIn);
        const allInPlayers = activePlayers.filter(p => p.isAllIn);
        if (nonAllInPlayers.length === 0) {
            return true;
        }
        const currentBet = this.getCurrentBet(gameState);
        const currentBetNum = currentBet;
        let allBetsMatched = true;
        for (const player of nonAllInPlayers) {
            const playerBet = player.betThisStreet;
            if (playerBet < currentBetNum) {
                allBetsMatched = false;
                break;
            }
        }
        if (!allBetsMatched) {
            return false;
        }
        if (allInPlayers.length > 0 && nonAllInPlayers.length === 1) {
            return true;
        }
        if (lastAggressor && allBetsMatched) {
            const aggressor = gameState.getPlayer(lastAggressor);
            if (aggressor && !aggressor.isAllIn && !aggressor.hasFolded) {
                const aggressorBet = aggressor.betThisStreet;
                if (aggressorBet === currentBetNum) {
                    return true;
                }
            }
        }
        return allBetsMatched;
    }
    getFirstToAct(gameState, street) {
        const activePlayers = this.getActivePlayersInOrder(gameState);
        if (activePlayers.length === 0) {
            return null;
        }
        if (street === common_types_1.Street.Preflop) {
            const bbPosition = gameState.table.bigBlindPosition;
            return this.getPlayerLeftOf(gameState, bbPosition);
        }
        else {
            const dealerPosition = gameState.table.dealerPosition;
            return this.getPlayerLeftOf(gameState, dealerPosition);
        }
    }
    skipInactivePlayers(gameState) {
        const currentToAct = gameState.toAct;
        if (!currentToAct) {
            return null;
        }
        const currentPlayer = gameState.getPlayer(currentToAct);
        if (!currentPlayer || this.canPlayerAct(currentPlayer)) {
            return currentToAct;
        }
        return this.getNextToAct(gameState, common_types_1.Street.Preflop);
    }
    getActivePlayersInOrder(gameState) {
        return gameState.getActivePlayers()
            .sort((a, b) => {
            const seatA = a.seatIndex;
            const seatB = b.seatIndex;
            const dealerSeat = gameState.table.dealerPosition;
            const distanceA = (seatA - dealerSeat + 10) % 10;
            const distanceB = (seatB - dealerSeat + 10) % 10;
            return distanceA - distanceB;
        });
    }
    canPlayerAct(player) {
        return !player.hasFolded &&
            !player.isAllIn &&
            player.stack > 0;
    }
    getCurrentBet(gameState) {
        const activePlayers = gameState.getActivePlayers();
        let maxBet = 0;
        for (const player of activePlayers) {
            const playerBet = player.betThisStreet;
            if (playerBet > maxBet) {
                maxBet = playerBet;
            }
        }
        return maxBet;
    }
    getPlayerLeftOf(gameState, seatIndex) {
        const activePlayers = this.getActivePlayersInOrder(gameState);
        if (activePlayers.length === 0) {
            return null;
        }
        for (let offset = 1; offset <= 10; offset++) {
            const targetSeat = (seatIndex + offset) % 10;
            const player = activePlayers.find(p => p.seatIndex === targetSeat && this.canPlayerAct(p));
            if (player) {
                return player.uuid;
            }
        }
        const firstActive = activePlayers.find(p => this.canPlayerAct(p));
        return firstActive?.uuid || null;
    }
    getPositionName(index, totalPlayers) {
        if (totalPlayers === 2) {
            return index === 0 ? 'BTN' : 'BB';
        }
        switch (index) {
            case 0: return 'BTN';
            case 1: return 'SB';
            case 2: return 'BB';
            case 3: return totalPlayers <= 6 ? 'UTG' : 'UTG';
            case 4: return totalPlayers <= 6 ? 'MP' : 'UTG+1';
            case 5: return totalPlayers <= 6 ? 'CO' : 'MP';
            default:
                if (index === totalPlayers - 1) {
                    return 'CO';
                }
                else if (index === totalPlayers - 2) {
                    return 'HJ';
                }
                else {
                    return 'MP';
                }
        }
    }
    rotateDealer(gameState) {
        const activePlayers = gameState.getActivePlayers();
        if (activePlayers.length < 2) {
            return;
        }
        const currentDealer = gameState.table.dealerPosition;
        for (let offset = 1; offset <= 10; offset++) {
            const nextSeat = (currentDealer + offset) % 10;
            const nextPlayer = activePlayers.find(p => p.seatIndex === nextSeat);
            if (nextPlayer) {
                gameState.table.rotateDealer();
                break;
            }
        }
    }
    setBlindPositions(gameState) {
        const activePlayers = gameState.getActivePlayers();
        const dealerSeat = gameState.table.dealerPosition;
        if (activePlayers.length === 2) {
            gameState.table.setBlinds(gameState.table.dealerPosition, this.getNextActiveSeat(gameState, dealerSeat) || gameState.table.dealerPosition);
        }
        else {
            const sbSeat = this.getNextActiveSeat(gameState, dealerSeat);
            const bbSeat = sbSeat ? this.getNextActiveSeat(gameState, sbSeat) : null;
            if (sbSeat && bbSeat) {
                gameState.table.setBlinds(sbSeat, bbSeat);
            }
        }
    }
    getNextActiveSeat(gameState, fromSeat) {
        const activePlayers = gameState.getActivePlayers();
        for (let offset = 1; offset <= 10; offset++) {
            const nextSeat = (fromSeat + offset) % 10;
            const player = activePlayers.find(p => p.seatIndex === nextSeat);
            if (player) {
                return nextSeat;
            }
        }
        return null;
    }
}
exports.TurnManager = TurnManager;
