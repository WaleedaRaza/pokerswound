/**
 * POKER HAND ENCODER (PHE)
 * Compact, privacy-preserving hand serialization
 * 
 * Format: P[seat]:[cards]|B:[board]|W:[winner]|R:[rank]|P:[pot]|A:[actions]
 * 
 * Example: P0:AhKd|P1:XX|B:Jh9h5h|W:0|R:5|P:120|A:0R20,1C20,0R50
 * 
 * Benefits:
 * - 80-90% size reduction vs JSON
 * - Privacy: Mucked cards = XX (not stored)
 * - Searchable: grep "P0:AhKd" works
 * - Human readable for debugging
 */

const HandEncoder = {
  /**
   * Encode a hand into PHE format
   * @param {Object} handData
   * @param {Array} handData.players - [{userId, seatIndex, cards, revealed}]
   * @param {Array} handData.board - Board cards
   * @param {Object} handData.winner - {userId, seatIndex}
   * @param {number} handData.rank - Hand rank (1-10)
   * @param {number} handData.pot - Final pot size
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
    
    // Actions: A:[seat][action][amount],... (compressed)
    if (handData.actions && handData.actions.length > 0) {
      const actionStr = handData.actions.map(a => {
        const seat = a.seatIndex || 0;
        const action = this._compressAction(a.action);
        const amount = a.amount ? a.amount : '';
        return `${seat}${action}${amount}`;
      }).join(',');
      parts.push(`A:${actionStr}`);
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
      // Actions: A:0R20,1C20,0R50
      else if (key === 'A') {
        if (value !== '--') {
          data.actions = this._decodeActions(value);
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
   * Decode compressed actions string
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
        amount: amount
      };
    }).filter(a => a !== null);
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

console.log('✅ HandEncoder loaded (PHE v1.0)');

