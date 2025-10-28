/**
 * SEQUENCE TRACKER - Day 2 Client Weapon
 * Ensures client only accepts fresh updates, ignores stale ones
 */

class SequenceTracker {
  constructor() {
    this.currentSeq = 0;
    this.missedSequences = [];
    this.listeners = [];
    
    console.log('⚔️ Sequence Tracker initialized');
  }

  /**
   * Process incoming message with sequence number
   * @param {Object} message - Message with seq property
   * @returns {boolean} - true if message should be processed, false if stale
   */
  shouldProcessMessage(message) {
    // Validate message format
    if (!message || typeof message.seq !== 'number') {
      console.warn('Invalid message format - missing seq:', message);
      return false;
    }

    // Check if stale
    if (message.seq <= this.currentSeq) {
      console.log(`🚫 Ignoring stale update: seq ${message.seq} <= current ${this.currentSeq}`);
      this.notifyListeners('stale', message);
      return false;
    }

    // Check for gaps (but only if gap is reasonable - not timestamp jumps)
    const gap = message.seq - this.currentSeq - 1;
    if (gap > 0 && gap < 1000) {
      // Reasonable gap - track missing sequences
      const missing = [];
      for (let i = this.currentSeq + 1; i < message.seq; i++) {
        missing.push(i);
      }
      console.warn(`⚠️  Sequence gap detected: missing ${missing.length} messages`);
      this.missedSequences.push(...missing);
      this.notifyListeners('gap', { missing, received: message.seq });
    } else if (gap >= 1000) {
      // Large jump (probably timestamp-based seq in lobby phase) - just accept it
      console.log(`📈 Large sequence jump (${this.currentSeq} → ${message.seq}), accepting...`);
    }

    // Update current sequence
    const oldSeq = this.currentSeq;
    this.currentSeq = message.seq;
    
    console.log(`✅ Sequence advanced: ${oldSeq} → ${this.currentSeq}`);
    this.notifyListeners('advance', { from: oldSeq, to: this.currentSeq });
    
    return true;
  }

  /**
   * Reset sequence (e.g., when joining new room)
   */
  reset() {
    console.log('🔄 Sequence tracker reset');
    this.currentSeq = 0;
    this.missedSequences = [];
    this.notifyListeners('reset', {});
  }

  /**
   * Set sequence to specific value (e.g., after hydration)
   */
  setSequence(seq) {
    // Accept both numbers and string numbers
    const numSeq = typeof seq === 'string' ? parseInt(seq) : seq;
    
    if (typeof numSeq !== 'number' || isNaN(numSeq)) {
      console.error('Invalid sequence number:', seq);
      return;
    }

    const oldSeq = this.currentSeq;
    this.currentSeq = numSeq;
    console.log(`📍 Sequence set: ${oldSeq} → ${numSeq}`);
    this.notifyListeners('set', { from: oldSeq, to: numSeq });
  }

  /**
   * Get current sequence number
   */
  getCurrentSeq() {
    return this.currentSeq;
  }

  /**
   * Get list of missed sequences
   */
  getMissedSequences() {
    return [...this.missedSequences];
  }

  /**
   * Add listener for sequence events
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Sequence listener error:', error);
      }
    });
  }

  /**
   * Create standardized message handler wrapper
   */
  createHandler(originalHandler) {
    return (message) => {
      if (!this.shouldProcessMessage(message)) {
        return;
      }
      
      // Extract payload if using standard format
      const data = message.payload || message;
      return originalHandler(data);
    };
  }
}

// Export for use in play.html
window.SequenceTracker = SequenceTracker;

console.log('✅ Sequence Tracker loaded');
