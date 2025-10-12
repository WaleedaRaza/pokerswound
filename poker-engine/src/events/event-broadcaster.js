const { GameEventType, createGameEvent } = require('./game-events');

/**
 * EventBroadcaster - Wraps Socket.IO to emit structured game events
 * 
 * Design Philosophy:
 * - Backend emits WHAT happened (facts)
 * - Frontend decides WHEN/HOW to display it
 * - All events are ordered, immutable, and replayable
 * 
 * This solves the race condition problem by:
 * 1. Emitting events in strict order
 * 2. Not managing display state (frontend's job)
 * 3. Providing atomic, granular events
 */
class EventBroadcaster {
  constructor(io) {
    this.io = io;
    this.eventLog = new Map(); // gameId -> event[] (for debugging/replay)
  }

  /**
   * Core broadcast method - all events go through here
   */
  broadcast(roomId, event) {
    if (!this.io || !roomId) {
      console.warn('⚠️  Cannot broadcast - io or roomId missing');
      return;
    }

    console.log(`📡 Broadcasting: ${event.type} to room:${roomId}`);
    
    // Emit to all clients in the room
    this.io.to(`room:${roomId}`).emit('game_event', event);
    
    // Store in event log (optional, for debugging/replay)
    if (event.metadata.gameId) {
      if (!this.eventLog.has(event.metadata.gameId)) {
        this.eventLog.set(event.metadata.gameId, []);
      }
      this.eventLog.get(event.metadata.gameId).push(event);
    }
  }

  /**
   * Broadcast multiple events in sequence
   */
  broadcastSequence(roomId, events) {
    events.forEach(event => this.broadcast(roomId, event));
  }

  // ==========================================
  // HIGH-LEVEL EVENT EMITTERS
  // ==========================================

  /**
   * Hand lifecycle events
   */
  emitHandStarted(roomId, gameId, handNumber, players, blinds) {
    const event = createGameEvent(
      GameEventType.HAND_STARTED,
      {
        handNumber,
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          stack: p.stack,
          seatIndex: p.seatIndex,
          userId: p.userId
        })),
        smallBlind: blinds.small,
        bigBlind: blinds.big
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  emitHandEnded(roomId, gameId, handNumber) {
    const event = createGameEvent(
      GameEventType.HAND_ENDED,
      { handNumber },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  /**
   * Player action events
   */
  emitPlayerAction(roomId, gameId, playerId, playerName, actionType, amount = null) {
    const eventTypeMap = {
      'FOLD': GameEventType.PLAYER_FOLDED,
      'CHECK': GameEventType.PLAYER_CHECKED,
      'CALL': GameEventType.PLAYER_CALLED,
      'RAISE': GameEventType.PLAYER_RAISED,
      'BET': GameEventType.PLAYER_BET,
      'ALL_IN': GameEventType.PLAYER_WENT_ALL_IN
    };

    const event = createGameEvent(
      eventTypeMap[actionType] || GameEventType.PLAYER_BET,
      {
        playerId,
        playerName,
        action: actionType,
        amount
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  /**
   * Chips movement events (CRITICAL FOR YOUR BUG FIX)
   */
  emitChipsCommittedToPot(roomId, gameId, playerId, playerName, amount, newStack, newPot) {
    const event = createGameEvent(
      GameEventType.CHIPS_COMMITTED_TO_POT,
      {
        playerId,
        playerName,
        amount,
        newStack,      // Player's stack AFTER committing chips
        newPot         // Total pot AFTER receiving chips
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  emitChipsTransferredToWinner(roomId, gameId, winnerId, winnerName, amount, newStack) {
    const event = createGameEvent(
      GameEventType.CHIPS_TRANSFERRED_TO_WINNER,
      {
        winnerId,
        winnerName,
        amount,        // Amount being transferred
        newStack       // Winner's stack AFTER receiving chips
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  /**
   * Street reveal events (PROGRESSIVE ANIMATION)
   */
  emitFlopRevealed(roomId, gameId, cards, pot) {
    const event = createGameEvent(
      GameEventType.FLOP_REVEALED,
      {
        street: 'FLOP',
        cards,         // Array of 3 card strings: ['Ah', 'Kd', '3s']
        pot
      },
      { gameId, roomId, animated: true }
    );
    this.broadcast(roomId, event);
  }

  emitTurnRevealed(roomId, gameId, card, allCards, pot) {
    const event = createGameEvent(
      GameEventType.TURN_REVEALED,
      {
        street: 'TURN',
        card,          // Single card: 'Js'
        allCards,      // All 4 cards so far
        pot
      },
      { gameId, roomId, animated: true }
    );
    this.broadcast(roomId, event);
  }

  emitRiverRevealed(roomId, gameId, card, allCards, pot) {
    const event = createGameEvent(
      GameEventType.RIVER_REVEALED,
      {
        street: 'RIVER',
        card,          // Single card: '2c'
        allCards,      // All 5 cards
        pot
      },
      { gameId, roomId, animated: true }
    );
    this.broadcast(roomId, event);
  }

  /**
   * All-in runout events (YOUR KEY USE CASE)
   */
  emitAllInRunoutStarted(roomId, gameId, streetsToReveal, potAmount, playersAllIn) {
    const event = createGameEvent(
      GameEventType.ALL_IN_RUNOUT_STARTED,
      {
        streetsToReveal,  // ['TURN', 'RIVER'] or just ['RIVER']
        potAmount,
        playersAllIn: playersAllIn.map(p => ({
          id: p.id,
          name: p.name,
          stack: 0  // Important: show 0 during runout
        }))
      },
      { gameId, roomId, animated: true }
    );
    this.broadcast(roomId, event);
  }

  /**
   * Winner determination events
   */
  emitWinnerDetermined(roomId, gameId, winners) {
    const event = createGameEvent(
      GameEventType.WINNER_DETERMINED,
      {
        winners: winners.map(w => ({
          playerId: w.playerId,
          playerName: w.playerName || w.name,
          amount: w.amount,
          handRank: w.handRank
        }))
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  emitPotAwarded(roomId, gameId, winnerId, winnerName, amount, potType = 'main') {
    const event = createGameEvent(
      GameEventType.POT_AWARDED,
      {
        winnerId,
        winnerName,
        amount,
        potType
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  /**
   * Turn management
   */
  emitTurnStarted(roomId, gameId, playerId, playerName, timeRemaining = 30) {
    const event = createGameEvent(
      GameEventType.TURN_STARTED,
      {
        playerId,
        playerName,
        timeRemaining
      },
      { gameId, roomId }
    );
    this.broadcast(roomId, event);
  }

  // ==========================================
  // COMPOSITE EVENTS FOR COMPLEX SCENARIOS
  // ==========================================

  /**
   * Broadcast complete all-in runout sequence
   * This is the key method that replaces your brittle animation logic
   */
  broadcastAllInRunout(roomId, gameId, streetEvents, winners, potAmount, allInPlayersData) {
    const events = [];

    console.log(`🎬 Building all-in runout event sequence...`);

    // 1. Signal that runout is starting (frontend enters animation mode)
    events.push(createGameEvent(
      GameEventType.ALL_IN_RUNOUT_STARTED,
      {
        streetsToReveal: streetEvents.map(se => se.data.street),
        potAmount,
        playersAllIn: allInPlayersData
      },
      { gameId, roomId, animated: true }
    ));

    // 2. Add street reveal events (one per street)
    streetEvents.forEach(se => {
      const street = se.data.street;
      const cards = se.data.communityCards;
      
      if (street === 'FLOP') {
        events.push(createGameEvent(
          GameEventType.FLOP_REVEALED, 
          { street, cards, pot: potAmount },
          { gameId, roomId, animated: true }
        ));
      } else if (street === 'TURN') {
        events.push(createGameEvent(
          GameEventType.TURN_REVEALED,
          { street, card: cards[cards.length - 1], allCards: cards, pot: potAmount },
          { gameId, roomId, animated: true }
        ));
      } else if (street === 'RIVER') {
        events.push(createGameEvent(
          GameEventType.RIVER_REVEALED,
          { street, card: cards[cards.length - 1], allCards: cards, pot: potAmount },
          { gameId, roomId, animated: true }
        ));
      }
    });

    // 3. Winner determination
    events.push(createGameEvent(
      GameEventType.WINNER_DETERMINED,
      { winners },
      { gameId, roomId }
    ));

    // 4. Pot awarded (fact: winner won the pot)
    winners.forEach(winner => {
      events.push(createGameEvent(
        GameEventType.POT_AWARDED,
        {
          winnerId: winner.playerId,
          winnerName: winner.playerName || winner.name,
          amount: winner.amount
        },
        { gameId, roomId }
      ));
    });

    // 5. Chips transferred to winner (this is when stack updates)
    winners.forEach(winner => {
      events.push(createGameEvent(
        GameEventType.CHIPS_TRANSFERRED_TO_WINNER,
        {
          winnerId: winner.playerId,
          winnerName: winner.playerName || winner.name,
          amount: winner.amount,
          newStack: winner.newStack  // Stack AFTER receiving pot
        },
        { gameId, roomId }
      ));
    });

    // 6. Hand ended (cleanup)
    events.push(createGameEvent(
      GameEventType.HAND_ENDED,
      { handNumber: null }, // Can add handNumber if available
      { gameId, roomId }
    ));

    console.log(`  📦 Built ${events.length} events for all-in runout`);
    
    // Broadcast all events in order
    this.broadcastSequence(roomId, events);
    
    return events;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get event log for a game (for debugging/replay)
   */
  getEventLog(gameId) {
    return this.eventLog.get(gameId) || [];
  }

  /**
   * Clear event log for a game
   */
  clearEventLog(gameId) {
    this.eventLog.delete(gameId);
  }

  /**
   * Replay events (for debugging or spectator catch-up)
   */
  replayEvents(roomId, gameId) {
    const events = this.getEventLog(gameId);
    if (events.length === 0) {
      console.warn(`No events to replay for game ${gameId}`);
      return;
    }
    console.log(`♻️  Replaying ${events.length} events for game ${gameId}`);
    this.broadcastSequence(roomId, events);
  }
}

module.exports = EventBroadcaster;

