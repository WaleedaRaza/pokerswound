"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerReadModelProjector = void 0;
class PlayerReadModelProjector {
    constructor() {
        this.readModels = new Map();
    }
    async project(event) {
        switch (event.eventType) {
            case 'game.player_joined':
                this.handlePlayerJoined(event);
                break;
            case 'game.hand_started':
                this.handleHandStarted(event);
                break;
            case 'game.hand_completed':
                this.handleHandCompleted(event);
                break;
        }
    }
    getPlayerReadModel(playerId) {
        return this.readModels.get(playerId);
    }
    getAllPlayers() {
        return Array.from(this.readModels.values());
    }
    handlePlayerJoined(event) {
        const { playerId, playerName } = event.eventData;
        if (!this.readModels.has(playerId)) {
            this.readModels.set(playerId, {
                playerId,
                playerName: playerName || 'Unknown',
                handsPlayed: 0,
                handsWon: 0,
                totalChipsWon: 0,
                totalChipsLost: 0,
                biggestPot: 0,
                currentStreak: 0,
                lastSeen: event.timestamp
            });
        }
    }
    handleHandStarted(event) {
        const { players } = event.eventData;
        if (players && Array.isArray(players)) {
            players.forEach((playerId) => {
                const model = this.readModels.get(playerId);
                if (model) {
                    model.handsPlayed++;
                    model.lastSeen = event.timestamp;
                }
            });
        }
    }
    handleHandCompleted(event) {
        const { winners, pot } = event.eventData;
        if (winners && Array.isArray(winners)) {
            winners.forEach((winner) => {
                const model = this.readModels.get(winner.playerId);
                if (model) {
                    model.handsWon++;
                    model.totalChipsWon += winner.amount || 0;
                    if ((winner.amount || 0) > model.biggestPot) {
                        model.biggestPot = winner.amount || 0;
                    }
                    model.currentStreak++;
                    model.lastSeen = event.timestamp;
                }
            });
        }
    }
}
exports.PlayerReadModelProjector = PlayerReadModelProjector;
