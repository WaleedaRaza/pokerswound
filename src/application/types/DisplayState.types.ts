/**
 * Display State Types
 * 
 * These types represent what the UI should display at any given moment.
 * This is SEPARATE from the logical game state (which is the source of truth).
 * 
 * The DisplayStateManager calculates display states from logical states,
 * solving the all-in animation bug by using pre-cleanup snapshots.
 */

export interface DisplayPlayer {
  id: string;
  name: string;
  stack: number;
  betThisStreet: number;
  isAllIn: boolean;
  hasFolded: boolean;
  seatIndex: number;
}

export interface DisplayState {
  // What UI should show RIGHT NOW
  visibleState: {
    pot: number;
    players: DisplayPlayer[];
    communityCards: string[];
    currentStreet: string;
  };
  
  // What transitions/animations should happen
  animationPhases: AnimationPhase[];
  
  // Current phase of the hand
  phase: 'PRE_DEAL' | 'BETTING' | 'REVEALING' | 'DISTRIBUTING' | 'COMPLETE';
  
  // Metadata for UI
  metadata: {
    isAllInRunout: boolean;
    hasWinner: boolean;
    potBeforeDistribution?: number;
  };
}

export interface AnimationPhase {
  type: 'STREET_REVEAL' | 'WINNER_ANNOUNCED' | 'POT_TRANSFER' | 'STACKS_UPDATED' | 'POT_UPDATE';
  delay: number;  // milliseconds
  data: any;
}

/**
 * Pre-change snapshot captured BEFORE state mutations
 * This preserves critical data like isAllIn flags before cleanup
 */
export interface GameStateSnapshot {
  players: {
    id: string;
    name: string;
    stack: number;
    isAllIn: boolean;
    betThisStreet: number;
    hasFolded: boolean;
    seatIndex: number;
  }[];
  pot: number;
  communityCards: string[];
  currentStreet: string;
}

/**
 * Domain outcomes from the engine
 * Contains what happened (winners, pot amount, etc.)
 */
export interface DomainOutcomes {
  type: 'ACTION_PROCESSED' | 'BETTING_COMPLETE' | 'HAND_COMPLETED';
  wasAllIn?: boolean;
  potAmount?: number;
  winners?: {
    playerId: string;
    amount: number;
    handRank?: any;
    handDescription?: string;
  }[];
  action?: {
    playerId: string;
    type: string;
    amount?: number;
  };
}

