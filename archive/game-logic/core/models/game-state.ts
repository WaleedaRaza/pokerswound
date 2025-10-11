import type { UUID, Chips, SeatIndex } from '../../types/common.types';
import { Street } from '../../types/common.types';
import type { Card, Hole2 } from '../../types/card.types';
import { PlayerModel } from './player';
import { TableModel } from './table';

export enum GameStatus {
  WAITING = 'WAITING',
  DEALING = 'DEALING', 
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED'
}

export interface PotState {
  mainPot: Chips;
  sidePots: Array<{
    amount: Chips;
    eligiblePlayers: Set<UUID>;
    capAmount?: Chips;
  }>;
  totalPot: Chips;
}

export interface BettingRoundState {
  currentBet: Chips;
  minRaise: Chips;
  lastRaiseAmount: Chips;
  lastAggressor?: UUID;
  isComplete: boolean;
  actionsThisRound: number;
}

export interface TimingState {
  handStartTime: number;
  streetStartTime: number;
  actionStartTime?: number;
  turnTimeLimit: number;
  timebankRemaining: number;
}

export interface GameConfiguration {
  smallBlind: Chips;
  bigBlind: Chips;
  ante: Chips;
  maxPlayers: number;
  minPlayers: number;
  turnTimeLimit: number; // seconds
  timebankSeconds: number;
  autoMuckLosingHands: boolean;
  allowRabbitHunting: boolean;
}

export interface HandState {
  handNumber: number;
  dealerPosition: SeatIndex;
  smallBlindPosition: SeatIndex;
  bigBlindPosition: SeatIndex;
  communityCards: Card[];
  deck: Card[];
  deckSeed: string;
  winners?: Array<{
    playerId: UUID;
    amount: Chips;
    handRank: any;
    handDescription: string;
  }>;
}

/**
 * Complete game state representation
 * This is the single source of truth for the poker game
 */
export class GameStateModel {
  public readonly id: string;
  public readonly createdAt: string;
  public updatedAt: string;
  public status: GameStatus;
  public configuration: GameConfiguration;
  
  // Game structure
  public readonly table: TableModel;
  public readonly players: Map<UUID, PlayerModel> = new Map();
  
  // Current hand state
  public handState: HandState;
  public currentStreet: Street;
  public toAct: UUID | null = null;
  
  // Betting state
  public bettingRound: BettingRoundState;
  public pot: PotState;
  
  // Timing
  public timing: TimingState;
  
  // History and audit
  public actionHistory: Array<{
    player: UUID;
    action: string;
    amount?: Chips;
    timestamp: number;
    street: Street;
    handNumber: number;
  }> = [];
  
  // Version for optimistic locking
  public version: number;

  constructor(params: {
    id: string;
    configuration: GameConfiguration;
    createdAt?: string;
    table?: TableModel;
  }) {
    this.id = params.id;
    this.createdAt = params.createdAt ?? new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.configuration = params.configuration;
    this.table = params.table ?? new TableModel();
    this.status = GameStatus.WAITING;
    this.version = 0;
    
    // Initialize empty states
    this.handState = this.createEmptyHandState();
    this.currentStreet = Street.Preflop;
    this.bettingRound = this.createEmptyBettingRound();
    this.pot = this.createEmptyPot();
    this.timing = this.createEmptyTiming();
  }

  /**
   * Add a player to the game
   */
  public addPlayer(player: PlayerModel): void {
    if (this.players.size >= this.configuration.maxPlayers) {
      throw new Error('Game is full');
    }
    
    if (this.players.has(player.uuid)) {
      throw new Error('Player already in game');
    }
    
    this.players.set(player.uuid, player);
    this.table.seatPlayer(player);
    this.updateTimestamp();
  }

  /**
   * Remove a player from the game
   */
  public removePlayer(playerId: UUID): void {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    
    this.players.delete(playerId);
    this.table.unseatPlayer(player);
    this.updateTimestamp();
  }

  /**
   * Get a player by ID
   */
  public getPlayer(playerId: UUID): PlayerModel | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get all active players (not folded, in game)
   */
  public getActivePlayers(): PlayerModel[] {
    return Array.from(this.players.values()).filter(p => 
      p.isActive && !p.hasFolded && !p.hasLeft
    );
  }

  /**
   * Get players eligible to act (active and not all-in)
   */
  public getPlayersEligibleToAct(): PlayerModel[] {
    return this.getActivePlayers().filter(p => !p.isAllIn);
  }

  /**
   * Check if game can start
   */
  public canStartGame(): boolean {
    return this.getActivePlayers().length >= this.configuration.minPlayers &&
           this.status === GameStatus.WAITING;
  }

  /**
   * Check if hand can start
   */
  public canStartHand(): boolean {
    return this.getActivePlayers().length >= 2 &&
           (this.status === GameStatus.WAITING || this.status === GameStatus.COMPLETED);
  }

  /**
   * Check if betting round is complete
   */
  public isBettingRoundComplete(): boolean {
    const eligiblePlayers = this.getPlayersEligibleToAct();
    
    if (eligiblePlayers.length <= 1) {
      return true; // Only one player can act
    }

    const currentBet = this.bettingRound.currentBet as unknown as number;
    const activePlayers = this.getActivePlayers(); // Include all active players, not just eligible
    
    // Count how many players have acted this street
    let playersWhoActed = 0;
    let playersWithMatchingBets = 0;
    
    for (const player of activePlayers) {
      if (player.hasFolded) {
        playersWhoActed++; // Folded players have acted
        continue;
      }
      
      if (player.isAllIn) {
        playersWhoActed++; // All-in players have acted
        playersWithMatchingBets++; // All-in players don't need to match current bet
        continue;
      }
      
      const playerBet = player.betThisStreet as unknown as number;
      
      // Check if player has acted this street (has some bet or has acted based on action history)
      const hasActedThisStreet = this.actionHistory.some(action => 
        action.player === player.uuid && 
        action.street === this.currentStreet && 
        action.handNumber === this.handState.handNumber
      );
      
      if (hasActedThisStreet) {
        playersWhoActed++;
        
        // Check if player has matched current bet
        if (playerBet >= currentBet) {
          playersWithMatchingBets++;
        } else {
          // Player acted but hasn't matched the bet - round not complete
          return false;
        }
      }
    }
    
    // Betting round is complete only if:
    // 1. All active players have acted this street AND
    // 2. All non-folded, non-all-in players have matching bets
    const allPlayersActed = playersWhoActed >= activePlayers.length;
    const allBetsMatched = playersWithMatchingBets >= eligiblePlayers.length;
    
    console.log(`🎯 Betting round check: ${playersWhoActed}/${activePlayers.length} acted, ${playersWithMatchingBets}/${eligiblePlayers.length} matched bets`);
    
    return allPlayersActed && allBetsMatched;
  }

  /**
   * Check if hand is complete
   */
  public isHandComplete(): boolean {
    const activePlayers = this.getActivePlayers();
    
    // Hand is complete if only one active player or we're at showdown
    return activePlayers.length <= 1 || this.currentStreet === Street.Showdown;
  }

  /**
   * Get next player to act
   */
  public getNextPlayerToAct(startFrom?: UUID): UUID | null {
    const eligiblePlayers = this.getPlayersEligibleToAct();
    
    if (eligiblePlayers.length === 0) {
      return null;
    }

    if (eligiblePlayers.length === 1) {
      return eligiblePlayers[0].uuid;
    }

    // Find starting position
    let startIndex = 0;
    if (startFrom) {
      const currentIndex = eligiblePlayers.findIndex(p => p.uuid === startFrom);
      if (currentIndex !== -1) {
        startIndex = (currentIndex + 1) % eligiblePlayers.length;
      }
    }

    // Sort players by seat index to ensure correct order
    const sortedPlayers = eligiblePlayers.sort((a, b) => 
      (a.seatIndex as unknown as number) - (b.seatIndex as unknown as number)
    );

    return sortedPlayers[startIndex % sortedPlayers.length].uuid;
  }

  /**
   * Set the player to act
   */
  public setToAct(playerId: UUID | null): void {
    this.toAct = playerId;
    this.timing.actionStartTime = Date.now();
    this.updateTimestamp();
  }

  /**
   * Create a snapshot for persistence
   */
  public toSnapshot(): any {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      configuration: this.configuration,
      handState: {
        ...this.handState,
        communityCards: this.handState.communityCards.map(c => c.toString()),
        deck: this.handState.deck.map(c => c.toString())
      },
      currentStreet: this.currentStreet,
      toAct: this.toAct,
      bettingRound: {
        ...this.bettingRound,
        lastAggressor: this.bettingRound.lastAggressor
      },
      pot: {
        ...this.pot,
        sidePots: this.pot.sidePots.map(sp => ({
          ...sp,
          eligiblePlayers: Array.from(sp.eligiblePlayers)
        }))
      },
      timing: this.timing,
      players: Array.from(this.players.entries()).map(([id, player]) => ({
        id,
        ...player.toSnapshot()
      })),
      actionHistory: this.actionHistory,
      version: this.version
    };
  }

  /**
   * Restore from snapshot
   */
  public static fromSnapshot(snapshot: any): GameStateModel {
    const state = new GameStateModel({
      id: snapshot.id,
      configuration: snapshot.configuration,
      createdAt: snapshot.createdAt
    });

    state.updatedAt = snapshot.updatedAt;
    state.status = snapshot.status;
    state.currentStreet = snapshot.currentStreet;
    state.toAct = snapshot.toAct;
    state.version = snapshot.version;
    
    // Restore complex state objects
    state.handState = snapshot.handState;
    state.bettingRound = {
      ...snapshot.bettingRound,
      lastAggressor: snapshot.bettingRound.lastAggressor
    };
    
    state.pot = {
      ...snapshot.pot,
      sidePots: snapshot.pot.sidePots.map((sp: any) => ({
        ...sp,
        eligiblePlayers: new Set(sp.eligiblePlayers)
      }))
    };
    
    state.timing = snapshot.timing;
    state.actionHistory = snapshot.actionHistory;

    // Restore players
    if (snapshot.players) {
      for (const playerData of snapshot.players) {
        const player = PlayerModel.fromSnapshot(playerData);
        state.players.set(player.uuid, player);
      }
    }

    return state;
  }

  /**
   * Update timestamp and version
   */
  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
    this.version++;
  }

  private createEmptyHandState(): HandState {
    return {
      handNumber: 0,
      dealerPosition: 0 as SeatIndex,
      smallBlindPosition: 0 as SeatIndex,
      bigBlindPosition: 0 as SeatIndex,
      communityCards: [],
      deck: [],
      deckSeed: ''
    };
  }

  private createEmptyBettingRound(): BettingRoundState {
    return {
      currentBet: 0 as Chips,
      minRaise: this.configuration.bigBlind,
      lastRaiseAmount: 0 as Chips,
      isComplete: false,
      actionsThisRound: 0
    };
  }

  private createEmptyPot(): PotState {
    return {
      mainPot: 0 as Chips,
      sidePots: [],
      totalPot: 0 as Chips
    };
  }

  private createEmptyTiming(): TimingState {
    return {
      handStartTime: Date.now(),
      streetStartTime: Date.now(),
      turnTimeLimit: this.configuration.turnTimeLimit,
      timebankRemaining: this.configuration.timebankSeconds
    };
  }
}