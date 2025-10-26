"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventHandler = void 0;
const EventHandler_1 = require("../EventHandler");
class WebSocketEventHandler extends EventHandler_1.EventHandler {
    constructor(io, displayStateManager) {
        super('WebSocketEventHandler');
        this.io = io;
        this.displayStateManager = displayStateManager;
    }
    canHandle(eventType) {
        return eventType.startsWith('game.');
    }
    async handle(event) {
        this.log('info', `Broadcasting event: ${event.eventType}`, {
            aggregateId: event.aggregateId
        });
        switch (event.eventType) {
            case 'game.created':
                await this.broadcastGameCreated(event);
                break;
            case 'game.started':
                await this.broadcastGameStarted(event);
                break;
            case 'game.action_processed':
                await this.broadcastActionProcessed(event);
                break;
            case 'game.hand_started':
                await this.broadcastHandStarted(event);
                break;
            case 'game.hand_completed':
                await this.broadcastHandCompleted(event);
                break;
            case 'game.street_advanced':
                await this.broadcastStreetAdvanced(event);
                break;
            case 'game.pot_updated':
                await this.broadcastPotUpdated(event);
                break;
            case 'game.paused':
                await this.broadcastGamePaused(event);
                break;
            case 'game.resumed':
                await this.broadcastGameResumed(event);
                break;
            default:
                this.log('debug', `No specific broadcast for ${event.eventType}, using generic`);
                await this.broadcastGeneric(event);
        }
    }
    async broadcastGameCreated(event) {
        const { roomId, gameId } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('game_created', {
                gameId: gameId || event.aggregateId,
                roomId,
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted game_created to room:${roomId}`);
        }
    }
    async broadcastGameStarted(event) {
        const { roomId, players } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('game_started', {
                gameId: event.aggregateId,
                players: players || [],
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted game_started to room:${roomId}`);
        }
    }
    async broadcastActionProcessed(event) {
        const { roomId, playerId, action, amount, newState } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('action_processed', {
                gameId: event.aggregateId,
                playerId,
                action,
                amount: amount || 0,
                timestamp: event.timestamp
            });
            if (newState) {
                this.io.to(`room:${roomId}`).emit('game_state_update', {
                    gameId: event.aggregateId,
                    state: newState,
                    timestamp: event.timestamp
                });
            }
            this.log('info', `Broadcasted action_processed to room:${roomId}`);
        }
    }
    async broadcastHandStarted(event) {
        const { roomId, handNumber, dealerPosition, smallBlindPosition, bigBlindPosition } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('hand_started', {
                gameId: event.aggregateId,
                handNumber,
                dealerPosition,
                smallBlindPosition,
                bigBlindPosition,
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted hand_started #${handNumber} to room:${roomId}`);
        }
    }
    async broadcastHandCompleted(event) {
        const { roomId, handNumber, winners, totalPot, preDistributionSnapshot, wasAllIn } = event.eventData;
        if (roomId) {
            if (wasAllIn && this.displayStateManager && preDistributionSnapshot) {
                const displayState = this.displayStateManager.calculateDisplayState(preDistributionSnapshot, {
                    type: 'HAND_COMPLETED',
                    wasAllIn: true,
                    potAmount: preDistributionSnapshot.potAmount,
                    winners: winners || []
                }, event.eventData.finalState);
                this.io.to(`room:${roomId}`).emit('hand_completed', {
                    gameId: event.aggregateId,
                    handNumber,
                    winners,
                    totalPot: totalPot,
                    displayState: displayState.visibleState,
                    wasAllIn: true,
                    timestamp: event.timestamp
                });
                this.log('info', `Broadcasted hand_completed (all-in) with display state to room:${roomId}`);
            }
            else {
                this.io.to(`room:${roomId}`).emit('hand_completed', {
                    gameId: event.aggregateId,
                    handNumber,
                    winners,
                    totalPot,
                    timestamp: event.timestamp
                });
                this.log('info', `Broadcasted hand_completed to room:${roomId}`);
            }
        }
    }
    async broadcastStreetAdvanced(event) {
        const { roomId, street, communityCards } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('street_advanced', {
                gameId: event.aggregateId,
                street,
                communityCards: communityCards || [],
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted street_advanced to ${street} for room:${roomId}`);
        }
    }
    async broadcastPotUpdated(event) {
        const { roomId, pot, action, playerId } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('pot_update', {
                gameId: event.aggregateId,
                pot,
                action,
                playerId,
                timestamp: event.timestamp
            });
            this.log('debug', `Broadcasted pot_update to room:${roomId}`);
        }
    }
    async broadcastGamePaused(event) {
        const { roomId } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('game_paused', {
                gameId: event.aggregateId,
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted game_paused to room:${roomId}`);
        }
    }
    async broadcastGameResumed(event) {
        const { roomId } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('game_resumed', {
                gameId: event.aggregateId,
                timestamp: event.timestamp
            });
            this.log('info', `Broadcasted game_resumed to room:${roomId}`);
        }
    }
    async broadcastGeneric(event) {
        const { roomId } = event.eventData;
        if (roomId) {
            this.io.to(`room:${roomId}`).emit('game_event', {
                eventType: event.eventType,
                gameId: event.aggregateId,
                data: event.eventData,
                timestamp: event.timestamp
            });
            this.log('debug', `Broadcasted generic event ${event.eventType} to room:${roomId}`);
        }
    }
}
exports.WebSocketEventHandler = WebSocketEventHandler;
