"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGameHandler = void 0;
const game_state_1 = require("../../../core/models/game-state");
class CreateGameHandler {
    constructor(gameStateStore) {
        this.gameStateStore = gameStateStore;
    }
    async handle(command) {
        try {
            const gameId = this.generateGameId();
            const { roomId, smallBlind, bigBlind, maxPlayers = 9, buyIn = 1000 } = command.options;
            const gameState = new game_state_1.GameStateModel({
                id: gameId,
                configuration: {
                    smallBlind,
                    bigBlind,
                    ante: 0,
                    maxPlayers,
                    minPlayers: 2,
                    turnTimeLimit: 30,
                    timebankSeconds: 60,
                    autoMuckLosingHands: false,
                    allowRabbitHunting: false
                }
            });
            this.gameStateStore.set(gameId, gameState);
            return {
                success: true,
                gameId,
                gameState
            };
        }
        catch (error) {
            return {
                success: false,
                gameId: '',
                error: error.message
            };
        }
    }
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
exports.CreateGameHandler = CreateGameHandler;
