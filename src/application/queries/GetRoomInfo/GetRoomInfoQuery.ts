/**
 * GetRoomInfo Query
 */

import type { IQuery } from '../../../common/interfaces/IQueryBus';

export interface RoomInfo {
  roomId: string;
  gameId?: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  status: 'WAITING' | 'PLAYING' | 'PAUSED';
}

export class GetRoomInfoQuery implements IQuery<RoomInfo | null> {
  readonly queryName = 'GetRoomInfo';

  constructor(public readonly roomId: string) {}
}

