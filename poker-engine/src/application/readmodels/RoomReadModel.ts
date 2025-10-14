/**
 * Room Read Model - Optimized projection for room queries
 */

import type { DomainEvent } from '../../common/interfaces/IEventStore';
import type { UUID } from '../../types/common.types';

export interface RoomReadModel {
  roomId: string;
  gameId?: string;
  inviteCode: string;
  playerIds: UUID[];
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  status: 'OPEN' | 'FULL' | 'PLAYING' | 'CLOSED';
  createdAt: Date;
  lastActivity: Date;
}

export class RoomReadModelProjector {
  private readModels = new Map<string, RoomReadModel>();

  /**
   * Project domain events into read model
   */
  public async project(event: DomainEvent): Promise<void> {
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

  public getRoomReadModel(roomId: string): RoomReadModel | undefined {
    return this.readModels.get(roomId);
  }

  public getRoomByInviteCode(inviteCode: string): RoomReadModel | undefined {
    return Array.from(this.readModels.values()).find(
      room => room.inviteCode === inviteCode
    );
  }

  public getAllRooms(): RoomReadModel[] {
    return Array.from(this.readModels.values());
  }

  private handleRoomCreated(event: DomainEvent): void {
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

  private handlePlayerJoined(event: DomainEvent): void {
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

  private handlePlayerLeft(event: DomainEvent): void {
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

  private handleGameCreated(event: DomainEvent): void {
    const { roomId } = event.eventData;
    const model = this.readModels.get(roomId);
    
    if (model) {
      model.gameId = event.aggregateId;
      model.lastActivity = event.timestamp;
    }
  }

  private handleGameStarted(event: DomainEvent): void {
    const { roomId } = event.eventData;
    const model = this.readModels.get(roomId);
    
    if (model) {
      model.status = 'PLAYING';
      model.lastActivity = event.timestamp;
    }
  }
}

