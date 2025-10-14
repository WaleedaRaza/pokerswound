/**
 * StartHand Command
 */

import type { ICommand } from '../../../common/interfaces/ICommandBus';

export class StartHandCommand implements ICommand {
  readonly commandName = 'StartHand';

  constructor(public readonly gameId: string) {}
}

