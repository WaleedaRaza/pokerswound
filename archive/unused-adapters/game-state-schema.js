/**
 * GAME STATE SCHEMA MODULE
 * 
 * Purpose: Single source of truth for gameState structure
 * Responsibilities:
 * - Define canonical gameState shape
 * - Validate gameState structure
 * - Ensure consistency across modules
 * - Provide type documentation
 * 
 * Architecture: Schema validation layer (no runtime types, but clear structure)
 * Maintains backward compatibility with existing gameState
 */

/**
 * VALIDATE GAME STATE STRUCTURE
 * Ensures gameState has all required fields
 * 
 * @param {Object} gameState - Game state to validate
 * @returns {Object} - { isValid: boolean, errors?: string[] }
 */
function validateGameStateStructure(gameState) {
  const errors = [];
  
  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { isValid: false, errors };
  }
  
  // Required top-level fields
  const requiredFields = [
    'street',
    'pot',
    'currentBet',
    'players',
    'currentActorSeat'
  ];
  
  requiredFields.forEach(field => {
    if (gameState[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate street value
  const validStreets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  if (gameState.street && !validStreets.includes(gameState.street)) {
    errors.push(`Invalid street: ${gameState.street}. Must be one of: ${validStreets.join(', ')}`);
  }
  
  // Validate players array
  if (gameState.players) {
    if (!Array.isArray(gameState.players)) {
      errors.push('players must be an array');
    } else {
      gameState.players.forEach((player, index) => {
        if (!player.userId) {
          errors.push(`Player at index ${index} missing userId`);
        }
        if (typeof player.seatIndex !== 'number') {
          errors.push(`Player at index ${index} missing or invalid seatIndex`);
        }
        if (typeof player.chips !== 'number') {
          errors.push(`Player at index ${index} missing or invalid chips`);
        }
        if (player.bet === undefined) {
          errors.push(`Player at index ${index} missing bet (should be 0 if no bet)`);
        }
        if (player.betThisStreet === undefined) {
          errors.push(`Player at index ${index} missing betThisStreet (should be 0 if no bet)`);
        }
      });
    }
  }
  
  // Validate numeric fields
  if (typeof gameState.pot !== 'number' || gameState.pot < 0) {
    errors.push('pot must be a non-negative number');
  }
  
  if (typeof gameState.currentBet !== 'number' || gameState.currentBet < 0) {
    errors.push('currentBet must be a non-negative number');
  }
  
  if (gameState.currentActorSeat !== null && typeof gameState.currentActorSeat !== 'number') {
    errors.push('currentActorSeat must be a number or null');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * CREATE CANONICAL GAME STATE
 * Creates a gameState object with all required fields initialized
 * 
 * @param {Object} options - Initialization options
 * @returns {Object} - Canonical gameState structure
 */
function createCanonicalGameState(options = {}) {
  return {
    // Core state
    street: options.street || 'PREFLOP',
    status: options.status || 'IN_PROGRESS',
    pot: options.pot || 0,
    currentBet: options.currentBet || 0,
    minRaise: options.minRaise || 0,
    
    // Players
    players: options.players || [],
    
    // Positions
    dealerPosition: options.dealerPosition || null,
    sbPosition: options.sbPosition || null,
    bbPosition: options.bbPosition || null,
    currentActorSeat: options.currentActorSeat || null,
    
    // Betting tracking
    lastRaiseSize: options.lastRaiseSize || 0,
    lastAggressor: options.lastAggressor || null,
    reopensAction: options.reopensAction || false,
    
    // Blinds
    smallBlind: options.smallBlind || 0,
    bigBlind: options.bigBlind || 0,
    
    // Community cards
    communityCards: options.communityCards || [],
    
    // Deck (if needed)
    deck: options.deck || [],
    
    // Action history
    actionHistory: options.actionHistory || [],
    
    // Sequence tracking
    actionSeq: options.actionSeq || 0,
    
    // Chip conservation
    startingTotalChips: options.startingTotalChips || 0,
    originalStacks: options.originalStacks || [],
    
    // Timers (optional)
    timers: options.timers || {},
    
    // Metadata
    handNumber: options.handNumber || 1,
    roomId: options.roomId || null,
    createdAt: options.createdAt || new Date().toISOString()
  };
}

/**
 * NORMALIZE GAME STATE
 * Ensures gameState has all required fields (backfills missing fields)
 * 
 * @param {Object} gameState - Game state to normalize
 * @returns {Object} - Normalized gameState
 */
function normalizeGameState(gameState) {
  if (!gameState) {
    return createCanonicalGameState();
  }
  
  // Backfill missing fields with defaults
  const normalized = {
    ...createCanonicalGameState(),
    ...gameState,
    // Ensure arrays exist
    players: gameState.players || [],
    communityCards: gameState.communityCards || [],
    actionHistory: gameState.actionHistory || [],
    originalStacks: gameState.originalStacks || [],
    // Ensure numeric defaults
    pot: gameState.pot ?? 0,
    currentBet: gameState.currentBet ?? 0,
    minRaise: gameState.minRaise ?? 0,
    actionSeq: gameState.actionSeq ?? 0,
    // Ensure boolean defaults
    reopensAction: gameState.reopensAction ?? false
  };
  
  // Normalize players
  normalized.players = normalized.players.map(player => ({
    userId: player.userId,
    seatIndex: player.seatIndex ?? -1,
    chips: player.chips ?? 0,
    bet: player.bet ?? 0,
    betThisStreet: player.betThisStreet ?? 0,
    folded: player.folded ?? false,
    status: player.status || 'ACTIVE',
    holeCards: player.holeCards || [],
    allInAmount: player.allInAmount,
    ...player // Preserve any additional fields
  }));
  
  return normalized;
}

/**
 * GAME STATE SCHEMA DOCUMENTATION
 * Canonical structure for reference
 */
const GAME_STATE_SCHEMA = {
  // Core state
  street: 'PREFLOP | FLOP | TURN | RIVER | SHOWDOWN',
  status: 'IN_PROGRESS | COMPLETED',
  pot: 'number (>= 0)',
  currentBet: 'number (>= 0)',
  minRaise: 'number (>= 0)',
  
  // Players array
  players: [{
    userId: 'string',
    seatIndex: 'number',
    chips: 'number (>= 0)',
    bet: 'number (>= 0) - cumulative bet',
    betThisStreet: 'number (>= 0) - bet on current street',
    folded: 'boolean',
    status: 'ACTIVE | FOLDED | ALL_IN | BUSTED',
    holeCards: 'string[] - card codes like ["Ah", "Kd"]',
    allInAmount: 'number (optional) - amount of all-in'
  }],
  
  // Positions
  dealerPosition: 'number | null',
  sbPosition: 'number | null',
  bbPosition: 'number | null',
  currentActorSeat: 'number | null',
  
  // Betting tracking
  lastRaiseSize: 'number (>= 0)',
  lastAggressor: 'string (userId) | null',
  reopensAction: 'boolean',
  
  // Blinds
  smallBlind: 'number (>= 0)',
  bigBlind: 'number (>= 0)',
  
  // Community cards
  communityCards: 'string[] - card codes',
  
  // Action history
  actionHistory: [{
    seq: 'number',
    userId: 'string',
    action: 'FOLD | CHECK | CALL | RAISE | ALL_IN',
    amount: 'number (optional)',
    street: 'string',
    timestamp: 'string (ISO)'
  }],
  
  // Sequence tracking
  actionSeq: 'number (>= 0)',
  
  // Chip conservation
  startingTotalChips: 'number (>= 0)',
  originalStacks: [{
    userId: 'string',
    seatIndex: 'number',
    startingChips: 'number'
  }]
};

module.exports = {
  validateGameStateStructure,
  createCanonicalGameState,
  normalizeGameState,
  GAME_STATE_SCHEMA
};

