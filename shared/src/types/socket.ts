import { GameState, GameAction } from './game';
import { Player, PlayerActionRequest } from './player';
import { Room } from './room';

// Client to Server Events
export interface ClientToServerEvents {
  // Room events
  'room:join': (data: { roomCode: string; playerName: string }) => void;
  'room:create': (data: { name: string; settings: any }) => void;
  'room:leave': () => void;
  
  // Game events
  'game:ready': () => void;
  'game:action': (data: PlayerActionRequest) => void;
  'game:chat': (data: { message: string }) => void;
  
  // Connection events
  'ping': () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Room events
  'room:joined': (data: { room: Room; player: Player }) => void;
  'room:created': (data: { room: Room; player: Player }) => void;
  'room:left': () => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'room:error': (data: { message: string }) => void;
  
  // Game events
  'game:state-update': (data: GameState) => void;
  'game:action-received': (data: { playerId: string; action: string }) => void;
  'game:invalid-action': (data: { message: string }) => void;
  'game:phase-change': (data: { phase: string; communityCards?: any[] }) => void;
  'game:hand-complete': (data: { winners: Player[]; pot: number }) => void;
  'game:round-complete': (data: { handHistory: any[] }) => void;
  
  // Chat events
  'chat:message': (data: { playerId: string; message: string; timestamp: number }) => void;
  
  // Connection events
  'pong': () => void;
  'disconnect': (reason: string) => void;
}

// Inter-server events (for scaling)
export interface InterServerEvents {
  'room:update': (data: { roomId: string; state: any }) => void;
  'game:action': (data: { roomId: string; action: GameAction }) => void;
}

// Socket data types
export interface SocketData {
  playerId?: string;
  roomId?: string;
  playerName?: string;
} 