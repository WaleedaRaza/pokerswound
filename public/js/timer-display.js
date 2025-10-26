/**
 * Timer Display - Client-side read-only timer visualization
 * Shows countdown based on server-provided timestamps
 * NO client-side enforcement - server handles all timeouts
 */

class TimerDisplay {
  constructor() {
    this.timerElement = null;
    this.timebankElement = null;
    this.currentTimer = null;
    this.animationFrame = null;
    console.log('⏰ Timer Display initialized');
  }

  /**
   * Initialize timer display elements
   */
  init(timerElementId, timebankElementId) {
    this.timerElement = document.getElementById(timerElementId);
    this.timebankElement = document.getElementById(timebankElementId);
    
    if (!this.timerElement) {
      console.warn('Timer element not found:', timerElementId);
    }
    
    if (!this.timebankElement) {
      console.warn('Timebank element not found:', timebankElementId);
    }
  }

  /**
   * Start displaying a timer based on server data
   * @param {Object} timerData - Timer data from server
   * @param {string} timerData.started_at - ISO timestamp when turn started
   * @param {number} timerData.turn_time_seconds - Total turn time in seconds
   * @param {number} timerData.turn_time_remaining_ms - Remaining turn time in ms
   * @param {number} timerData.timebank_remaining_ms - Remaining timebank in ms
   * @param {boolean} timerData.is_using_timebank - Whether timebank is active
   */
  startTimer(timerData) {
    this.stopTimer(); // Clear any existing timer
    
    if (!timerData || !timerData.started_at) {
      console.warn('Invalid timer data:', timerData);
      return;
    }
    
    this.currentTimer = {
      startedAt: new Date(timerData.started_at).getTime(),
      turnTimeMs: timerData.turn_time_seconds * 1000,
      timebankMs: timerData.timebank_remaining_ms || 0,
      isUsingTimebank: timerData.is_using_timebank || false
    };
    
    // Start the display update loop
    this.updateDisplay();
  }

  /**
   * Update the timer display
   */
  updateDisplay() {
    if (!this.currentTimer) return;
    
    const now = Date.now();
    const elapsed = now - this.currentTimer.startedAt;
    
    let remainingMs;
    let isTimebank = false;
    
    if (this.currentTimer.isUsingTimebank) {
      // Already in timebank
      remainingMs = Math.max(0, this.currentTimer.timebankMs - (elapsed - this.currentTimer.turnTimeMs));
      isTimebank = true;
    } else {
      // Regular turn time
      remainingMs = Math.max(0, this.currentTimer.turnTimeMs - elapsed);
      
      // Check if we should switch to timebank
      if (remainingMs === 0 && this.currentTimer.timebankMs > 0) {
        isTimebank = true;
        remainingMs = this.currentTimer.timebankMs;
      }
    }
    
    // Update display elements
    this.renderTime(remainingMs, isTimebank);
    
    // Continue updating if timer is active
    if (remainingMs > 0) {
      this.animationFrame = requestAnimationFrame(() => this.updateDisplay());
    } else {
      this.renderTimeout();
    }
  }

  /**
   * Render the time display
   */
  renderTime(remainingMs, isTimebank) {
    const seconds = Math.ceil(remainingMs / 1000);
    
    if (this.timerElement) {
      this.timerElement.textContent = this.formatTime(seconds);
      
      // Visual indicators based on time remaining
      this.timerElement.classList.remove('timer-normal', 'timer-warning', 'timer-critical', 'timer-timebank');
      
      if (isTimebank) {
        this.timerElement.classList.add('timer-timebank');
      } else if (seconds <= 5) {
        this.timerElement.classList.add('timer-critical');
      } else if (seconds <= 10) {
        this.timerElement.classList.add('timer-warning');
      } else {
        this.timerElement.classList.add('timer-normal');
      }
    }
    
    if (this.timebankElement) {
      const timebankSeconds = Math.ceil(this.currentTimer.timebankMs / 1000);
      this.timebankElement.textContent = `Timebank: ${this.formatTime(timebankSeconds)}`;
      this.timebankElement.style.display = timebankSeconds > 0 ? 'block' : 'none';
    }
  }

  /**
   * Format seconds for display
   */
  formatTime(seconds) {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    return `0:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Render timeout state
   */
  renderTimeout() {
    if (this.timerElement) {
      this.timerElement.textContent = 'TIME!';
      this.timerElement.classList.remove('timer-normal', 'timer-warning', 'timer-critical', 'timer-timebank');
      this.timerElement.classList.add('timer-timeout');
    }
  }

  /**
   * Stop the timer display
   */
  stopTimer() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.currentTimer = null;
    
    if (this.timerElement) {
      this.timerElement.textContent = '';
      this.timerElement.classList.remove('timer-normal', 'timer-warning', 'timer-critical', 'timer-timebank', 'timer-timeout');
    }
    
    if (this.timebankElement) {
      this.timebankElement.style.display = 'none';
    }
  }

  /**
   * Handle turn started event from server
   */
  handleTurnStarted(data) {
    const { turnStartedAt, turnTimeSeconds, timebankAvailable } = data;
    
    this.startTimer({
      started_at: turnStartedAt,
      turn_time_seconds: turnTimeSeconds,
      turn_time_remaining_ms: turnTimeSeconds * 1000,
      timebank_remaining_ms: timebankAvailable ? 60000 : 0, // Default 60s, server should provide actual
      is_using_timebank: false
    });
  }

  /**
   * Handle timebank used event from server
   */
  handleTimebankUsed(data) {
    const { millisecondsUsed, remaining } = data;
    
    if (this.currentTimer) {
      this.currentTimer.isUsingTimebank = true;
      this.currentTimer.timebankMs = remaining;
    }
  }
}

// Export for use in other scripts
window.TimerDisplay = TimerDisplay;
console.log('✅ Timer Display loaded');
