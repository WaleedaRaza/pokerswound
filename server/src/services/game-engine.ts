import { 
  GameState, 
  GamePhase, 
  GameStatus, 
  Player, 
  PlayerAction, 
  PlayerActionRequest,
  GameSettings,
  HandHistory,
  GameAction as GameActionType,
  ProvableFairnessData
} from '@poker-app/shared';
import { evaluateHand, determineWinners } from '@poker-app/shared';
import { SecureShuffler } from '../shuffling/secure-shuffler';
import { 
  DEFAULT_SMALL_BLIND, 
  DEFAULT_BIG_BLIND, 
  DEFAULT_STARTING_CHIPS,
  MIN_PLAYERS 
} from '@poker-app/shared';

export class GameEngine {
  private state: GameState;
  private settings: GameSettings;

  constructor(roomId: string, settings: Partial<GameSettings> = {}) {
    this.settings = {
      smallBlind: DEFAULT_SMALL_BLIND,
      bigBlind: DEFAULT_BIG_BLIND,
      maxPlayers: 9,
      minPlayers: MIN_PLAYERS,
      timeBank: 30,
      enableProvableFairness: false,
      ...settings
    };

    this.state = {
      id: roomId,
      phase: 'waiting',
      status: 'waiting',
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerIndex: 0,
      currentPlayerIndex: 0,
      smallBlind: this.settings.smallBlind,
      bigBlind: this.settings.bigBlind,
      deck: [],
      winners: [],
      handHistory: [],
      roundNumber: 1
    };
  }

  /**
   * Adds a player to the game
   */
  addPlayer(player: Omit<Player, 'hand' | 'bet' | 'status' | 'isDealer' | 'isSmallBlind' | 'isBigBlind' | 'isCurrentTurn' | 'connected'>): void {
    const gamePlayer: Player = {
      ...player,
      hand: [],
      bet: 0,
      status: 'waiting',
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isCurrentTurn: false,
      connected: true
    };

    this.state.players.push(gamePlayer);
  }

  /**
   * Removes a player from the game
   */
  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
  }

  /**
   * Starts a new game round
   */
  startNewRound(clientSeed?: string): void {
    if (this.state.players.length < this.settings.minPlayers) {
      throw new Error(`Need at least ${this.settings.minPlayers} players to start`);
    }

    // Reset game state
    this.state.phase = 'preflop';
    this.state.status = 'playing';
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.currentBet = 0;
    this.state.winners = [];

    // Create and shuffle deck
    const shuffleResult = SecureShuffler.createAndShuffleDeck(
      this.settings.enableProvableFairness ? clientSeed : undefined
    );
    this.state.deck = shuffleResult.deck;
    
    if (shuffleResult.provableFairness) {
      this.state.provableFairness = shuffleResult.provableFairness;
    }

    // Reset player states
    this.state.players.forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.status = 'playing';
      player.isCurrentTurn = false;
      player.lastAction = undefined;
      player.lastActionAmount = undefined;
    });

    // Deal cards
    this.dealHoleCards();

    // Set blinds and dealer
    this.setBlinds();

    // Set first player to act
    this.setNextPlayer();
  }

  /**
   * Deals hole cards to all players
   */
  private dealHoleCards(): void {
    const activePlayers = this.state.players.filter(p => p.status === 'playing');
    
    for (const player of activePlayers) {
      const { cards, remainingDeck } = this.dealCards(2);
      player.hand = cards;
      this.state.deck = remainingDeck;
    }
  }

  /**
   * Sets small and big blinds
   */
  private setBlinds(): void {
    const activePlayers = this.state.players.filter(p => p.status === 'playing');
    
    // Reset all blind flags
    this.state.players.forEach(p => {
      p.isDealer = false;
      p.isSmallBlind = false;
      p.isBigBlind = false;
    });

    if (activePlayers.length >= 2) {
      // Set dealer (first player)
      activePlayers[0].isDealer = true;
      
      // Set small blind (second player)
      activePlayers[1].isSmallBlind = true;
      activePlayers[1].bet = this.state.smallBlind;
      activePlayers[1].chips -= this.state.smallBlind;
      this.state.pot += this.state.smallBlind;
      
      // Set big blind (third player, or first if only 2 players)
      const bigBlindIndex = activePlayers.length >= 3 ? 2 : 0;
      activePlayers[bigBlindIndex].isBigBlind = true;
      activePlayers[bigBlindIndex].bet = this.state.bigBlind;
      activePlayers[bigBlindIndex].chips -= this.state.bigBlind;
      this.state.pot += this.state.bigBlind;
      this.state.currentBet = this.state.bigBlind;
    }
  }

  /**
   * Deals a specified number of cards from the deck
   */
  private dealCards(count: number): { cards: any[]; remainingDeck: any[] } {
    if (count > this.state.deck.length) {
      throw new Error(`Cannot deal ${count} cards from deck with ${this.state.deck.length} cards`);
    }
    
    const cards = this.state.deck.slice(0, count);
    const remainingDeck = this.state.deck.slice(count);
    
    return { cards, remainingDeck };
  }

  /**
   * Processes a player action
   */
  processAction(actionRequest: PlayerActionRequest): { success: boolean; message?: string } {
    const player = this.state.players.find(p => p.id === actionRequest.playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (!player.isCurrentTurn) {
      return { success: false, message: 'Not your turn' };
    }

    if (player.status !== 'playing') {
      return { success: false, message: 'Player is not active' };
    }

    const action = actionRequest.action;
    const amount = actionRequest.amount || 0;

    switch (action) {
      case 'fold':
        return this.handleFold(player);
      case 'check':
        return this.handleCheck(player);
      case 'call':
        return this.handleCall(player);
      case 'raise':
        return this.handleRaise(player, amount);
      case 'all-in':
        return this.handleAllIn(player);
      default:
        return { success: false, message: 'Invalid action' };
    }
  }

  /**
   * Handles fold action
   */
  private handleFold(player: Player): { success: boolean; message?: string } {
    player.status = 'folded';
    player.lastAction = 'fold';
    this.setNextPlayer();
    return { success: true };
  }

  /**
   * Handles check action
   */
  private handleCheck(player: Player): { success: boolean; message?: string } {
    if (player.bet < this.state.currentBet) {
      return { success: false, message: 'Cannot check when there is a bet to call' };
    }
    
    player.lastAction = 'check';
    this.setNextPlayer();
    return { success: true };
  }

  /**
   * Handles call action
   */
  private handleCall(player: Player): { success: boolean; message?: string } {
    const callAmount = this.state.currentBet - player.bet;
    
    if (callAmount > player.chips) {
      return { success: false, message: 'Not enough chips to call' };
    }
    
    player.chips -= callAmount;
    player.bet = this.state.currentBet;
    player.lastAction = 'call';
    player.lastActionAmount = callAmount;
    this.state.pot += callAmount;
    
    this.setNextPlayer();
    return { success: true };
  }

  /**
   * Handles raise action
   */
  private handleRaise(player: Player, amount: number): { success: boolean; message?: string } {
    const totalBet = player.bet + amount;
    
    if (totalBet <= this.state.currentBet) {
      return { success: false, message: 'Raise must be higher than current bet' };
    }
    
    if (amount > player.chips) {
      return { success: false, message: 'Not enough chips to raise' };
    }
    
    player.chips -= amount;
    player.bet = totalBet;
    player.lastAction = 'raise';
    player.lastActionAmount = amount;
    this.state.currentBet = totalBet;
    this.state.pot += amount;
    
    this.setNextPlayer();
    return { success: true };
  }

  /**
   * Handles all-in action
   */
  private handleAllIn(player: Player): { success: boolean; message?: string } {
    const allInAmount = player.chips;
    
    player.chips = 0;
    player.bet += allInAmount;
    player.status = 'all-in';
    player.lastAction = 'all-in';
    player.lastActionAmount = allInAmount;
    this.state.pot += allInAmount;
    
    if (player.bet > this.state.currentBet) {
      this.state.currentBet = player.bet;
    }
    
    this.setNextPlayer();
    return { success: true };
  }

  /**
   * Sets the next player to act
   */
  private setNextPlayer(): void {
    const activePlayers = this.state.players.filter(p => 
      p.status === 'playing' || p.status === 'all-in'
    );
    
    if (activePlayers.length <= 1) {
      this.endHand();
      return;
    }

    // Find current player index
    let currentIndex = activePlayers.findIndex(p => p.isCurrentTurn);
    
    // Reset current turn flag
    activePlayers.forEach(p => p.isCurrentTurn = false);
    
    // Find next player
    let nextIndex = (currentIndex + 1) % activePlayers.length;
    let rounds = 0;
    
    // Skip players who have folded or are all-in
    while (rounds < activePlayers.length) {
      const nextPlayer = activePlayers[nextIndex];
      if (nextPlayer.status === 'playing') {
        nextPlayer.isCurrentTurn = true;
        break;
      }
      nextIndex = (nextIndex + 1) % activePlayers.length;
      rounds++;
    }
    
    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advancePhase();
    }
  }

  /**
   * Checks if the current betting round is complete
   */
  private isBettingRoundComplete(): boolean {
    const activePlayers = this.state.players.filter(p => 
      p.status === 'playing' || p.status === 'all-in'
    );
    
    if (activePlayers.length <= 1) return true;
    
    // All players have acted and bets are equal
    const allBetsEqual = activePlayers.every(p => p.bet === this.state.currentBet);
    const allPlayersActed = activePlayers.every(p => 
      p.lastAction || p.status === 'all-in'
    );
    
    return allBetsEqual && allPlayersActed;
  }

  /**
   * Advances the game phase
   */
  private advancePhase(): void {
    switch (this.state.phase) {
      case 'preflop':
        this.state.phase = 'flop';
        this.dealCommunityCards(3);
        break;
      case 'flop':
        this.state.phase = 'turn';
        this.dealCommunityCards(1);
        break;
      case 'turn':
        this.state.phase = 'river';
        this.dealCommunityCards(1);
        break;
      case 'river':
        this.state.phase = 'showdown';
        this.determineWinner();
        break;
    }
    
    // Reset betting for new phase
    this.state.currentBet = 0;
    this.state.players.forEach(p => {
      p.bet = 0;
      p.lastAction = undefined;
      p.lastActionAmount = undefined;
    });
    
    // Set first player to act in new phase
    this.setNextPlayer();
  }

  /**
   * Deals community cards
   */
  private dealCommunityCards(count: number): void {
    const { cards, remainingDeck } = this.dealCards(count);
    this.state.communityCards.push(...cards);
    this.state.deck = remainingDeck;
  }

  /**
   * Determines the winner of the hand
   */
  private determineWinner(): void {
    const activePlayers = this.state.players.filter(p => 
      p.status === 'playing' || p.status === 'all-in'
    );
    
    if (activePlayers.length === 1) {
      // Only one player left
      this.state.winners = [activePlayers[0]];
    } else {
      // Evaluate hands
      const playerHands = activePlayers.map(player => ({
        id: player.id,
        hand: evaluateHand(player.hand, this.state.communityCards)
      }));
      
      const winnerIds = determineWinners(playerHands);
      this.state.winners = activePlayers.filter(p => winnerIds.includes(p.id));
    }
    
    // Award pot to winners
    const winAmount = Math.floor(this.state.pot / this.state.winners.length);
    this.state.winners.forEach(winner => {
      winner.chips += winAmount;
    });
    
    // Record hand history
    this.recordHandHistory();
    
    // End the hand
    this.endHand();
  }

  /**
   * Records the hand history
   */
  private recordHandHistory(): void {
    const actions: GameActionType[] = this.state.players
      .filter(p => p.lastAction)
      .map(p => ({
        playerId: p.id,
        action: p.lastAction!,
        amount: p.lastActionAmount,
        timestamp: Date.now()
      }));
    
    const handHistory: HandHistory = {
      roundNumber: this.state.roundNumber,
      winners: this.state.winners,
      winningHand: this.state.winners.length > 0 
        ? evaluateHand(this.state.winners[0].hand, this.state.communityCards)
        : { cards: [], rank: 'high-card', value: 0 },
      pot: this.state.pot,
      actions
    };
    
    this.state.handHistory.push(handHistory);
  }

  /**
   * Ends the current hand
   */
  private endHand(): void {
    this.state.phase = 'finished';
    this.state.status = 'finished';
    
    // Reveal provable fairness if enabled
    if (this.state.provableFairness) {
      this.state.provableFairness.revealed = true;
    }
  }

  /**
   * Gets the current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Gets the game settings
   */
  getSettings(): GameSettings {
    return { ...this.settings };
  }
} 