/**
 * ProcessPlayerAction Command
 */

import type { ICommand } from '../../../common/interfaces/ICommandBus';
import type { UUID, Chips, ActionType } from '../../../types/common.types';

export class ProcessPlayerActionCommand implements ICommand {
  readonly commandName = 'ProcessPlayerAction';

  constructor(
    public readonly gameId: string,
    public readonly playerId: UUID,
    public readonly actionType: ActionType,
    public readonly amount?: Chips
  ) {}
}

