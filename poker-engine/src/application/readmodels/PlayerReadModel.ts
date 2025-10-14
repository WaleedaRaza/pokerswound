/**
 * Player Read Model - Optimized projection for player queries
 */

import type { DomainEvent } from '../../common/interfaces/IEventStore';
import type { UUID } from '../../types/common.types';

export interface PlayerReadModel {
  playerId: UUID;
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  totalChipsWon: number;
  totalChipsLost: number;
  biggestPot: number;
  currentStreak: number;
  lastSeen: Date;
}

export class PlayerReadModelProjector {
  private readModels = new Map<UUID, PlayerReadModel>();

  /**
   * Project domain events into read model
   */
  public async project(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'game.player_joined':
        this.handlePlayerJoined(event);
        break;
      case 'game.hand_started':
        this.handleHandStarted(event);
        break;
      case 'game.hand_completed':
        this.handleHandCompleted(event);
        break;
    }
  }

  public getPlayerReadModel(playerId: UUID): PlayerReadModel | undefined {
    return this.readModels.get(playerId);
  }

  public getAllPlayers(): PlayerReadModel[] {
    return Array.from(this.readModels.values());
  }

  private handlePlayerJoined(event: DomainEvent): void {
    const { playerId, playerName } = event.eventData;
    
    if (!this.readModels.has(playerId)) {
      this.readModels.set(playerId, {
        playerId,
        playerName: playerName || 'Unknown',
        handsPlayed: 0,
        handsWon: 0,
        totalChipsWon: 0,
        totalChipsLost: 0,
        biggestPot: 0,
        currentStreak: 0,
        lastSeen: event.timestamp
      });
    }
  }

  private handleHandStarted(event: DomainEvent): void {
    const { players } = event.eventData;
    
    if (players && Array.isArray(players)) {
      players.forEach((playerId: UUID) => {
        const model = this.readModels.get(playerId);
        if (model) {
          model.handsPlayed++;
          model.lastSeen = event.timestamp;
        }
      });
    }
  }

  private handleHandCompleted(event: DomainEvent): void {
    const { winners, pot } = event.eventData;
    
    if (winners && Array.isArray(winners)) {
      winners.forEach((winner: any) => {
        const model = this.readModels.get(winner.playerId);
        if (model) {
          model.handsWon++;
          model.totalChipsWon += winner.amount || 0;
          
          if ((winner.amount || 0) > model.biggestPot) {
            model.biggestPot = winner.amount || 0;
          }
          
          model.currentStreak++;
          model.lastSeen = event.timestamp;
        }
      });
    }
  }
}

