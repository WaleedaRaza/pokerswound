"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessPlayerActionHandler = void 0;
class ProcessPlayerActionHandler {
    constructor(stateMachine, gameStateProvider) {
        this.stateMachine = stateMachine;
        this.gameStateProvider = gameStateProvider;
    }
    async handle(command) {
        const gameState = this.gameStateProvider(command.gameId);
        if (!gameState) {
            return {
                success: false,
                newState: null,
                error: 'Game not found'
            };
        }
        const result = this.stateMachine.processAction(gameState, {
            type: 'PLAYER_ACTION',
            playerId: command.playerId,
            actionType: command.actionType,
            amount: command.amount
        });
        return {
            success: result.success,
            newState: result.newState,
            error: result.error
        };
    }
}
exports.ProcessPlayerActionHandler = ProcessPlayerActionHandler;
