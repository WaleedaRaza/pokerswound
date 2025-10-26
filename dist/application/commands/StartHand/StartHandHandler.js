"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartHandHandler = void 0;
class StartHandHandler {
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
            type: 'START_HAND'
        });
        return {
            success: result.success,
            newState: result.newState,
            error: result.error
        };
    }
}
exports.StartHandHandler = StartHandHandler;
