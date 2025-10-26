"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const game_state_machine_1 = require("../../core/engine/game-state-machine");
class GameEngine {
    constructor(randomFn = Math.random, eventBus) {
        this.stateMachine = new game_state_machine_1.GameStateMachine(randomFn, eventBus);
    }
    processAction(state, action) {
        const preChangeSnapshot = this.captureSnapshot(state);
        const result = this.stateMachine.processAction(state, action);
        const outcomes = this.extractOutcomes(result);
        return {
            success: result.success,
            newState: result.newState,
            preChangeSnapshot,
            outcomes,
            error: result.error
        };
    }
    captureSnapshot(state) {
        return {
            pot: state.pot.totalPot,
            players: Array.from(state.players.values()).map(p => ({
                id: p.uuid,
                stack: p.stack,
                isAllIn: p.isAllIn,
                betThisStreet: p.betThisStreet
            })),
            currentStreet: state.currentStreet
        };
    }
    extractOutcomes(result) {
        const handCompleted = result.events.find(e => e.type === 'HAND_COMPLETED');
        if (handCompleted) {
            return {
                type: 'HAND_COMPLETED',
                winners: handCompleted.data.winners,
                pot: handCompleted.data.preDistributionSnapshot?.potAmount || 0
            };
        }
        return null;
    }
}
exports.GameEngine = GameEngine;
