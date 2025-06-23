import { GameSettings } from './game';

export interface Room {
  id: string;
  name: string;
  code: string; // 6-character invite code
  settings: GameSettings;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface CreateRoomRequest {
  name: string;
  settings: Partial<GameSettings>;
  isPrivate?: boolean;
}

export interface JoinRoomRequest {
  roomCode: string;
  playerName: string;
}

export interface RoomListResponse {
  rooms: Room[];
  total: number;
}

export interface RoomInvite {
  roomCode: string;
  roomName: string;
  hostName: string;
  expiresAt: Date;
} 