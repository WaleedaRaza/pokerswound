/**
 * PokerTableV2 - Premium poker table experience
 * Integrates with all our backend systems
 */

class PokerTableV2 {
  constructor() {
    // Core systems
    this.socket = null;
    this.sequenceTracker = null;
    this.timerDisplay = null;
    
    // Game state
    this.roomId = null;
    this.gameId = null;
    this.userId = null;
    this.isHost = false;
    this.mySeatIndex = null;
    
    // UI elements
    this.elements = {};
    
    // Current state
    this.gameState = null;
    this.seats = new Array(9).fill(null);
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    
    console.log('🎰 PokerTableV2 initialized');
  }

  /**
   * Initialize the poker table
   */
  async init() {
    try {
      // Get room ID from URL
      this.roomId = this.getRoomIdFromURL();
      if (!this.roomId) {
        console.error('No room ID found');
        window.location.href = '/play.html';
        return;
      }
      
      // Initialize auth
      this.userId = await this.initializeAuth();
      if (!this.userId) {
        console.error('Not authenticated');
        window.location.href = '/';
        return;
      }
      
      // Cache DOM elements
      this.cacheElements();
      
      // Initialize subsystems
      this.initializeTimerDisplay();
      this.initializeSocketConnection();
      this.initializeEventListeners();
      
      // Perform hydration
      await this.hydrateGameState();
      
      console.log('✅ Poker table initialized successfully');
    } catch (error) {
      console.error('Failed to initialize poker table:', error);
    }
  }

  /**
   * Get room ID from URL
   */
  getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || urlParams.get('roomId');
  }

  /**
   * Initialize authentication
   */
  async initializeAuth() {
    // Check if we have a user in sessionStorage
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
    
    // Try to get from Supabase
    if (window.supabase) {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (user) {
        return user.id;
      }
    }
    
    return null;
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    // Header elements
    this.elements.roomCode = document.getElementById('roomCode');
    this.elements.gameStatus = document.getElementById('gameStatus');
    this.elements.blindValues = document.getElementById('blindValues');
    this.elements.handNumber = document.getElementById('handNumber');
    
    // Table elements
    this.elements.communityCards = document.getElementById('communityCards');
    this.elements.potDisplay = document.querySelector('.pot-amount');
    this.elements.dealerButton = document.getElementById('dealerButton');
    
    // Action panel
    this.elements.actionPanel = document.getElementById('actionPanel');
    this.elements.betSlider = document.getElementById('betSlider');
    this.elements.betInput = document.getElementById('betInput');
    this.elements.foldBtn = document.getElementById('foldBtn');
    this.elements.callBtn = document.getElementById('callBtn');
    this.elements.raiseBtn = document.getElementById('raiseBtn');
    
    // Quick bet buttons
    this.elements.quickBets = document.querySelectorAll('.quick-bet');
    
    // Auto actions
    this.elements.autoFold = document.getElementById('autoFold');
    this.elements.autoCheck = document.getElementById('autoCheck');
    this.elements.autoCall = document.getElementById('autoCall');
    
    // Seats
    this.elements.seats = [];
    for (let i = 0; i < 9; i++) {
      this.elements.seats[i] = document.querySelector(`.seat-${i}`);
    }
  }

  /**
   * Initialize timer display
   */
  initializeTimerDisplay() {
    this.timerDisplay = new TimerDisplay();
    // Timer display will be integrated per-seat
  }

  /**
   * Initialize WebSocket connection
   */
  initializeSocketConnection() {
    this.sequenceTracker = new SequenceTracker();
    
    this.socket = io({
      query: {
        roomId: this.roomId,
        userId: this.userId
      }
    });
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.socket.emit('authenticate', {
        roomId: this.roomId,
        userId: this.userId,
        rejoinToken: sessionStorage.getItem('rejoinToken')
      });
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.updateGameStatus('Disconnected - Reconnecting...');
    });
    
    // Authentication
    this.socket.on('authenticated', (data) => {
      console.log('🔐 Authenticated:', data);
    });
    
    // State sync
    this.socket.on('state_sync', this.sequenceTracker.createHandler((data) => {
      console.log('🔄 State sync received:', data);
      if (data.payload?.fetchViaHttp) {
        // Already hydrated via HTTP
        console.log('State already hydrated via HTTP');
      }
    }));
    
    // Game events
    this.socket.on('game_state_update', this.sequenceTracker.createHandler((data) => {
      this.handleGameStateUpdate(data);
    }));
    
    this.socket.on('hand_started', this.sequenceTracker.createHandler((data) => {
      this.handleHandStarted(data);
    }));
    
    this.socket.on('turn_started', this.sequenceTracker.createHandler((data) => {
      this.handleTurnStarted(data);
    }));
    
    this.socket.on('turn_timeout', this.sequenceTracker.createHandler((data) => {
      this.handleTurnTimeout(data);
    }));
    
    this.socket.on('timebank_used', this.sequenceTracker.createHandler((data) => {
      this.handleTimebankUsed(data);
    }));
    
    this.socket.on('player_action', this.sequenceTracker.createHandler((data) => {
      this.handlePlayerAction(data);
    }));
    
    this.socket.on('hand_completed', this.sequenceTracker.createHandler((data) => {
      this.handleHandCompleted(data);
    }));
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Action buttons
    this.elements.foldBtn.addEventListener('click', () => this.handleAction('FOLD', 0));
    this.elements.callBtn.addEventListener('click', () => this.handleAction('CALL', this.currentBet));
    this.elements.raiseBtn.addEventListener('click', () => this.handleAction('RAISE', parseInt(this.elements.betInput.value)));
    
    // Bet slider
    this.elements.betSlider.addEventListener('input', (e) => {
      this.elements.betInput.value = e.target.value;
      this.updateRaiseButton(e.target.value);
    });
    
    this.elements.betInput.addEventListener('input', (e) => {
      this.elements.betSlider.value = e.target.value;
      this.updateRaiseButton(e.target.value);
    });
    
    // Quick bets
    this.elements.quickBets.forEach(btn => {
      btn.addEventListener('click', () => {
        const multiplier = parseFloat(btn.dataset.amount);
        const amount = Math.floor(this.pot * multiplier);
        this.elements.betInput.value = amount;
        this.elements.betSlider.value = amount;
        this.updateRaiseButton(amount);
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.isMyTurn()) return;
      
      switch(e.key.toLowerCase()) {
        case 'f':
          this.elements.foldBtn.click();
          break;
        case 'c':
          this.elements.callBtn.click();
          break;
        case 'r':
          this.elements.raiseBtn.click();
          break;
      }
    });
  }

  /**
   * Hydrate game state from server
   */
  async hydrateGameState() {
    try {
      console.log('🌊 Hydrating game state...');
      
      const response = await fetch(`/api/rooms/${this.roomId}/hydrate?userId=${this.userId}`);
      if (!response.ok) {
        throw new Error('Failed to hydrate');
      }
      
      const hydration = await response.json();
      console.log('🌊 Hydration data:', hydration);
      
      // Update sequence tracker
      if (this.sequenceTracker && hydration.seq) {
        this.sequenceTracker.currentSeq = hydration.seq;
      }
      
      // Update room info
      this.updateRoomInfo(hydration.room);
      
      // Update game state
      if (hydration.game) {
        this.gameId = hydration.game.id;
        this.gameState = hydration.game.state;
        this.updateGameStatus('In Progress');
      } else {
        this.updateGameStatus('Waiting to Start');
      }
      
      // Update hand info
      if (hydration.hand) {
        this.updateHandInfo(hydration.hand);
        this.updateCommunityCards(hydration.hand.board || []);
        this.updatePot(hydration.hand.pot_total || 0);
        
        // Start timer if active
        if (hydration.hand.timer) {
          this.handleTimerData(hydration.hand.timer, hydration.hand.actor_seat);
        }
      }
      
      // Update seats
      this.updateSeats(hydration.seats);
      
      // Update my info
      if (hydration.me) {
        this.mySeatIndex = hydration.me.seat_index;
        if (hydration.me.hole_cards) {
          this.updateMyCards(hydration.me.hole_cards);
        }
        if (hydration.me.rejoin_token) {
          sessionStorage.setItem('rejoinToken', hydration.me.rejoin_token);
        }
      }
      
      // Show action panel if it's my turn
      if (hydration.hand?.actor_seat === this.mySeatIndex) {
        this.showActionPanel(hydration.hand.current_bet || 0);
      }
      
      console.log('✅ Hydration complete');
    } catch (error) {
      console.error('Hydration failed:', error);
      this.updateGameStatus('Error - Please refresh');
    }
  }

  /**
   * Update room information
   */
  updateRoomInfo(room) {
    this.isHost = room.host_id === this.userId;
    this.elements.roomCode.textContent = `Room: ${room.code}`;
    this.elements.blindValues.textContent = `$${room.small_blind}/$${room.big_blind}`;
  }

  /**
   * Update game status display
   */
  updateGameStatus(status) {
    this.elements.gameStatus.textContent = status;
    this.elements.gameStatus.className = 'game-status';
    
    if (status.includes('Progress')) {
      this.elements.gameStatus.classList.add('in-progress');
    } else if (status.includes('Error') || status.includes('Disconnected')) {
      this.elements.gameStatus.classList.add('error');
    }
  }

  /**
   * Update hand information
   */
  updateHandInfo(hand) {
    this.elements.handNumber.textContent = `#${hand.number || 1}`;
  }

  /**
   * Update community cards
   */
  updateCommunityCards(cards) {
    this.communityCards = cards;
    this.elements.communityCards.innerHTML = '';
    
    cards.forEach((card, index) => {
      const cardEl = this.createCardElement(card);
      cardEl.style.animationDelay = `${index * 100}ms`;
      this.elements.communityCards.appendChild(cardEl);
    });
  }

  /**
   * Create card element
   */
  createCardElement(cardStr) {
    const card = document.createElement('div');
    card.className = 'card';
    
    if (!cardStr || cardStr === 'XX') {
      card.classList.add('card-back');
      return card;
    }
    
    const rank = cardStr[0];
    const suit = cardStr[1];
    
    // Add suit class for color
    switch(suit) {
      case 'h': 
        card.classList.add('hearts');
        card.innerHTML = `${rank}<br>♥`;
        break;
      case 'd': 
        card.classList.add('diamonds');
        card.innerHTML = `${rank}<br>♦`;
        break;
      case 'c': 
        card.classList.add('clubs');
        card.innerHTML = `${rank}<br>♣`;
        break;
      case 's': 
        card.classList.add('spades');
        card.innerHTML = `${rank}<br>♠`;
        break;
    }
    
    return card;
  }

  /**
   * Update pot display
   */
  updatePot(amount) {
    this.pot = amount;
    this.elements.potDisplay.textContent = `$${amount}`;
  }

  /**
   * Update seats display
   */
  updateSeats(seats) {
    seats.forEach((seat, index) => {
      const seatEl = this.elements.seats[index];
      if (!seatEl) return;
      
      const content = seatEl.querySelector('.seat-content');
      
      if (!seat) {
        // Empty seat
        seatEl.classList.remove('occupied', 'active', 'folded');
        content.querySelector('.player-name').textContent = 'Empty Seat';
        content.querySelector('.player-stack').textContent = 'Click to sit';
        content.querySelector('.player-cards').style.display = 'none';
        content.querySelector('.player-bet').classList.remove('show');
      } else {
        // Occupied seat
        seatEl.classList.add('occupied');
        
        // Update player info
        content.querySelector('.player-name').textContent = seat.username || `Player ${seat.user_id}`;
        content.querySelector('.player-stack').textContent = `$${seat.stack || seat.chips_in_play || 0}`;
        
        // Update status
        if (seat.has_folded) {
          seatEl.classList.add('folded');
        } else {
          seatEl.classList.remove('folded');
        }
        
        // Update bet
        if (seat.current_bet > 0) {
          const betEl = content.querySelector('.player-bet');
          betEl.querySelector('.bet-amount').textContent = `$${seat.current_bet}`;
          betEl.classList.add('show');
        }
        
        // Highlight my seat
        if (seat.user_id === this.userId) {
          seatEl.classList.add('my-seat');
        }
      }
    });
  }

  /**
   * Update my hole cards
   */
  updateMyCards(cards) {
    if (this.mySeatIndex === null) return;
    
    const seatEl = this.elements.seats[this.mySeatIndex];
    const cardsContainer = seatEl.querySelector('.player-cards');
    cardsContainer.style.display = 'flex';
    cardsContainer.innerHTML = '';
    
    cards.forEach(card => {
      cardsContainer.appendChild(this.createCardElement(card));
    });
  }

  /**
   * Handle timer data
   */
  handleTimerData(timerData, actorSeat) {
    if (actorSeat === null || actorSeat === undefined) return;
    
    // Clear all seat timers
    this.elements.seats.forEach(seat => {
      seat.classList.remove('to-act');
    });
    
    // Show timer on actor seat
    const seatEl = this.elements.seats[actorSeat];
    if (seatEl) {
      seatEl.classList.add('active', 'to-act');
      
      // Start timer display
      this.timerDisplay.startTimer(timerData);
    }
  }

  /**
   * Show action panel
   */
  showActionPanel(currentBet) {
    this.currentBet = currentBet;
    
    // Update call amount
    const callAmount = currentBet;
    this.elements.callBtn.querySelector('.btn-amount').textContent = callAmount > 0 ? `$${callAmount}` : '';
    this.elements.callBtn.querySelector('.btn-text').textContent = callAmount > 0 ? 'CALL' : 'CHECK';
    
    // Update bet limits
    const minRaise = currentBet * 2;
    const maxRaise = this.getMyStack();
    this.elements.betSlider.min = minRaise;
    this.elements.betSlider.max = maxRaise;
    this.elements.betSlider.value = minRaise;
    this.elements.betInput.value = minRaise;
    
    // Show panel
    this.elements.actionPanel.classList.add('show');
  }

  /**
   * Hide action panel
   */
  hideActionPanel() {
    this.elements.actionPanel.classList.remove('show');
  }

  /**
   * Get my stack
   */
  getMyStack() {
    if (this.mySeatIndex === null) return 0;
    const mySeat = this.seats[this.mySeatIndex];
    return mySeat?.stack || 0;
  }

  /**
   * Check if it's my turn
   */
  isMyTurn() {
    return this.elements.actionPanel.classList.contains('show');
  }

  /**
   * Handle player action
   */
  async handleAction(actionType, amount) {
    try {
      this.hideActionPanel();
      
      const response = await fetch(`/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${actionType}-${Date.now()}`
        },
        body: JSON.stringify({
          player_id: this.userId,
          action: actionType,
          amount: amount || 0
        })
      });
      
      if (!response.ok) {
        throw new Error('Action failed');
      }
      
      console.log(`✅ Action ${actionType} sent successfully`);
    } catch (error) {
      console.error('Action failed:', error);
      this.showActionPanel(this.currentBet); // Re-show panel
    }
  }

  /**
   * Update raise button
   */
  updateRaiseButton(amount) {
    this.elements.raiseBtn.querySelector('.btn-amount').textContent = `$${amount}`;
  }

  /**
   * Handle game state update
   */
  handleGameStateUpdate(data) {
    console.log('📊 Game state update:', data);
    // Update game state based on event
  }

  /**
   * Handle hand started
   */
  handleHandStarted(data) {
    console.log('🎴 Hand started:', data);
    this.updateHandInfo({ number: data.handNumber });
    this.hideActionPanel();
    // Deal cards animation
  }

  /**
   * Handle turn started
   */
  handleTurnStarted(data) {
    console.log('⏱️ Turn started:', data);
    const { playerId, turnStartedAt, turnTimeSeconds, timebankAvailable } = data;
    
    // Find player's seat
    const seatIndex = this.seats.findIndex(seat => seat?.user_id === playerId);
    if (seatIndex !== -1) {
      this.handleTimerData({
        started_at: turnStartedAt,
        turn_time_seconds: turnTimeSeconds,
        timebank_remaining_ms: timebankAvailable ? 60000 : 0
      }, seatIndex);
      
      // Show action panel if it's me
      if (playerId === this.userId) {
        this.showActionPanel(this.currentBet);
      }
    }
  }

  /**
   * Handle turn timeout
   */
  handleTurnTimeout(data) {
    console.log('⏰ Turn timeout:', data);
    const { playerId, action } = data;
    
    // Find player's seat
    const seatIndex = this.seats.findIndex(seat => seat?.user_id === playerId);
    if (seatIndex !== -1) {
      this.elements.seats[seatIndex].classList.add('folded');
    }
    
    // Hide action panel if it was me
    if (playerId === this.userId) {
      this.hideActionPanel();
    }
  }

  /**
   * Handle timebank used
   */
  handleTimebankUsed(data) {
    console.log('⏱️ Timebank used:', data);
    this.timerDisplay.handleTimebankUsed(data);
  }

  /**
   * Handle player action
   */
  handlePlayerAction(data) {
    console.log('🎯 Player action:', data);
    const { playerId, action, amount } = data;
    
    // Update UI based on action
    // TODO: Add action animations
  }

  /**
   * Handle hand completed
   */
  handleHandCompleted(data) {
    console.log('🏆 Hand completed:', data);
    this.hideActionPanel();
    this.timerDisplay.stopTimer();
    
    // Show winner animation
    // TODO: Add winner celebration
  }
}

// Make it available globally
window.PokerTableV2 = PokerTableV2;
