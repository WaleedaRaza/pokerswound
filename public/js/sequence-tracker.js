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

    // Check for gaps
    if (message.seq > this.currentSeq + 1) {
      const gap = [];
      for (let i = this.currentSeq + 1; i < message.seq; i++) {
        gap.push(i);
      }
      console.warn(`⚠️  Sequence gap detected: missing ${gap.join(', ')}`);
      this.missedSequences.push(...gap);
      this.notifyListeners('gap', { missing: gap, received: message.seq });
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
    if (typeof seq !== 'number' || seq < 0) {
      console.error('Invalid sequence number:', seq);
      return;
    }

    const oldSeq = this.currentSeq;
    this.currentSeq = seq;
    console.log(`📍 Sequence set: ${oldSeq} → ${seq}`);
    this.notifyListeners('set', { from: oldSeq, to: seq });
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
