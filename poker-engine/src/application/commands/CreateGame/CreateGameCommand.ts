/**
 * CreateGame Command
 */

import type { ICommand } from '../../../common/interfaces/ICommandBus';
import type { UUID, Chips } from '../../../types/common.types';

export interface CreateGameOptions {
  roomId: string;
  smallBlind: Chips;
  bigBlind: Chips;
  maxPlayers?: number;
  buyIn?: Chips;
}

export class CreateGameCommand implements ICommand {
  readonly commandName = 'CreateGame';

  constructor(public readonly options: CreateGameOptions) {}
}

