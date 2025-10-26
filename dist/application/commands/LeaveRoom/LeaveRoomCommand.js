"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRoomCommand = void 0;
class LeaveRoomCommand {
    constructor(gameId, playerId) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.commandName = 'LeaveRoom';
    }
}
exports.LeaveRoomCommand = LeaveRoomCommand;
