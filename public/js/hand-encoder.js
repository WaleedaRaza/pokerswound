/**
 * POKER HAND ENCODER (PHE v2.0)
 * Compact, privacy-preserving hand serialization
 * 
 * Format: P[seat]:[cards]|B:[board]|W:[winner]|R:[rank]|P:[pot]|D:[dealer]|S:[seat]:[stack],...|A:[actions]
 * 
 * Example: P0:AhKd|P1:XX|B:Jh9h5h|W:0|R:5|P:120|D:2|S:0:5000,1:3000|A:P0R20,F1C20,T0R50
 * 
 * New in v2.0:
 * - D:[dealer] - Dealer position (BTN)
 * - S:[seat]:[stack],... - Starting stacks
 * - A:[street][seat][action][amount] - Street-specific actions (P=Preflop, F=Flop, T=Turn, R=River)
 * 
 * Benefits:
 * - 80-90% size reduction vs JSON
 * - Privacy: Mucked cards = XX (not stored)
 * - Searchable: grep "P0:AhKd" works
 * - Human readable for debugging
 * - Position data for VPIP/PFR analysis
 */

const HandEncoder = {
  /**
   * Encode a hand into PHE format (v2.0 with positions & stacks)
   * @param {Object} handData
   * @param {Array} handData.players - [{userId, seatIndex, cards, revealed, stack}]
   * @param {Array} handData.board - Board cards
   * @param {Object} handData.winner - {userId, seatIndex}
   * @param {number} handData.rank - Hand rank (1-10)
   * @param {number} handData.pot - Final pot size
   * @param {number} handData.dealerPosition - Dealer seat index (BTN)
   * @param {Array} handData.actions - [{seatIndex, action, amount, street}]
   * @returns {string} Encoded hand string
   */
  encode(handData) {
    const parts = [];
    
    // Players: P[seat]:[cards] or P[seat]:XX for mucked
    if (handData.players && handData.players.length > 0) {
      handData.players.forEach(player => {
        const seat = player.seatIndex;
        
        // Only encode cards if revealed (privacy-preserving)
        if (player.revealed && player.cards && player.cards.length > 0) {
          const cards = player.cards.join('');
          parts.push(`P${seat}:${cards}`);
        } else {
          // Mucked/folded = XX (no actual cards stored)
          parts.push(`P${seat}:XX`);
        }
      });
    }
    
    // Board: B:[cards]
    if (handData.board && handData.board.length > 0) {
      const board = handData.board.join('');
      parts.push(`B:${board}`);
    } else {
      parts.push('B:--'); // No flop (everyone folded preflop)
    }
    
    // Winner: W:[seat]
    if (handData.winner !== null && handData.winner !== undefined) {
      const winnerSeat = typeof handData.winner === 'object' 
        ? handData.winner.seatIndex 
        : handData.winner;
      parts.push(`W:${winnerSeat}`);
    } else {
      parts.push('W:-1'); // Split pot or no winner
    }
    
    // Rank: R:[1-10]
    if (handData.rank) {
      parts.push(`R:${handData.rank}`);
    } else {
      parts.push('R:0'); // Unknown rank
    }
    
    // Pot: P:[amount]
    const pot = handData.pot || 0;
    parts.push(`P:${pot}`);
    
    // Dealer Position: D:[seat] (NEW in v2.0)
    if (handData.dealerPosition !== null && handData.dealerPosition !== undefined) {
      parts.push(`D:${handData.dealerPosition}`);
    } else {
      parts.push('D:-1'); // Unknown dealer
    }
    
    // Starting Stacks: S:[seat]:[stack],... (NEW in v2.0)
    if (handData.players && handData.players.length > 0) {
      const stackParts = handData.players
        .filter(p => p.stack !== null && p.stack !== undefined)
        .map(p => `${p.seatIndex}:${p.stack}`)
        .join(',');
      if (stackParts) {
        parts.push(`S:${stackParts}`);
      } else {
        parts.push('S:--');
      }
    } else {
      parts.push('S:--');
    }
    
    // Actions: A:[street][seat][action][amount],... (ENHANCED in v2.0)
    if (handData.actions && handData.actions.length > 0) {
      // Group by street
      const byStreet = {
        P: [], // Preflop
        F: [], // Flop
        T: [], // Turn
        R: []  // River
      };
      
      handData.actions.forEach(a => {
        const street = this._compressStreet(a.street || 'PREFLOP');
        const seat = a.seatIndex || 0;
        const action = this._compressAction(a.action);
        const amount = a.amount ? a.amount : '';
        byStreet[street].push(`${seat}${action}${amount}`);
      });
      
      const actionStr = Object.keys(byStreet)
        .filter(street => byStreet[street].length > 0)
        .map(street => `${street}${byStreet[street].join(',')}`)
        .join('|');
      
      parts.push(`A:${actionStr || '--'}`);
    } else {
      parts.push('A:--'); // No actions recorded
    }
    
    return parts.join('|');
  },
  
  /**
   * Decode PHE format back to object
   * @param {string} encoded - Encoded hand string
   * @returns {Object} Decoded hand data
   */
  decode(encoded) {
    if (!encoded || typeof encoded !== 'string') {
      return null;
    }
    
    const data = {
      players: [],
      board: [],
      winner: null,
      rank: 0,
      pot: 0,
      dealerPosition: null,
      startingStacks: {},
      actions: []
    };
    
    const parts = encoded.split('|');
    
    parts.forEach(part => {
      if (!part.includes(':')) return;
      
      const colonIndex = part.indexOf(':');
      const key = part.substring(0, colonIndex);
      const value = part.substring(colonIndex + 1);
      
      // Player data: P0:AhKd or P1:XX
      if (key.startsWith('P') && key.length > 1) {
        const seat = parseInt(key.substring(1));
        const cards = value === 'XX' || value === '--' 
          ? null  // Mucked/hidden
          : this._splitCards(value);
        
        data.players.push({
          seatIndex: seat,
          cards: cards,
          revealed: cards !== null
        });
      }
      // Board: B:Jh9h5c
      else if (key === 'B') {
        if (value !== '--') {
          data.board = this._splitCards(value);
        }
      }
      // Winner: W:0
      else if (key === 'W') {
        data.winner = parseInt(value);
        if (data.winner === -1) data.winner = null;
      }
      // Rank: R:5
      else if (key === 'R') {
        data.rank = parseInt(value);
      }
      // Pot: P:120
      else if (key === 'P') {
        data.pot = parseInt(value);
      }
      // Dealer Position: D:2 (NEW in v2.0)
      else if (key === 'D') {
        data.dealerPosition = parseInt(value);
        if (data.dealerPosition === -1) data.dealerPosition = null;
      }
      // Starting Stacks: S:0:5000,1:3000 (NEW in v2.0)
      else if (key === 'S') {
        if (value !== '--') {
          value.split(',').forEach(stackStr => {
            const [seat, stack] = stackStr.split(':');
            if (seat && stack) {
              data.startingStacks[parseInt(seat)] = parseInt(stack);
            }
          });
        }
      }
      // Actions: A:P0R20,F1C20,T0R50 or A:0R20,1C20 (legacy) (ENHANCED in v2.0)
      else if (key === 'A') {
        if (value !== '--') {
          // Check if new format (has street prefixes)
          if (value.includes('P') || value.includes('F') || value.includes('T') || value.includes('R')) {
            data.actions = this._decodeActionsByStreet(value);
          } else {
            // Legacy format (no street info)
          data.actions = this._decodeActions(value);
          }
        }
      }
    });
    
    return data;
  },
  
  /**
   * Compress action type to single character
   * @private
   */
  _compressAction(action) {
    const map = {
      'FOLD': 'F',
      'fold': 'F',
      'CHECK': 'H',  // H for "hold"
      'check': 'H',
      'CALL': 'C',
      'call': 'C',
      'RAISE': 'R',
      'raise': 'R',
      'BET': 'B',
      'bet': 'B',
      'ALL_IN': 'A',
      'all_in': 'A'
    };
    return map[action] || action.charAt(0).toUpperCase();
  },
  
  /**
   * Compress street to single character
   * @private
   */
  _compressStreet(street) {
    const map = {
      'PREFLOP': 'P',
      'preflop': 'P',
      'FLOP': 'F',
      'flop': 'F',
      'TURN': 'T',
      'turn': 'T',
      'RIVER': 'R',
      'river': 'R'
    };
    return map[street] || 'P'; // Default to preflop
  },
  
  /**
   * Expand street from single character
   * @private
   */
  _expandStreet(shortStreet) {
    const map = {
      'P': 'PREFLOP',
      'F': 'FLOP',
      'T': 'TURN',
      'R': 'RIVER'
    };
    return map[shortStreet] || 'PREFLOP';
  },
  
  /**
   * Expand action type from single character
   * @private
   */
  _expandAction(shortAction) {
    const map = {
      'F': 'FOLD',
      'H': 'CHECK',
      'C': 'CALL',
      'R': 'RAISE',
      'B': 'BET',
      'A': 'ALL_IN'
    };
    return map[shortAction] || shortAction;
  },
  
  /**
   * Split card string into array
   * @private
   */
  _splitCards(cardStr) {
    if (!cardStr || cardStr.length === 0) return [];
    
    // Cards are 2 characters each (rank + suit)
    const cards = [];
    for (let i = 0; i < cardStr.length; i += 2) {
      if (i + 1 < cardStr.length) {
        cards.push(cardStr.substring(i, i + 2));
      }
    }
    return cards;
  },
  
  /**
   * Decode compressed actions string (legacy format)
   * @private
   */
  _decodeActions(actionsStr) {
    return actionsStr.split(',').map(actionStr => {
      if (actionStr.length < 2) return null;
      
      const seat = parseInt(actionStr.charAt(0));
      const action = this._expandAction(actionStr.charAt(1));
      const amount = actionStr.length > 2 ? parseInt(actionStr.substring(2)) : 0;
      
      return {
        seatIndex: seat,
        action: action,
        amount: amount,
        street: null // Legacy format has no street info
      };
    }).filter(a => a !== null);
  },
  
  /**
   * Decode actions by street (v2.0 format)
   * @private
   */
  _decodeActionsByStreet(actionsStr) {
    const actions = [];
    // Format: P0R20,1C20|F1C20|T0R50
    const streetGroups = actionsStr.split('|');
    
    streetGroups.forEach(group => {
      if (!group || group.length < 2) return;
      
      const street = this._expandStreet(group.charAt(0));
      const actionsInStreet = group.substring(1).split(',');
      
      actionsInStreet.forEach(actionStr => {
        if (actionStr.length < 2) return;
        
        const seat = parseInt(actionStr.charAt(0));
        const action = this._expandAction(actionStr.charAt(1));
        const amount = actionStr.length > 2 ? parseInt(actionStr.substring(2)) : 0;
        
        actions.push({
          seatIndex: seat,
          action: action,
          amount: amount,
          street: street
        });
      });
    });
    
    return actions;
  },
  
  /**
   * Get human-readable summary of encoded hand
   * @param {string} encoded - Encoded hand string
   * @returns {string} Human-readable summary
   */
  getSummary(encoded) {
    const data = this.decode(encoded);
    if (!data) return 'Invalid hand';
    
    const winnerPlayer = data.players.find(p => p.seatIndex === data.winner);
    const winnerCards = winnerPlayer && winnerPlayer.cards 
      ? winnerPlayer.cards.join(' ')
      : 'Unknown';
    
    return `Winner: Seat ${data.winner} (${winnerCards}) | Pot: $${data.pot} | Board: ${data.board.join(' ') || 'None'}`;
  }
};

// Export for use in Node.js (backend) and browser (frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HandEncoder;
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
  window.HandEncoder = HandEncoder;
}

console.log('✅ HandEncoder loaded (PHE v2.0 - with positions & stacks)');

