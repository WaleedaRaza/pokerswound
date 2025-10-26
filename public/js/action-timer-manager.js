// ⚔️ ACTION TIMER MANAGER - 30-second countdown with auto-action
// WEEK 2 DAY 6: Action Timer System

/**
 * ActionTimerManager: Manages turn timers and auto-actions
 * 
 * Responsibilities:
 * - Start/stop countdown timer for player actions
 * - Display visual countdown
 * - Trigger warnings at thresholds
 * - Execute auto-action on timeout (check or fold)
 * - Sync with server time
 */

class ActionTimerManager {
  constructor(options = {}) {
    this.duration = options.duration || 30; // Default 30 seconds
    this.warningThresholds = options.warningThresholds || [10, 5]; // Warn at 10s and 5s
    
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = this.duration;
    this.startTime = null;
    this.pausedAt = null;
    this.intervalId = null;
    
    // Callbacks
    this.onTickCallback = null;
    this.onWarningCallback = null;
    this.onTimeoutCallback = null;
    
    // Auto-action settings
    this.canCheck = false; // Can player check (or must fold)?
    this.playerId = null;
    
    // Warning tracking (to avoid duplicate warnings)
    this.warningsTriggered = new Set();
    
    console.log('⏱️ ActionTimerManager initialized:', {
      duration: this.duration,
      warningThresholds: this.warningThresholds
    });
  }
  
  /**
   * Start the timer for a player's action
   * @param {string} playerId - ID of the player whose turn it is
   * @param {boolean} canCheck - Whether player can check (vs must call/fold)
   */
  start(playerId, canCheck = false) {
    if (this.isRunning) {
      console.warn('Timer already running, stopping first');
      this.stop();
    }
    
    this.playerId = playerId;
    this.canCheck = canCheck;
    this.timeRemaining = this.duration;
    this.startTime = Date.now();
    this.isRunning = true;
    this.isPaused = false;
    this.warningsTriggered.clear();
    
    console.log('⏱️ Timer started:', {
      playerId,
      canCheck,
      duration: this.duration
    });
    
    // Start countdown interval (update every 100ms for smooth display)
    this.intervalId = setInterval(() => this._tick(), 100);
    
    // Initial tick
    this._tick();
  }
  
  /**
   * Stop the timer
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = this.duration;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('⏱️ Timer stopped');
    
    // Trigger tick callback with 0 to clear UI
    if (this.onTickCallback) {
      this.onTickCallback(0);
    }
  }
  
  /**
   * Pause the timer
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.pausedAt = Date.now();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('⏱️ Timer paused at:', this.timeRemaining);
  }
  
  /**
   * Resume the timer
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    this.isPaused = false;
    
    // Adjust start time to account for pause duration
    const pauseDuration = Date.now() - this.pausedAt;
    this.startTime += pauseDuration;
    
    // Resume countdown
    this.intervalId = setInterval(() => this._tick(), 100);
    
    console.log('⏱️ Timer resumed');
  }
  
  /**
   * Internal tick function (called every 100ms)
   */
  _tick() {
    if (!this.isRunning || this.isPaused) return;
    
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    this.timeRemaining = Math.max(0, this.duration - elapsed);
    
    // Trigger tick callback for UI update
    if (this.onTickCallback) {
      this.onTickCallback(this.timeRemaining);
    }
    
    // Check for warnings
    this._checkWarnings();
    
    // Check for timeout
    if (this.timeRemaining <= 0) {
      this._handleTimeout();
    }
  }
  
  /**
   * Check if warning thresholds have been reached
   */
  _checkWarnings() {
    for (const threshold of this.warningThresholds) {
      if (this.timeRemaining <= threshold && !this.warningsTriggered.has(threshold)) {
        this.warningsTriggered.add(threshold);
        
        console.log(`⏱️ Warning: ${threshold}s remaining`);
        
        if (this.onWarningCallback) {
          this.onWarningCallback(threshold);
        }
      }
    }
  }
  
  /**
   * Handle timeout (time reached 0)
   */
  _handleTimeout() {
    console.log('⏱️ TIMEOUT! Triggering auto-action:', {
      playerId: this.playerId,
      canCheck: this.canCheck
    });
    
    this.stop();
    
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback({
        playerId: this.playerId,
        canCheck: this.canCheck,
        autoAction: this.canCheck ? 'check' : 'fold'
      });
    }
  }
  
  /**
   * Get time remaining
   */
  getTimeRemaining() {
    return this.timeRemaining;
  }
  
  /**
   * Check if timer is running
   */
  isActive() {
    return this.isRunning && !this.isPaused;
  }
  
  /**
   * Register callback for each tick (UI updates)
   */
  onTick(callback) {
    this.onTickCallback = callback;
  }
  
  /**
   * Register callback for warnings
   */
  onWarning(callback) {
    this.onWarningCallback = callback;
  }
  
  /**
   * Register callback for timeout
   */
  onTimeout(callback) {
    this.onTimeoutCallback = callback;
  }
  
  /**
   * Get progress percentage (0-100)
   */
  getProgress() {
    return (this.timeRemaining / this.duration) * 100;
  }
  
  /**
   * Get color for timer based on time remaining
   */
  getColor() {
    const progress = this.getProgress();
    
    if (progress > 50) {
      return '#10b981'; // Green
    } else if (progress > 20) {
      return '#f59e0b'; // Yellow/Orange
    } else {
      return '#ef4444'; // Red
    }
  }
}

// Export for use in poker.html
window.ActionTimerManager = ActionTimerManager;

console.log('✅ ActionTimerManager loaded');

