"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinRoomCommand = void 0;
class JoinRoomCommand {
    constructor(gameId, playerId, playerName, seatNumber, buyIn) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.playerName = playerName;
        this.seatNumber = seatNumber;
        this.buyIn = buyIn;
        this.commandName = 'JoinRoom';
    }
}
exports.JoinRoomCommand = JoinRoomCommand;
