"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameReadModelProjector = void 0;
class GameReadModelProjector {
    constructor() {
        this.readModels = new Map();
    }
    async project(event) {
        switch (event.eventType) {
            case 'game.created':
                this.handleGameCreated(event);
                break;
            case 'game.started':
                this.handleGameStarted(event);
                break;
            case 'game.hand_started':
                this.handleHandStarted(event);
                break;
            case 'game.player_action':
                this.handlePlayerAction(event);
                break;
            case 'game.hand_completed':
                this.handleHandCompleted(event);
                break;
            case 'game.paused':
                this.handleGamePaused(event);
                break;
            case 'game.resumed':
                this.handleGameResumed(event);
                break;
        }
    }
    getGameReadModel(gameId) {
        return this.readModels.get(gameId);
    }
    getAllGames() {
        return Array.from(this.readModels.values());
    }
    handleGameCreated(event) {
        const { smallBlind, bigBlind, maxPlayers, roomId } = event.eventData;
        this.readModels.set(event.aggregateId, {
            gameId: event.aggregateId,
            roomId: roomId || 'unknown',
            status: 'WAITING',
            playerCount: 0,
            maxPlayers: maxPlayers || 9,
            smallBlind: smallBlind || 10,
            bigBlind: bigBlind || 20,
            currentHand: 0,
            pot: 0,
            currentStreet: 'PREFLOP',
            lastUpdated: event.timestamp
        });
    }
    handleGameStarted(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.status = 'PLAYING';
            model.lastUpdated = event.timestamp;
        }
    }
    handleHandStarted(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.currentHand = event.eventData.handNumber || model.currentHand + 1;
            model.pot = 0;
            model.currentStreet = 'PREFLOP';
            model.lastUpdated = event.timestamp;
        }
    }
    handlePlayerAction(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.pot = event.eventData.pot || model.pot;
            model.lastUpdated = event.timestamp;
        }
    }
    handleHandCompleted(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.pot = 0;
            model.lastUpdated = event.timestamp;
        }
    }
    handleGamePaused(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.status = 'PAUSED';
            model.lastUpdated = event.timestamp;
        }
    }
    handleGameResumed(event) {
        const model = this.readModels.get(event.aggregateId);
        if (model) {
            model.status = 'PLAYING';
            model.lastUpdated = event.timestamp;
        }
    }
}
exports.GameReadModelProjector = GameReadModelProjector;
