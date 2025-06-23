// Game constants
export const DEFAULT_SMALL_BLIND = 10;
export const DEFAULT_BIG_BLIND = 20;
export const DEFAULT_STARTING_CHIPS = 1000;
export const MAX_PLAYERS = 9;
export const MIN_PLAYERS = 2;
export const DEFAULT_TIME_BANK = 30; // seconds

// Room constants
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Card constants
export const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const SUITS: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: string[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Hand rankings (higher number = better hand)
export const HAND_RANKINGS = {
  'high-card': 1,
  'pair': 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  'straight': 5,
  'flush': 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10
} as const;

// Expected hand frequencies (for statistical testing)
export const EXPECTED_HAND_FREQUENCIES = {
  'high-card': 0.17411920,
  'pair': 0.43822546,
  'two-pair': 0.23495536,
  'three-of-a-kind': 0.04829870,
  'straight': 0.04619382,
  'flush': 0.03025494,
  'full-house': 0.02596102,
  'four-of-a-kind': 0.00168067,
  'straight-flush': 0.00027851,
  'royal-flush': 0.00003232
};

// Socket events
export const SOCKET_EVENTS = {
  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_CREATE: 'room:create',
  ROOM_LEAVE: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_CREATED: 'room:created',
  ROOM_LEFT: 'room:left',
  ROOM_PLAYER_JOINED: 'room:player-joined',
  ROOM_PLAYER_LEFT: 'room:player-left',
  ROOM_ERROR: 'room:error',
  
  // Game events
  GAME_READY: 'game:ready',
  GAME_ACTION: 'game:action',
  GAME_STATE_UPDATE: 'game:state-update',
  GAME_ACTION_RECEIVED: 'game:action-received',
  GAME_INVALID_ACTION: 'game:invalid-action',
  GAME_PHASE_CHANGE: 'game:phase-change',
  GAME_HAND_COMPLETE: 'game:hand-complete',
  GAME_ROUND_COMPLETE: 'game:round-complete',
  
  // Chat events
  GAME_CHAT: 'game:chat',
  CHAT_MESSAGE: 'chat:message',
  
  // Connection events
  PING: 'ping',
  PONG: 'pong',
  DISCONNECT: 'disconnect'
} as const; 