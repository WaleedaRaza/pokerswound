/**
 * JoinRoom Command
 */

import type { ICommand } from '../../../common/interfaces/ICommandBus';
import type { UUID, Chips } from '../../../types/common.types';

export class JoinRoomCommand implements ICommand {
  readonly commandName = 'JoinRoom';

  constructor(
    public readonly gameId: string,
    public readonly playerId: UUID,
    public readonly playerName: string,
    public readonly seatNumber: number,
    public readonly buyIn: Chips
  ) {}
}

