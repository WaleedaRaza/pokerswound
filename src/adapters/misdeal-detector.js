/**
 * MISDEAL DETECTOR MODULE
 * 
 * Purpose: Detect misdeals and deck integrity issues
 * Responsibilities:
 * - Validate deck integrity (no duplicates, correct count)
 * - Detect misdeal conditions (exposed cards, wrong number of cards)
 * - Validate card format and uniqueness
 * 
 * Architecture: Validation layer for deck/card integrity
 * Maintains backward compatibility with existing deck structure
 */

/**
 * VALIDATE DECK INTEGRITY
 * Ensures deck has no duplicates and correct card count
 * 
 * @param {Array} deck - Array of card codes (e.g., ['Ah', 'Kd', ...])
 * @returns {Object} - { isValid: boolean, errors?: string[] }
 */
function validateDeckIntegrity(deck) {
  const errors = [];
  
  if (!Array.isArray(deck)) {
    return { isValid: false, errors: ['Deck must be an array'] };
  }
  
  // Standard deck should have 52 cards
  if (deck.length !== 52) {
    errors.push(`Deck has ${deck.length} cards, expected 52`);
  }
  
  // Check for duplicates
  const seen = new Set();
  const duplicates = [];
  
  deck.forEach((card, index) => {
    if (seen.has(card)) {
      duplicates.push({ card, index });
    } else {
      seen.add(card);
    }
  });
  
  if (duplicates.length > 0) {
    errors.push(`Duplicate cards found: ${duplicates.map(d => `${d.card} at index ${d.index}`).join(', ')}`);
  }
  
  // Validate card format (should be 2 characters: rank + suit)
  const invalidCards = [];
  deck.forEach((card, index) => {
    if (typeof card !== 'string' || card.length !== 2) {
      invalidCards.push({ card, index });
    } else {
      // Validate rank and suit
      const rank = card[0].toUpperCase();
      const suit = card[1].toLowerCase();
      const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
      const validSuits = ['h', 'd', 'c', 's'];
      
      if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
        invalidCards.push({ card, index });
      }
    }
  });
  
  if (invalidCards.length > 0) {
    errors.push(`Invalid card format: ${invalidCards.map(c => `${c.card} at index ${c.index}`).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * VALIDATE HAND CARDS
 * Validates hole cards and community cards don't overlap
 * 
 * @param {Array} holeCards - Array of hole card arrays (one per player)
 * @param {Array} communityCards - Array of community cards
 * @returns {Object} - { isValid: boolean, errors?: string[] }
 */
function validateHandCards(holeCards, communityCards) {
  const errors = [];
  
  // Collect all cards
  const allCards = [];
  
  // Add hole cards
  if (Array.isArray(holeCards)) {
    holeCards.forEach((playerCards, playerIndex) => {
      if (Array.isArray(playerCards)) {
        playerCards.forEach((card, cardIndex) => {
          allCards.push({ card, source: `Player ${playerIndex} hole card ${cardIndex}` });
        });
      }
    });
  }
  
  // Add community cards
  if (Array.isArray(communityCards)) {
    communityCards.forEach((card, index) => {
      allCards.push({ card, source: `Community card ${index}` });
    });
  }
  
  // Check for duplicates across hole cards and community
  const seen = new Map();
  allCards.forEach(({ card, source }) => {
    if (seen.has(card)) {
      const previousSource = seen.get(card);
      errors.push(`Duplicate card ${card}: ${previousSource} and ${source}`);
    } else {
      seen.set(card, source);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * DETECT MISDEAL
 * Detects misdeal conditions (exposed cards, wrong count, etc.)
 * 
 * @param {Object} gameState - Game state
 * @returns {Object} - { isMisdeal: boolean, reason?: string, details?: Object }
 */
function detectMisdeal(gameState) {
  // Check deck integrity
  if (gameState.deck && Array.isArray(gameState.deck)) {
    const deckValidation = validateDeckIntegrity(gameState.deck);
    if (!deckValidation.isValid) {
      return {
        isMisdeal: true,
        reason: 'Deck integrity violation',
        details: { errors: deckValidation.errors }
      };
    }
  }
  
  // Check hand cards for duplicates
  const holeCards = gameState.players?.map(p => p.holeCards || []);
  const communityCards = gameState.communityCards || [];
  
  const handValidation = validateHandCards(holeCards, communityCards);
  if (!handValidation.isValid) {
    return {
      isMisdeal: true,
      reason: 'Duplicate cards in hand',
      details: { errors: handValidation.errors }
    };
  }
  
  // Check for exposed cards (if tracking is enabled)
  // In production, you'd track if cards were exposed prematurely
  if (gameState.exposedCards && gameState.exposedCards.length > 0) {
    return {
      isMisdeal: true,
      reason: 'Cards exposed prematurely',
      details: { exposedCards: gameState.exposedCards }
    };
  }
  
  // Check for wrong number of hole cards
  const playersWithCards = gameState.players?.filter(p => p.holeCards && p.holeCards.length > 0);
  if (playersWithCards) {
    playersWithCards.forEach(player => {
      if (player.holeCards.length !== 2) {
        return {
          isMisdeal: true,
          reason: `Player ${player.userId} has ${player.holeCards.length} hole cards, expected 2`,
          details: { player: player.userId, cardCount: player.holeCards.length }
        };
      }
    });
  }
  
  // Check for wrong number of community cards per street
  const street = gameState.street;
  const communityCount = communityCards.length;
  
  const expectedCounts = {
    'PREFLOP': 0,
    'FLOP': 3,
    'TURN': 4,
    'RIVER': 5,
    'SHOWDOWN': 5
  };
  
  const expectedCount = expectedCounts[street] !== undefined ? expectedCounts[street] : null;
  if (expectedCount !== null && communityCount !== expectedCount) {
    return {
      isMisdeal: true,
      reason: `Wrong number of community cards: ${communityCount} on ${street}, expected ${expectedCount}`,
      details: { street, communityCount, expectedCount }
    };
  }
  
  return { isMisdeal: false };
}

/**
 * VALIDATE CARD CODE
 * Validates a single card code format
 * 
 * @param {string} card - Card code (e.g., 'Ah', 'Kd')
 * @returns {boolean} - True if valid
 */
function validateCardCode(card) {
  if (typeof card !== 'string' || card.length !== 2) {
    return false;
  }
  
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const validSuits = ['h', 'd', 'c', 's'];
  
  return validRanks.includes(rank) && validSuits.includes(suit);
}

/**
 * CREATE STANDARD DECK
 * Creates a standard 52-card deck
 * 
 * @returns {Array} - Array of 52 card codes
 */
function createStandardDeck() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
  const deck = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(rank + suit);
    });
  });
  
  return deck;
}

/**
 * SHUFFLE DECK
 * Fisher-Yates shuffle algorithm
 * 
 * @param {Array} deck - Deck to shuffle
 * @returns {Array} - Shuffled deck
 */
function shuffleDeck(deck) {
  const shuffled = [...deck]; // Create copy
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

module.exports = {
  validateDeckIntegrity,
  validateHandCards,
  detectMisdeal,
  validateCardCode,
  createStandardDeck,
  shuffleDeck
};

