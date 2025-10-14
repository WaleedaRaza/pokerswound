/**
 * Event Replayer Service
 * 
 * Rebuilds game state by replaying domain events from the EventStore.
 * This enables:
 * - Crash recovery (rebuild games after server restart)
 * - Time-travel debugging (replay to specific point)
 * - Game replay/review
 * - Audit/investigation
 * 
 * Key Concepts:
 * - Events are the source of truth
 * - State is derived from events
 * - Events are immutable and ordered
 * - Replaying events = rebuilding state
 */

import type { DomainEvent, IEventStore } from '../../common/interfaces/IEventStore';
import { GameStateModel } from '../../core/models/game-state';
import { GameStateMachine } from '../../core/engine/game-state-machine';

export interface ReplayResult {
  success: boolean;
  gameState?: GameStateModel;
  eventsReplayed: number;
  error?: string;
}

export class EventReplayer {
  constructor(
    private eventStore: IEventStore,
    private stateMachine: GameStateMachine
  ) {}
  
  /**
   * Rebuild game state from all events for a game
   * 
   * @param gameId - The game aggregate ID
   * @param untilVersion - Optional: replay only up to this version
   * @returns Reconstructed game state
   */
  async rebuildGameState(
    gameId: string,
    untilVersion?: number
  ): Promise<ReplayResult> {
    try {
      console.log(`🔄 Replaying events for game: ${gameId}${untilVersion ? ` (up to v${untilVersion})` : ''}`);
      
      // Get events from EventStore
      const events = await this.eventStore.getByAggregate(gameId);
      
      if (events.length === 0) {
        return {
          success: false,
          eventsReplayed: 0,
          error: `No events found for game ${gameId}`
        };
      }
      
      // Filter events if untilVersion specified
      const eventsToReplay = untilVersion
        ? events.filter(e => e.version <= untilVersion)
        : events;
      
      console.log(`📦 Found ${eventsToReplay.length} events to replay`);
      
      // Replay events in order
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
      
    } catch (error) {
      console.error(`❌ Failed to replay events for game ${gameId}:`, error);
      return {
        success: false,
        eventsReplayed: 0,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Replay a list of events to reconstruct state
   * 
   * @param events - Ordered list of domain events
   * @returns Reconstructed game state
   */
  private async replayEvents(events: DomainEvent[]): Promise<GameStateModel> {
    // We need to reconstruct the game state from scratch
    // Unfortunately, we don't have direct access to GameStateModel constructor
    // or the game creation logic from events alone.
    //
    // For a full implementation, we would need to:
    // 1. Extract game configuration from first event (game.created)
    // 2. Create initial GameStateModel
    // 3. Replay each event through the state machine
    //
    // For now, this is a simplified version that demonstrates the pattern.
    // A production implementation would need more sophisticated state reconstruction.
    
    throw new Error('Event replay not fully implemented - needs game state reconstruction logic');
    
    // TODO: Full implementation would look like:
    // 1. const firstEvent = events[0];
    // 2. const initialState = this.createInitialState(firstEvent.eventData);
    // 3. let currentState = initialState;
    // 4. for (const event of events.slice(1)) {
    // 5.   currentState = this.applyEvent(currentState, event);
    // 6. }
    // 7. return currentState;
  }
  
  /**
   * Apply a single event to game state
   * This would transform the event back into a game action and process it
   * 
   * @param state - Current game state
   * @param event - Event to apply
   * @returns New game state after event
   */
  private applyEvent(state: GameStateModel, event: DomainEvent): GameStateModel {
    // Map event type back to game action
    // Example:
    // game.action_processed → PLAYER_ACTION
    // game.hand_started → START_HAND
    // game.street_advanced → ADVANCE_STREET
    // etc.
    
    const eventType = event.eventType.replace('game.', '').toUpperCase();
    
    // This is a simplified example - full implementation would be more complex
    console.log(`  Applying event: ${event.eventType} (v${event.version})`);
    
    // In a full implementation, we would:
    // 1. Transform DomainEvent → GameAction
    // 2. Call stateMachine.processAction(state, action)
    // 3. Return the new state
    
    return state; // Placeholder
  }
  
  /**
   * Create initial game state from game.created event
   * 
   * @param eventData - Data from game.created event
   * @returns Initial game state
   */
  private createInitialState(eventData: any): GameStateModel {
    // Extract game configuration from event
    // Create new GameStateModel with initial state
    
    throw new Error('Initial state creation not implemented');
    
    // TODO: Implementation would look like:
    // return new GameStateModel({
    //   id: eventData.gameId,
    //   smallBlind: eventData.smallBlind,
    //   bigBlind: eventData.bigBlind,
    //   players: eventData.players.map(p => new PlayerModel(p))
    // });
  }
  
  /**
   * Get list of games that need recovery (incomplete games)
   * These are games that have events but are not in the current games Map
   * 
   * @returns Array of game IDs that need recovery
   */
  async getIncompleteGames(): Promise<string[]> {
    try {
      // Query EventStore for games with recent activity
      // This would typically query for games that have events but are not "completed"
      
      // For now, return empty array
      // A full implementation would query the database for games with status != 'completed'
      
      console.log('🔍 Checking for incomplete games...');
      
      // TODO: Implement actual query
      // SELECT DISTINCT aggregate_id FROM domain_events 
      // WHERE aggregate_type = 'Game' 
      // AND aggregate_id NOT IN (SELECT game_id FROM games WHERE status = 'completed')
      
      return [];
      
    } catch (error) {
      console.error('❌ Failed to get incomplete games:', error);
      return [];
    }
  }
}

