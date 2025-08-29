import type { UUID, Chips } from './common.types';
import type { ActionType } from './common.types';
import type { Hole2 } from './card.types';

export interface PlayerAction {
  type: ActionType;
  amount?: Chips;
  at: string; // ISO timestamp
}

export interface PlayerState {
  uuid: UUID;
  name: string;
  stack: Chips;
  hole?: Hole2;
  hasFolded: boolean;
  isAllIn: boolean;
  betThisStreet: Chips;
  actionHistory: ReadonlyArray<PlayerAction>;
}
