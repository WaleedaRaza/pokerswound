"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRoomInfoHandler = void 0;
class GetRoomInfoHandler {
    constructor(gameStateStore) {
        this.gameStateStore = gameStateStore;
    }
    async handle(query) {
        let gameState;
        for (const [gameId, state] of this.gameStateStore) {
            if (state.roomId === query.roomId) {
                gameState = state;
                break;
            }
        }
        if (!gameState) {
            return null;
        }
        const activePlayers = gameState.getActivePlayers();
        return {
            roomId: query.roomId,
            gameId: gameState.id,
            playerCount: activePlayers.length,
            maxPlayers: gameState.maxPlayers || 9,
            smallBlind: gameState.smallBlind || 10,
            bigBlind: gameState.bigBlind || 20,
            status: gameState.status
        };
    }
}
exports.GetRoomInfoHandler = GetRoomInfoHandler;
