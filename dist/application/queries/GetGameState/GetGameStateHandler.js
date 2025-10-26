"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetGameStateHandler = void 0;
class GetGameStateHandler {
    constructor(gameStateProvider) {
        this.gameStateProvider = gameStateProvider;
    }
    async handle(query) {
        const gameState = this.gameStateProvider(query.gameId);
        return gameState || null;
    }
}
exports.GetGameStateHandler = GetGameStateHandler;
