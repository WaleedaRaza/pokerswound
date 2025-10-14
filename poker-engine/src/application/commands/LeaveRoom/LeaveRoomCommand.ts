/**
 * LeaveRoom Command
 */

import type { ICommand } from '../../../common/interfaces/ICommandBus';
import type { UUID } from '../../../types/common.types';

export class LeaveRoomCommand implements ICommand {
  readonly commandName = 'LeaveRoom';

  constructor(
    public readonly gameId: string,
    public readonly playerId: UUID
  ) {}
}

