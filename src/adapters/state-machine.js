/**
 * STATE MACHINE MODULE
 * 
 * Purpose: Explicit game state transitions with validation
 * Wraps existing street logic without breaking current schema
 * 
 * States: PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
 * Status: INIT → IN_PROGRESS → COMPLETED
 * 
 * Architectural Invariants:
 * - State transitions only when betting engine reports "action closed"
 * - Never render UI based on assumption - always read state from state machine
 * - Maintains backward compatibility with existing gameState.street assignments
 */

const VALID_STREETS = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
const VALID_STATUSES = ['INIT', 'IN_PROGRESS', 'COMPLETED'];

/**
 * VALIDATE STREET TRANSITION
 * Ensures transitions follow poker rules
 * 
 * @param {string} currentStreet - Current street
 * @param {string} nextStreet - Proposed next street
 * @returns {boolean} - True if transition is valid
 */
function canTransitionStreet(currentStreet, nextStreet) {
  const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  const currentIndex = streetOrder.indexOf(currentStreet);
  const nextIndex = streetOrder.indexOf(nextStreet);
  
  // Must be valid streets
  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }
  
  // Can only advance forward (or stay same)
  if (nextIndex < currentIndex) {
    return false;
  }
  
  // Can only advance by one step (or go directly to SHOWDOWN from any street)
  if (nextIndex > currentIndex + 1 && nextStreet !== 'SHOWDOWN') {
    return false;
  }
  
  return true;
}

/**
 * TRANSITION TO NEXT STREET
 * Validates and executes street transition
 * Maintains backward compatibility with existing code
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} nextStreet - Target street (optional, defaults to next in sequence)
 * @returns {Object} - { success: boolean, error?: string }
 */
function transitionToNextStreet(gameState, nextStreet = null) {
  const currentStreet = gameState.street;
  
  // Determine target street
  const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  const currentIndex = streetOrder.indexOf(currentStreet);
  
  if (currentIndex === -1) {
    return { success: false, error: `Invalid current street: ${currentStreet}` };
  }
  
  // If nextStreet not provided, advance to next in sequence
  const targetStreet = nextStreet || (currentIndex < streetOrder.length - 1 ? streetOrder[currentIndex + 1] : 'SHOWDOWN');
  
  // Validate transition
  if (!canTransitionStreet(currentStreet, targetStreet)) {
    return { 
      success: false, 
      error: `Invalid street transition: ${currentStreet} → ${targetStreet}` 
    };
  }
  
  // Execute transition (maintains existing mutation pattern)
  gameState.street = targetStreet;
  
  console.log(`🔄 [STATE] Transitioned: ${currentStreet} → ${targetStreet}`);
  
  return { success: true };
}

/**
 * TRANSITION TO SHOWDOWN
 * Special transition for hand completion
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @returns {Object} - { success: boolean, error?: string }
 */
function transitionToShowdown(gameState) {
  return transitionToNextStreet(gameState, 'SHOWDOWN');
}

/**
 * SET STATUS
 * Validates and sets game status
 * 
 * @param {Object} gameState - Current game state (mutated)
 * @param {string} status - New status
 * @returns {Object} - { success: boolean, error?: string }
 */
function setStatus(gameState, status) {
  if (!VALID_STATUSES.includes(status)) {
    return { 
      success: false, 
      error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}` 
    };
  }
  
  gameState.status = status;
  console.log(`🔄 [STATE] Status changed: ${gameState.status}`);
  
  return { success: true };
}

/**
 * VALIDATE GAME STATE STRUCTURE
 * Ensures gameState has required fields
 * 
 * @param {Object} gameState - Game state to validate
 * @returns {Object} - { isValid: boolean, errors?: string[] }
 */
function validateGameState(gameState) {
  const errors = [];
  
  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { isValid: false, errors };
  }
  
  if (!VALID_STREETS.includes(gameState.street)) {
    errors.push(`Invalid street: ${gameState.street}`);
  }
  
  if (!VALID_STATUSES.includes(gameState.status)) {
    errors.push(`Invalid status: ${gameState.status}`);
  }
  
  if (!Array.isArray(gameState.players)) {
    errors.push('Players must be an array');
  }
  
  if (typeof gameState.currentBet !== 'number') {
    errors.push('currentBet must be a number');
  }
  
  if (typeof gameState.currentActorSeat !== 'number' && gameState.currentActorSeat !== null) {
    errors.push('currentActorSeat must be a number or null');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * GET VALID NEXT STREETS
 * Returns list of valid next streets from current state
 * 
 * @param {string} currentStreet - Current street
 * @returns {string[]} - Array of valid next streets
 */
function getValidNextStreets(currentStreet) {
  const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  const currentIndex = streetOrder.indexOf(currentStreet);
  
  if (currentIndex === -1) {
    return [];
  }
  
  // Can advance to next street OR jump to SHOWDOWN
  const valid = [];
  if (currentIndex < streetOrder.length - 1) {
    valid.push(streetOrder[currentIndex + 1]);
  }
  if (currentStreet !== 'SHOWDOWN') {
    valid.push('SHOWDOWN');
  }
  
  return valid;
}

module.exports = {
  canTransitionStreet,
  transitionToNextStreet,
  transitionToShowdown,
  setStatus,
  validateGameState,
  getValidNextStreets,
  VALID_STREETS,
  VALID_STATUSES
};

