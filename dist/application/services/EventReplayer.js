"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReplayer = void 0;
class EventReplayer {
    constructor(eventStore, stateMachine) {
        this.eventStore = eventStore;
        this.stateMachine = stateMachine;
    }
    async rebuildGameState(gameId, untilVersion) {
        try {
            console.log(`🔄 Replaying events for game: ${gameId}${untilVersion ? ` (up to v${untilVersion})` : ''}`);
            const events = await this.eventStore.getByAggregate(gameId);
            if (events.length === 0) {
                return {
                    success: false,
                    eventsReplayed: 0,
                    error: `No events found for game ${gameId}`
                };
            }
            const eventsToReplay = untilVersion
                ? events.filter(e => e.version <= untilVersion)
                : events;
            console.log(`📦 Found ${eventsToReplay.length} events to replay`);
            const gameState = await this.replayEvents(eventsToReplay);
            console.log(`✅ Successfully replayed ${eventsToReplay.length} events`);
            console.log(`   Game Status: ${gameState.status}`);
            console.log(`   Players: ${gameState.players.size}`);
            console.log(`   Hand Number: ${gameState.handState.handNumber}`);
            return {
                success: true,
                gameState,
                eventsReplayed: eventsToReplay.length
            };
        }
        catch (error) {
            console.error(`❌ Failed to replay events for game ${gameId}:`, error);
            return {
                success: false,
                eventsReplayed: 0,
                error: error.message
            };
        }
    }
    async replayEvents(events) {
        throw new Error('Event replay not fully implemented - needs game state reconstruction logic');
    }
    applyEvent(state, event) {
        const eventType = event.eventType.replace('game.', '').toUpperCase();
        console.log(`  Applying event: ${event.eventType} (v${event.version})`);
        return state;
    }
    createInitialState(eventData) {
        throw new Error('Initial state creation not implemented');
    }
    async getIncompleteGames() {
        try {
            console.log('🔍 Checking for incomplete games...');
            return [];
        }
        catch (error) {
            console.error('❌ Failed to get incomplete games:', error);
            return [];
        }
    }
}
exports.EventReplayer = EventReplayer;
