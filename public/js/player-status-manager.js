// ⚔️ PLAYER STATUS MANAGER - Track ACTIVE/AWAY/OFFLINE states
// WEEK 2 DAY 7: Player Status System

/**
 * PlayerStatusManager: Manages player engagement status
 * 
 * Responsibilities:
 * - Track player status (ACTIVE, AWAY, OFFLINE)
 * - Handle state transitions based on activity
 * - Manage missed turn counters
 * - Update visual indicators
 * - Handle reconnection logic
 * 
 * Status Definitions:
 * - ACTIVE 🟢: Player is connected and responsive
 * - AWAY ⏸️: Player missed 2 turns (auto-fold)
 * - OFFLINE 🔴: Player disconnected (can rejoin)
 */

class PlayerStatusManager {
  constructor() {
    this.playerStatuses = new Map(); // playerId -> status
    this.missedTurns = new Map(); // playerId -> count
    this.lastActivity = new Map(); // playerId -> timestamp
    
    // Status constants
    this.STATUS = {
      ACTIVE: 'ACTIVE',
      AWAY: 'AWAY',
      OFFLINE: 'OFFLINE'
    };
    
    // Thresholds
    this.AWAY_THRESHOLD = 2; // Missed turns to mark AWAY
    this.OFFLINE_THRESHOLD = 5; // Missed turns to mark OFFLINE
    this.OFFLINE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in ms
    
    console.log('🎭 PlayerStatusManager initialized');
  }
  
  /**
   * Initialize or update player status
   */
  addPlayer(playerId, status = this.STATUS.ACTIVE) {
    this.playerStatuses.set(playerId, status);
    this.missedTurns.set(playerId, 0);
    this.lastActivity.set(playerId, Date.now());
    
    console.log(`🎭 Player added: ${playerId} (${status})`);
  }
  
  /**
   * Remove player from tracking
   */
  removePlayer(playerId) {
    this.playerStatuses.delete(playerId);
    this.missedTurns.delete(playerId);
    this.lastActivity.delete(playerId);
    
    console.log(`🎭 Player removed: ${playerId}`);
  }
  
  /**
   * Get player's current status
   */
  getStatus(playerId) {
    return this.playerStatuses.get(playerId) || this.STATUS.ACTIVE;
  }
  
  /**
   * Set player's status directly
   */
  setStatus(playerId, status) {
    const oldStatus = this.getStatus(playerId);
    
    if (oldStatus === status) return;
    
    this.playerStatuses.set(playerId, status);
    
    console.log(`🎭 Status changed: ${playerId} ${oldStatus} → ${status}`);
    
    // Emit custom event for UI updates
    this._emitStatusChange(playerId, status, oldStatus);
  }
  
  /**
   * Mark player as active (e.g., after taking action)
   */
  markActive(playerId) {
    this.setStatus(playerId, this.STATUS.ACTIVE);
    this.missedTurns.set(playerId, 0);
    this.lastActivity.set(playerId, Date.now());
  }
  
  /**
   * Mark player as away (manual or auto)
   */
  markAway(playerId) {
    this.setStatus(playerId, this.STATUS.AWAY);
  }
  
  /**
   * Mark player as offline (disconnected)
   */
  markOffline(playerId) {
    this.setStatus(playerId, this.STATUS.OFFLINE);
  }
  
  /**
   * Increment missed turn counter and update status if needed
   */
  incrementMissedTurns(playerId) {
    const current = this.missedTurns.get(playerId) || 0;
    const newCount = current + 1;
    
    this.missedTurns.set(playerId, newCount);
    
    console.log(`🎭 ${playerId} missed turns: ${newCount}`);
    
    // Auto-transition based on missed turns
    if (newCount >= this.OFFLINE_THRESHOLD) {
      this.markOffline(playerId);
    } else if (newCount >= this.AWAY_THRESHOLD) {
      this.markAway(playerId);
    }
    
    return newCount;
  }
  
  /**
   * Reset missed turn counter
   */
  resetMissedTurns(playerId) {
    this.missedTurns.set(playerId, 0);
  }
  
  /**
   * Get missed turn count
   */
  getMissedTurns(playerId) {
    return this.missedTurns.get(playerId) || 0;
  }
  
  /**
   * Check if player is active
   */
  isActive(playerId) {
    return this.getStatus(playerId) === this.STATUS.ACTIVE;
  }
  
  /**
   * Check if player is away
   */
  isAway(playerId) {
    return this.getStatus(playerId) === this.STATUS.AWAY;
  }
  
  /**
   * Check if player is offline
   */
  isOffline(playerId) {
    return this.getStatus(playerId) === this.STATUS.OFFLINE;
  }
  
  /**
   * Check if player can take actions
   */
  canAct(playerId) {
    return this.isActive(playerId);
  }
  
  /**
   * Get all player statuses
   */
  getAllStatuses() {
    const statuses = {};
    for (const [playerId, status] of this.playerStatuses) {
      statuses[playerId] = {
        status,
        missedTurns: this.getMissedTurns(playerId),
        lastActivity: this.lastActivity.get(playerId)
      };
    }
    return statuses;
  }
  
  /**
   * Get status indicator (emoji + color)
   */
  getStatusIndicator(status) {
    switch (status) {
      case this.STATUS.ACTIVE:
        return { emoji: '🟢', color: '#10b981', text: 'Active' };
      case this.STATUS.AWAY:
        return { emoji: '⏸️', color: '#f59e0b', text: 'Away' };
      case this.STATUS.OFFLINE:
        return { emoji: '🔴', color: '#ef4444', text: 'Offline' };
      default:
        return { emoji: '⚪', color: '#94a3b8', text: 'Unknown' };
    }
  }
  
  /**
   * Handle socket connection status
   */
  onSocketConnected(playerId) {
    console.log(`🎭 Socket connected: ${playerId}`);
    this.lastActivity.set(playerId, Date.now());
    
    // If player was offline, mark them active
    if (this.isOffline(playerId)) {
      this.markActive(playerId);
    }
  }
  
  /**
   * Handle socket disconnection
   */
  onSocketDisconnected(playerId) {
    console.log(`🎭 Socket disconnected: ${playerId}`);
    
    // Mark as offline after a short delay (to handle quick reconnects)
    setTimeout(() => {
      const lastActivity = this.lastActivity.get(playerId) || 0;
      const timeSinceActivity = Date.now() - lastActivity;
      
      // Only mark offline if no recent activity
      if (timeSinceActivity > 5000) { // 5 seconds
        this.markOffline(playerId);
      }
    }, 5000);
  }
  
  /**
   * Emit status change event for UI updates
   */
  _emitStatusChange(playerId, newStatus, oldStatus) {
    const event = new CustomEvent('playerStatusChanged', {
      detail: {
        playerId,
        newStatus,
        oldStatus,
        indicator: this.getStatusIndicator(newStatus)
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * Get status summary for all players
   */
  getSummary() {
    const summary = {
      active: 0,
      away: 0,
      offline: 0,
      total: this.playerStatuses.size
    };
    
    for (const status of this.playerStatuses.values()) {
      switch (status) {
        case this.STATUS.ACTIVE:
          summary.active++;
          break;
        case this.STATUS.AWAY:
          summary.away++;
          break;
        case this.STATUS.OFFLINE:
          summary.offline++;
          break;
      }
    }
    
    return summary;
  }
}

// Export for use in poker.html
window.PlayerStatusManager = PlayerStatusManager;

console.log('✅ PlayerStatusManager loaded');

