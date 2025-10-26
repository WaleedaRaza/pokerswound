"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinRoomHandler = void 0;
class JoinRoomHandler {
    constructor(stateMachine, gameStateProvider) {
        this.stateMachine = stateMachine;
        this.gameStateProvider = gameStateProvider;
    }
    async handle(command) {
        const gameState = this.gameStateProvider(command.gameId);
        if (!gameState) {
            return {
                success: false,
                error: 'Game not found'
            };
        }
        const result = this.stateMachine.processAction(gameState, {
            type: 'PLAYER_JOIN',
            playerId: command.playerId,
            playerName: command.playerName,
            seatNumber: command.seatNumber,
            buyIn: command.buyIn
        });
        return {
            success: result.success,
            newState: result.newState,
            error: result.error
        };
    }
}
exports.JoinRoomHandler = JoinRoomHandler;
