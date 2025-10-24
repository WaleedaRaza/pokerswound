/**
 * Game Event Handler
 * 
 * Handles game-related domain events by persisting them to the database.
 * This handler is responsible for:
 * - Logging actions to the actions table
 * - Updating game state in the database
 * - Recording hand history
 * - Tracking player statistics
 * 
 * Events handled:
 * - game.created
 * - game.started
 * - game.action_processed
 * - game.hand_started
 * - game.hand_completed
 * - game.paused
 * - game.resumed
 */

import type { DomainEvent } from '../../../common/interfaces/IEventStore';
import { EventHandler } from '../EventHandler';

export class GameEventHandler extends EventHandler {
  constructor() {
    super('GameEventHandler');
  }
  
  canHandle(eventType: string): boolean {
    return eventType.startsWith('game.');
  }
  
  async handle(event: DomainEvent): Promise<void> {
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
  
  private async handleGameCreated(event: DomainEvent): Promise<void> {
    this.log('info', 'Game created', event.eventData);
    // TODO: Insert into games table when we implement full persistence
    // For now, just log
  }
  
  private async handleGameStarted(event: DomainEvent): Promise<void> {
    this.log('info', 'Game started', event.eventData);
    // TODO: Update game status in database
  }
  
  private async handleActionProcessed(event: DomainEvent): Promise<void> {
    const { playerId, action, amount } = event.eventData;
    this.log('info', `Action processed: ${playerId} ${action} ${amount || ''}`);
    
    // TODO: Insert into actions table
    // const actionRepo = new ActionsRepository();
    // await actionRepo.create({
    //   game_id: event.aggregateId,
    //   player_id: playerId,
    //   action_type: action,
    //   amount: amount || 0,
    //   street: event.eventData.street,
    //   timestamp: event.timestamp
    // });
  }
  
  private async handleHandStarted(event: DomainEvent): Promise<void> {
    const { handNumber, players } = event.eventData;
    this.log('info', `Hand #${handNumber} started with ${players?.length || 0} players`);
    
    // TODO: Insert into hands table
  }
  
  private async handleHandCompleted(event: DomainEvent): Promise<void> {
    const { handNumber, winners, totalPot } = event.eventData;
    this.log('info', `Hand #${handNumber} completed`, {
      winners: winners?.length || 0,
      pot: totalPot
    });
    
    // TODO: Insert into hand_history table
    // TODO: Update player statistics
  }
  
  private async handleGamePaused(event: DomainEvent): Promise<void> {
    this.log('info', 'Game paused', event.eventData);
    // TODO: Update game status
  }
  
  private async handleGameResumed(event: DomainEvent): Promise<void> {
    this.log('info', 'Game resumed', event.eventData);
    // TODO: Update game status
  }
}

