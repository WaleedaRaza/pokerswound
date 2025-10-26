"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomReadModelProjector = void 0;
class RoomReadModelProjector {
    constructor() {
        this.readModels = new Map();
    }
    async project(event) {
        switch (event.eventType) {
            case 'room.created':
                this.handleRoomCreated(event);
                break;
            case 'room.player_joined':
                this.handlePlayerJoined(event);
                break;
            case 'room.player_left':
                this.handlePlayerLeft(event);
                break;
            case 'game.created':
                this.handleGameCreated(event);
                break;
            case 'game.started':
                this.handleGameStarted(event);
                break;
        }
    }
    getRoomReadModel(roomId) {
        return this.readModels.get(roomId);
    }
    getRoomByInviteCode(inviteCode) {
        return Array.from(this.readModels.values()).find(room => room.inviteCode === inviteCode);
    }
    getAllRooms() {
        return Array.from(this.readModels.values());
    }
    handleRoomCreated(event) {
        const { roomId, inviteCode, maxPlayers, smallBlind, bigBlind } = event.eventData;
        this.readModels.set(roomId, {
            roomId,
            inviteCode,
            playerIds: [],
            maxPlayers: maxPlayers || 9,
            smallBlind: smallBlind || 10,
            bigBlind: bigBlind || 20,
            status: 'OPEN',
            createdAt: event.timestamp,
            lastActivity: event.timestamp
        });
    }
    handlePlayerJoined(event) {
        const { roomId, playerId } = event.eventData;
        const model = this.readModels.get(roomId);
        if (model && !model.playerIds.includes(playerId)) {
            model.playerIds.push(playerId);
            if (model.playerIds.length >= model.maxPlayers) {
                model.status = 'FULL';
            }
            model.lastActivity = event.timestamp;
        }
    }
    handlePlayerLeft(event) {
        const { roomId, playerId } = event.eventData;
        const model = this.readModels.get(roomId);
        if (model) {
            model.playerIds = model.playerIds.filter(id => id !== playerId);
            if (model.status === 'FULL') {
                model.status = 'OPEN';
            }
            model.lastActivity = event.timestamp;
        }
    }
    handleGameCreated(event) {
        const { roomId } = event.eventData;
        const model = this.readModels.get(roomId);
        if (model) {
            model.gameId = event.aggregateId;
            model.lastActivity = event.timestamp;
        }
    }
    handleGameStarted(event) {
        const { roomId } = event.eventData;
        const model = this.readModels.get(roomId);
        if (model) {
            model.status = 'PLAYING';
            model.lastActivity = event.timestamp;
        }
    }
}
exports.RoomReadModelProjector = RoomReadModelProjector;
