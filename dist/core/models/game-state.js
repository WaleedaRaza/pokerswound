"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateModel = exports.GameStatus = void 0;
const common_types_1 = require("../../types/common.types");
const player_1 = require("./player");
const table_1 = require("./table");
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "WAITING";
    GameStatus["DEALING"] = "DEALING";
    GameStatus["PREFLOP"] = "PREFLOP";
    GameStatus["FLOP"] = "FLOP";
    GameStatus["TURN"] = "TURN";
    GameStatus["RIVER"] = "RIVER";
    GameStatus["SHOWDOWN"] = "SHOWDOWN";
    GameStatus["COMPLETED"] = "COMPLETED";
    GameStatus["PAUSED"] = "PAUSED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
class GameStateModel {
    constructor(params) {
        this.players = new Map();
        this.toAct = null;
        this.actionHistory = [];
        this.id = params.id;
        this.createdAt = params.createdAt ?? new Date().toISOString();
        this.updatedAt = this.createdAt;
        this.configuration = params.configuration;
        this.table = params.table ?? new table_1.TableModel();
        this.status = GameStatus.WAITING;
        this.version = 0;
        this.handState = this.createEmptyHandState();
        this.currentStreet = common_types_1.Street.Preflop;
        this.bettingRound = this.createEmptyBettingRound();
        this.pot = this.createEmptyPot();
        this.timing = this.createEmptyTiming();
    }
    addPlayer(player) {
        if (this.players.size >= this.configuration.maxPlayers) {
            throw new Error('Game is full');
        }
        if (this.players.has(player.uuid)) {
            throw new Error('Player already in game');
        }
        this.players.set(player.uuid, player);
        this.table.seatPlayer(player);
        this.updateTimestamp();
    }
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        this.players.delete(playerId);
        this.table.unseatPlayer(player);
        this.updateTimestamp();
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    getActivePlayers() {
        return Array.from(this.players.values()).filter(p => p.isActive && !p.hasFolded && !p.hasLeft);
    }
    getPlayersEligibleToAct() {
        return this.getActivePlayers().filter(p => !p.isAllIn);
    }
    canStartGame() {
        return this.getActivePlayers().length >= this.configuration.minPlayers &&
            this.status === GameStatus.WAITING;
    }
    canStartHand() {
        return this.getActivePlayers().length >= 2 &&
            (this.status === GameStatus.WAITING || this.status === GameStatus.COMPLETED);
    }
    isBettingRoundComplete() {
        const activePlayers = this.getActivePlayers();
        const eligiblePlayers = this.getPlayersEligibleToAct();
        if (activePlayers.length <= 1) {
            return true;
        }
        const allInPlayers = activePlayers.filter(p => p.isAllIn);
        const nonAllInPlayers = activePlayers.filter(p => !p.isAllIn);
        if (nonAllInPlayers.length === 0) {
            console.log(`🎯 All players all-in (${allInPlayers.length}), round complete`);
            return true;
        }
        const currentBet = this.bettingRound.currentBet;
        for (const player of nonAllInPlayers) {
            const playerBet = player.betThisStreet;
            if (playerBet < currentBet) {
                console.log(`🎯 ${player.name} hasn't matched bet (${playerBet} < ${currentBet}), round NOT complete`);
                return false;
            }
        }
        if (allInPlayers.length > 0 && nonAllInPlayers.length === 1) {
            console.log(`🎯 1 non-all-in player matched bet vs ${allInPlayers.length} all-in, round complete`);
            return true;
        }
        let playersWhoActed = allInPlayers.length;
        let playersWithMatchingBets = allInPlayers.length;
        for (const player of nonAllInPlayers) {
            const playerBet = player.betThisStreet;
            const hasActedThisStreet = this.actionHistory.some(action => action.player === player.uuid &&
                action.street === this.currentStreet &&
                action.handNumber === this.handState.handNumber);
            if (hasActedThisStreet) {
                playersWhoActed++;
                if (playerBet >= currentBet) {
                    playersWithMatchingBets++;
                }
                else {
                    console.log(`🎯 ${player.name} acted but hasn't matched (${playerBet} < ${currentBet}), round NOT complete`);
                    return false;
                }
            }
        }
        if (this.bettingRound.lastAggressor) {
            const aggressor = this.getPlayer(this.bettingRound.lastAggressor);
            if (aggressor && !aggressor.hasFolded && !aggressor.isAllIn) {
                const aggressorBet = aggressor.betThisStreet;
                if (aggressorBet === currentBet && playersWithMatchingBets >= activePlayers.length) {
                    console.log(`🎯 Last aggressor (${aggressor.name}) has highest bet ($${aggressorBet}), all matched → round complete`);
                    return true;
                }
            }
        }
        const allPlayersActed = playersWhoActed >= activePlayers.length;
        const allBetsMatched = playersWithMatchingBets >= activePlayers.length;
        console.log(`🎯 Betting round check: ${playersWhoActed}/${activePlayers.length} acted, ${playersWithMatchingBets}/${activePlayers.length} matched bets → ${allPlayersActed && allBetsMatched}`);
        return allPlayersActed && allBetsMatched;
    }
    isHandComplete() {
        const activePlayers = this.getActivePlayers();
        return activePlayers.length <= 1 || this.currentStreet === common_types_1.Street.Showdown;
    }
    getNextPlayerToAct(startFrom) {
        const eligiblePlayers = this.getPlayersEligibleToAct();
        if (eligiblePlayers.length === 0) {
            return null;
        }
        if (eligiblePlayers.length === 1) {
            return eligiblePlayers[0].uuid;
        }
        let startIndex = 0;
        if (startFrom) {
            const currentIndex = eligiblePlayers.findIndex(p => p.uuid === startFrom);
            if (currentIndex !== -1) {
                startIndex = (currentIndex + 1) % eligiblePlayers.length;
            }
        }
        const sortedPlayers = eligiblePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
        return sortedPlayers[startIndex % sortedPlayers.length].uuid;
    }
    setToAct(playerId) {
        this.toAct = playerId;
        this.timing.actionStartTime = Date.now();
        this.updateTimestamp();
    }
    toSnapshot() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            status: this.status,
            configuration: this.configuration,
            handState: {
                ...this.handState,
                communityCards: this.handState.communityCards.map(c => c.toString()),
                deck: this.handState.deck.map(c => c.toString())
            },
            currentStreet: this.currentStreet,
            toAct: this.toAct,
            bettingRound: {
                ...this.bettingRound,
                lastAggressor: this.bettingRound.lastAggressor
            },
            pot: {
                ...this.pot,
                sidePots: this.pot.sidePots.map(sp => ({
                    ...sp,
                    eligiblePlayers: Array.from(sp.eligiblePlayers)
                }))
            },
            timing: this.timing,
            players: Array.from(this.players.entries()).map(([id, player]) => ({
                id,
                ...player.toSnapshot()
            })),
            actionHistory: this.actionHistory,
            version: this.version
        };
    }
    static fromSnapshot(snapshot) {
        const state = new GameStateModel({
            id: snapshot.id,
            configuration: snapshot.configuration,
            createdAt: snapshot.createdAt
        });
        state.updatedAt = snapshot.updatedAt;
        state.status = snapshot.status;
        state.currentStreet = snapshot.currentStreet;
        state.toAct = snapshot.toAct;
        state.version = snapshot.version;
        state.handState = snapshot.handState;
        state.bettingRound = {
            ...snapshot.bettingRound,
            lastAggressor: snapshot.bettingRound.lastAggressor
        };
        state.pot = {
            ...snapshot.pot,
            sidePots: snapshot.pot.sidePots.map((sp) => ({
                ...sp,
                eligiblePlayers: new Set(sp.eligiblePlayers)
            }))
        };
        state.timing = snapshot.timing;
        state.actionHistory = snapshot.actionHistory;
        if (snapshot.players) {
            for (const playerData of snapshot.players) {
                const player = player_1.PlayerModel.fromSnapshot(playerData);
                state.players.set(player.uuid, player);
            }
        }
        return state;
    }
    updateTimestamp() {
        this.updatedAt = new Date().toISOString();
        this.version++;
    }
    createEmptyHandState() {
        return {
            handNumber: 0,
            dealerPosition: 0,
            smallBlindPosition: 0,
            bigBlindPosition: 0,
            communityCards: [],
            deck: [],
            deckSeed: ''
        };
    }
    createEmptyBettingRound() {
        return {
            currentBet: 0,
            minRaise: this.configuration.bigBlind,
            lastRaiseAmount: 0,
            isComplete: false,
            actionsThisRound: 0
        };
    }
    createEmptyPot() {
        return {
            mainPot: 0,
            sidePots: [],
            totalPot: 0
        };
    }
    createEmptyTiming() {
        return {
            handStartTime: Date.now(),
            streetStartTime: Date.now(),
            turnTimeLimit: this.configuration.turnTimeLimit,
            timebankRemaining: this.configuration.timebankSeconds
        };
    }
}
exports.GameStateModel = GameStateModel;
