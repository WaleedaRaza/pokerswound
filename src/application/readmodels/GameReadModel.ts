/**
 * Game Read Model - Optimized projection for game queries
 */

import type { DomainEvent } from '../../common/interfaces/IEventStore';
import type { UUID } from '../../types/common.types';

export interface GameReadModel {
  gameId: string;
  roomId: string;
  status: 'WAITING' | 'PLAYING' | 'PAUSED' | 'COMPLETED';
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  currentHand: number;
  pot: number;
  currentStreet: string;
  lastUpdated: Date;
}

export class GameReadModelProjector {
  private readModels = new Map<string, GameReadModel>();

  /**
   * Project domain events into read model
   */
  public async project(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'game.created':
        this.handleGameCreated(event);
        break;
      case 'game.started':
        this.handleGameStarted(event);
        break;
      case 'game.hand_started':
        this.handleHandStarted(event);
        break;
      case 'game.player_action':
        this.handlePlayerAction(event);
        break;
      case 'game.hand_completed':
        this.handleHandCompleted(event);
        break;
      case 'game.paused':
        this.handleGamePaused(event);
        break;
      case 'game.resumed':
        this.handleGameResumed(event);
        break;
    }
  }

  public getGameReadModel(gameId: string): GameReadModel | undefined {
    return this.readModels.get(gameId);
  }

  public getAllGames(): GameReadModel[] {
    return Array.from(this.readModels.values());
  }

  private handleGameCreated(event: DomainEvent): void {
    const { smallBlind, bigBlind, maxPlayers, roomId } = event.eventData;
    
    this.readModels.set(event.aggregateId, {
      gameId: event.aggregateId,
      roomId: roomId || 'unknown',
      status: 'WAITING',
      playerCount: 0,
      maxPlayers: maxPlayers || 9,
      smallBlind: smallBlind || 10,
      bigBlind: bigBlind || 20,
      currentHand: 0,
      pot: 0,
      currentStreet: 'PREFLOP',
      lastUpdated: event.timestamp
    });
  }

  private handleGameStarted(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.status = 'PLAYING';
      model.lastUpdated = event.timestamp;
    }
  }

  private handleHandStarted(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.currentHand = event.eventData.handNumber || model.currentHand + 1;
      model.pot = 0;
      model.currentStreet = 'PREFLOP';
      model.lastUpdated = event.timestamp;
    }
  }

  private handlePlayerAction(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.pot = event.eventData.pot || model.pot;
      model.lastUpdated = event.timestamp;
    }
  }

  private handleHandCompleted(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.pot = 0;
      model.lastUpdated = event.timestamp;
    }
  }

  private handleGamePaused(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.status = 'PAUSED';
      model.lastUpdated = event.timestamp;
    }
  }

  private handleGameResumed(event: DomainEvent): void {
    const model = this.readModels.get(event.aggregateId);
    if (model) {
      model.status = 'PLAYING';
      model.lastUpdated = event.timestamp;
    }
  }
}

