import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UUID, Chips } from '../types/common.types';
import { ActionType } from '../types/common.types';
import { GameStateModel, GameConfiguration } from '../core/models/game-state';
import { PlayerModel } from '../core/models/player';
import { GameStateMachine } from '../core/engine/game-state-machine';
import { RoundManager } from '../core/engine/round-manager';
import { GamesRepository } from './database/repos/games.repo';
import { PlayersRepository } from './database/repos/players.repo';
import { HandsRepository } from './database/repos/hands.repo';
import { ActionsRepository } from './database/repos/actions.repo';

export interface GameServiceResult<T = any> {
  success: boolean;
  data?: T;
  events?: any[];
  error?: string;
}

export interface CreateGameParams {
  smallBlind: Chips;
  bigBlind: Chips;
  maxPlayers: number;
  minPlayers?: number;
  turnTimeLimit?: number;
  timebankSeconds?: number;
}

export interface JoinGameParams {
  gameId: string;
  playerId: string;
  playerName: string;
  buyInAmount: Chips;
  seatIndex?: number;
}

export interface PlayerActionParams {
  gameId: string;
  playerId: string;
  actionType: ActionType;
  amount?: Chips;
}

/**
 * Game Service
 * High-level service that orchestrates the game engine with persistence
 */
export class GameService {
  private readonly client: SupabaseClient;
  private readonly gamesRepo: GamesRepository;
  private readonly playersRepo: PlayersRepository;
  private readonly handsRepo: HandsRepository;
  private readonly actionsRepo: ActionsRepository;
  private readonly stateMachine: GameStateMachine;
  private readonly roundManager: RoundManager;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.gamesRepo = new GamesRepository(client);
    this.playersRepo = new PlayersRepository(client);
    this.handsRepo = new HandsRepository(client);
    this.actionsRepo = new ActionsRepository(client);
    this.stateMachine = new GameStateMachine();
    this.roundManager = new RoundManager();
  }

  /**
   * Create a new game
   */
  async createGame(params: CreateGameParams): Promise<GameServiceResult> {
    try {
      const configuration: GameConfiguration = {
        smallBlind: params.smallBlind,
        bigBlind: params.bigBlind,
        ante: 0 as Chips,
        maxPlayers: params.maxPlayers,
        minPlayers: params.minPlayers || 2,
        turnTimeLimit: params.turnTimeLimit || 30,
        timebankSeconds: params.timebankSeconds || 60,
        autoMuckLosingHands: true,
        allowRabbitHunting: false
      };

      // Create game state model
      const gameState = new GameStateModel({
        id: randomUUID(),
        configuration
      });

      // Persist to database
      const dbResult = await this.gamesRepo.createGame({
        id: gameState.id,
        small_blind: params.smallBlind,
        big_blind: params.bigBlind,
        max_players: params.maxPlayers,
        status: 'WAITING'
      });

      if (!dbResult.success) {
        throw new Error(dbResult.error || 'Failed to create game in database');
      }

      return {
        success: true,
        data: {
          gameId: gameState.id,
          status: gameState.status,
          configuration: gameState.configuration,
          playerCount: 0
        },
        events: [{
          type: 'GAME_CREATED',
          data: { gameId: gameState.id },
          timestamp: Date.now()
        }]
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Join a game
   */
  async joinGame(params: JoinGameParams): Promise<GameServiceResult> {
    try {
      // Load current game state
      const gameState = await this.loadGameState(params.gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      // Check if game is joinable
      if (gameState.players.size >= gameState.configuration.maxPlayers) {
        throw new Error('Game is full');
      }

      // Create player model
      const player = new PlayerModel({
        uuid: params.playerId as UUID,
        name: params.playerName,
        stack: params.buyInAmount,
        seatIndex: params.seatIndex ?? this.findAvailableSeat(gameState)
      });

      // Add player to game state
      gameState.addPlayer(player);

      // Persist player to database
      const seatResult = await this.playersRepo.seatPlayer({
        id: params.playerId,
        game_id: params.gameId,
        user_id: params.playerId, // Assuming user_id same as player_id for now
        name: params.playerName,
        stack: params.buyInAmount,
        seat_index: player.seatIndex as unknown as number,
        is_active: true
      });

      if (!seatResult.success) {
        throw new Error(seatResult.error || 'Failed to seat player');
      }

      // Save updated game state
      await this.saveGameState(gameState);

      return {
        success: true,
        data: {
          gameId: params.gameId,
          playerId: params.playerId,
          seatIndex: player.seatIndex,
          playerCount: gameState.players.size,
          canStart: gameState.canStartGame()
        },
        events: [{
          type: 'PLAYER_JOINED',
          data: {
            gameId: params.gameId,
            playerId: params.playerId,
            playerName: params.playerName,
            seatIndex: player.seatIndex
          },
          timestamp: Date.now()
        }]
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Start a new hand
   */
  async startHand(gameId: string): Promise<GameServiceResult> {
    try {
      // Load current game state
      const gameState = await this.loadGameState(gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      // Use round manager to start new round
      const result = await this.roundManager.startNewRound(gameState);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start hand');
      }

      // Persist hand to database
      const handResult = await this.handsRepo.startHand({
        game_id: gameId,
        hand_no: result.gameState.handState.handNumber,
        dealer_btn: result.gameState.handState.dealerPosition as unknown as number,
        sb_pos: result.gameState.handState.smallBlindPosition as unknown as number,
        bb_pos: result.gameState.handState.bigBlindPosition as unknown as number,
        current_street: result.gameState.currentStreet,
        deck_seed: result.gameState.handState.deckSeed
      });

      if (!handResult.success) {
        throw new Error(handResult.error || 'Failed to persist hand');
      }

      // Save updated game state
      await this.saveGameState(result.gameState);

      return {
        success: true,
        data: {
          gameId,
          handId: handResult.data?.id,
          handNumber: result.gameState.handState.handNumber,
          dealerPosition: result.gameState.handState.dealerPosition,
          communityCards: result.gameState.handState.communityCards.map(c => c.toString()),
          pot: result.gameState.pot.totalPot,
          toAct: result.gameState.toAct
        },
        events: result.events
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Process player action
   */
  async processPlayerAction(params: PlayerActionParams): Promise<GameServiceResult> {
    try {
      // Load current game state
      const gameState = await this.loadGameState(params.gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      // Use round manager to process action
      const result = await this.roundManager.processPlayerAction(gameState, {
        playerId: params.playerId as UUID,
        actionType: params.actionType,
        amount: params.amount,
        timestamp: Date.now()
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process action');
      }

      // Get current hand
      const currentHand = await this.handsRepo.getCurrentHand(params.gameId);
      if (!currentHand.success || !currentHand.data) {
        throw new Error('No active hand found');
      }

      // Persist action to database
      const actionResult = await this.actionsRepo.appendAction({
        game_id: params.gameId,
        hand_id: currentHand.data.id,
        player_id: params.playerId,
        action: params.actionType,
        amount: params.amount,
        street: result.gameState.currentStreet
      });

      if (!actionResult.success) {
        throw new Error(actionResult.error || 'Failed to persist action');
      }

      // Save updated game state
      await this.saveGameState(result.gameState);

      // Check if we need to advance street or complete hand
      let additionalEvents: any[] = [];
      if (result.gameState.isBettingRoundComplete()) {
        if (result.gameState.isHandComplete()) {
          // Complete the hand
          const completeResult = await this.roundManager.completeHand(result.gameState);
          if (completeResult.success) {
            additionalEvents = completeResult.events;
            await this.saveGameState(completeResult.gameState);
          }
        } else {
          // Advance street
          const advanceResult = await this.roundManager.advanceStreet(result.gameState);
          if (advanceResult.success) {
            additionalEvents = advanceResult.events;
            await this.saveGameState(advanceResult.gameState);
          }
        }
      }

      return {
        success: true,
        data: {
          gameId: params.gameId,
          handId: currentHand.data.id,
          action: params.actionType,
          amount: params.amount,
          street: result.gameState.currentStreet,
          pot: result.gameState.pot.totalPot,
          toAct: result.gameState.toAct,
          isHandComplete: result.gameState.isHandComplete()
        },
        events: [...result.events, ...additionalEvents]
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get game state
   */
  async getGameState(gameId: string): Promise<GameServiceResult> {
    try {
      const gameState = await this.loadGameState(gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      return {
        success: true,
        data: {
          gameId,
          status: gameState.status,
          handNumber: gameState.handState.handNumber,
          street: gameState.currentStreet,
          communityCards: gameState.handState.communityCards.map(c => c.toString()),
          pot: gameState.pot.totalPot,
          toAct: gameState.toAct,
          players: Array.from(gameState.players.values()).map(p => ({
            id: p.uuid,
            name: p.name,
            stack: p.stack,
            seatIndex: p.seatIndex,
            isActive: p.isActive,
            hasFolded: p.hasFolded,
            isAllIn: p.isAllIn,
            betThisStreet: p.betThisStreet
          })),
          bettingInfo: this.roundManager.getBettingInfo(gameState)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get legal actions for a player
   */
  async getLegalActions(gameId: string, playerId: string): Promise<GameServiceResult> {
    try {
      const gameState = await this.loadGameState(gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      const actions = this.roundManager.getLegalActions(gameState, playerId as UUID);

      return {
        success: true,
        data: {
          gameId,
          playerId,
          legalActions: actions,
          bettingInfo: this.roundManager.getBettingInfo(gameState)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Load game state from database
   */
  private async loadGameState(gameId: string): Promise<GameStateModel | null> {
    try {
      // Load game from database
      const gameResult = await this.gamesRepo.getGame(gameId);
      if (!gameResult.success || !gameResult.data) {
        return null;
      }

      const gameData = gameResult.data;

      // Load players
      const playersResult = await this.playersRepo.getPlayersInGame(gameId);
      if (!playersResult.success) {
        throw new Error('Failed to load players');
      }

      // Create game state model
      const configuration: GameConfiguration = {
        smallBlind: gameData.small_blind as Chips,
        bigBlind: gameData.big_blind as Chips,
        ante: 0 as Chips,
        maxPlayers: gameData.max_players,
        minPlayers: 2,
        turnTimeLimit: 30,
        timebankSeconds: 60,
        autoMuckLosingHands: true,
        allowRabbitHunting: false
      };

      const gameState = new GameStateModel({
        id: gameData.id,
        configuration,
        createdAt: gameData.created_at
      });

      // Load players into state
      for (const playerData of playersResult.data || []) {
        const player = new PlayerModel({
          uuid: playerData.id as UUID,
          name: playerData.name,
          stack: playerData.stack as Chips,
          seatIndex: playerData.seat_index as any
        });
        
        gameState.players.set(player.uuid, player);
      }

      // Load current state from database if available
      if (gameData.current_state) {
        // TODO: Restore complex state from database
        // For now, use basic state restoration
      }

      return gameState;

    } catch (error) {
      console.error('Error loading game state:', error);
      return null;
    }
  }

  /**
   * Save game state to database
   */
  private async saveGameState(gameState: GameStateModel): Promise<void> {
    try {
      const updates = {
        status: gameState.status,
        current_state: gameState.toSnapshot(),
        hand_number: gameState.handState.handNumber,
        dealer_position: gameState.handState.dealerPosition as unknown as number,
        total_pot: gameState.pot.totalPot as unknown as number
      };

      await this.gamesRepo.updateGameStateAtomic(
        gameState.id,
        gameState.version,
        updates
      );

    } catch (error) {
      console.error('Error saving game state:', error);
      throw error;
    }
  }

  /**
   * Find available seat in the game
   */
  private findAvailableSeat(gameState: GameStateModel): number {
    const occupiedSeats = new Set(
      Array.from(gameState.players.values()).map(p => p.seatIndex as unknown as number)
    );

    for (let seat = 0; seat < gameState.configuration.maxPlayers; seat++) {
      if (!occupiedSeats.has(seat)) {
        return seat;
      }
    }

    throw new Error('No available seats');
  }
}
