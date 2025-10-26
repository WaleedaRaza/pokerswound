"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessPlayerActionCommand = void 0;
class ProcessPlayerActionCommand {
    constructor(gameId, playerId, actionType, amount) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.actionType = actionType;
        this.amount = amount;
        this.commandName = 'ProcessPlayerAction';
    }
}
exports.ProcessPlayerActionCommand = ProcessPlayerActionCommand;
