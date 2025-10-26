"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventHandler = void 0;
const EventHandler_1 = require("../EventHandler");
class GameEventHandler extends EventHandler_1.EventHandler {
    constructor() {
        super('GameEventHandler');
    }
    canHandle(eventType) {
        return eventType.startsWith('game.');
    }
    async handle(event) {
        this.log('info', `Handling event: ${event.eventType}`, {
            aggregateId: event.aggregateId,
            version: event.version
        });
        switch (event.eventType) {
            case 'game.created':
                await this.handleGameCreated(event);
                break;
            case 'game.started':
                await this.handleGameStarted(event);
                break;
            case 'game.action_processed':
                await this.handleActionProcessed(event);
                break;
            case 'game.hand_started':
                await this.handleHandStarted(event);
                break;
            case 'game.hand_completed':
                await this.handleHandCompleted(event);
                break;
            case 'game.paused':
                await this.handleGamePaused(event);
                break;
            case 'game.resumed':
                await this.handleGameResumed(event);
                break;
            default:
                this.log('debug', `No specific handler for ${event.eventType}, skipping`);
        }
    }
    async handleGameCreated(event) {
        this.log('info', 'Game created', event.eventData);
    }
    async handleGameStarted(event) {
        this.log('info', 'Game started', event.eventData);
    }
    async handleActionProcessed(event) {
        const { playerId, action, amount } = event.eventData;
        this.log('info', `Action processed: ${playerId} ${action} ${amount || ''}`);
    }
    async handleHandStarted(event) {
        const { handNumber, players } = event.eventData;
        this.log('info', `Hand #${handNumber} started with ${players?.length || 0} players`);
    }
    async handleHandCompleted(event) {
        const { handNumber, winners, totalPot } = event.eventData;
        this.log('info', `Hand #${handNumber} completed`, {
            winners: winners?.length || 0,
            pot: totalPot
        });
    }
    async handleGamePaused(event) {
        this.log('info', 'Game paused', event.eventData);
    }
    async handleGameResumed(event) {
        this.log('info', 'Game resumed', event.eventData);
    }
}
exports.GameEventHandler = GameEventHandler;
