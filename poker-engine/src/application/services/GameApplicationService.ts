/**
 * Game Application Service
 * 
 * Central coordinator for all game operations using CQRS pattern.
 * This service routes commands and queries to their respective buses.
 */

import type { GameStateModel } from '../../core/models/game-state';
import type { UUID, Chips, ActionType } from '../../types/common.types';
import { CommandBus } from '../commands/CommandBus';
import { QueryBus } from '../queries/QueryBus';

// Command imports
import { CreateGameCommand, type CreateGameOptions } from '../commands/CreateGame/CreateGameCommand';
import { CreateGameHandler, type CreateGameResult } from '../commands/CreateGame/CreateGameHandler';
import { StartHandCommand } from '../commands/StartHand/StartHandCommand';
import { StartHandHandler, type StartHandResult } from '../commands/StartHand/StartHandHandler';
import { JoinRoomCommand } from '../commands/JoinRoom/JoinRoomCommand';
import { JoinRoomHandler, type JoinRoomResult } from '../commands/JoinRoom/JoinRoomHandler';
import { LeaveRoomCommand } from '../commands/LeaveRoom/LeaveRoomCommand';
import { LeaveRoomHandler, type LeaveRoomResult } from '../commands/LeaveRoom/LeaveRoomHandler';
import { ProcessPlayerActionCommand } from '../commands/ProcessPlayerAction/ProcessPlayerActionCommand';
import { ProcessPlayerActionHandler, type ProcessPlayerActionResult } from '../commands/ProcessPlayerAction/ProcessPlayerActionHandler';

// Query imports
import { GetGameStateQuery } from '../queries/GetGameState/GetGameStateQuery';
import { GetGameStateHandler } from '../queries/GetGameState/GetGameStateHandler';
import { GetRoomInfoQuery } from '../queries/GetRoomInfo/GetRoomInfoQuery';
import { GetRoomInfoHandler } from '../queries/GetRoomInfo/GetRoomInfoHandler';
import { GetPlayerStatsQuery } from '../queries/GetPlayerStats/GetPlayerStatsQuery';
import { GetPlayerStatsHandler } from '../queries/GetPlayerStats/GetPlayerStatsHandler';

import type { GameStateMachine } from '../../core/engine/game-state-machine';

export interface GameApplicationServiceOptions {
  stateMachine: GameStateMachine;
  gameStateStore: Map<string, GameStateModel>;
  playerStatsStore?: Map<string, any>;
}

export class GameApplicationService {
  private commandBus: CommandBus;
  private queryBus: QueryBus;
  private stateMachine: GameStateMachine;
  private gameStateStore: Map<string, GameStateModel>;
  private playerStatsStore: Map<string, any>;

  constructor(options: GameApplicationServiceOptions) {
    this.stateMachine = options.stateMachine;
    this.gameStateStore = options.gameStateStore;
    this.playerStatsStore = options.playerStatsStore || new Map();

    // Initialize buses
    this.commandBus = new CommandBus();
    this.queryBus = new QueryBus();

    // Register command handlers
    this.registerCommandHandlers();

    // Register query handlers
    this.registerQueryHandlers();
  }

  private registerCommandHandlers(): void {
    const gameStateProvider = (gameId: string) => this.gameStateStore.get(gameId);

    this.commandBus.register(
      'CreateGame',
      new CreateGameHandler(this.gameStateStore)
    );

    this.commandBus.register(
      'StartHand',
      new StartHandHandler(this.stateMachine, gameStateProvider)
    );

    this.commandBus.register(
      'JoinRoom',
      new JoinRoomHandler(this.stateMachine, gameStateProvider)
    );

    this.commandBus.register(
      'LeaveRoom',
      new LeaveRoomHandler(this.stateMachine, gameStateProvider)
    );

    this.commandBus.register(
      'ProcessPlayerAction',
      new ProcessPlayerActionHandler(this.stateMachine, gameStateProvider)
    );
  }

  private registerQueryHandlers(): void {
    const gameStateProvider = (gameId: string) => this.gameStateStore.get(gameId);

    this.queryBus.register(
      'GetGameState',
      new GetGameStateHandler(gameStateProvider)
    );

    this.queryBus.register(
      'GetRoomInfo',
      new GetRoomInfoHandler(this.gameStateStore)
    );

    this.queryBus.register(
      'GetPlayerStats',
      new GetPlayerStatsHandler(this.playerStatsStore)
    );
  }

  // ========== COMMAND METHODS ==========

  public async createGame(options: CreateGameOptions): Promise<CreateGameResult> {
    const command = new CreateGameCommand(options);
    return await this.commandBus.execute<CreateGameResult>(command);
  }

  public async startHand(gameId: string): Promise<StartHandResult> {
    const command = new StartHandCommand(gameId);
    return await this.commandBus.execute<StartHandResult>(command);
  }

  public async joinRoom(
    gameId: string,
    playerId: UUID,
    playerName: string,
    seatNumber: number,
    buyIn: Chips
  ): Promise<JoinRoomResult> {
    const command = new JoinRoomCommand(gameId, playerId, playerName, seatNumber, buyIn);
    return await this.commandBus.execute<JoinRoomResult>(command);
  }

  public async leaveRoom(gameId: string, playerId: UUID): Promise<LeaveRoomResult> {
    const command = new LeaveRoomCommand(gameId, playerId);
    return await this.commandBus.execute<LeaveRoomResult>(command);
  }

  public async processPlayerAction(
    gameId: string,
    playerId: UUID,
    actionType: ActionType,
    amount?: Chips
  ): Promise<ProcessPlayerActionResult> {
    const command = new ProcessPlayerActionCommand(gameId, playerId, actionType, amount);
    return await this.commandBus.execute<ProcessPlayerActionResult>(command);
  }

  // ========== QUERY METHODS ==========

  public async getGameState(gameId: string): Promise<GameStateModel | null> {
    const query = new GetGameStateQuery(gameId);
    return await this.queryBus.execute(query);
  }

  public async getRoomInfo(roomId: string) {
    const query = new GetRoomInfoQuery(roomId);
    return await this.queryBus.execute(query);
  }

  public async getPlayerStats(playerId: UUID) {
    const query = new GetPlayerStatsQuery(playerId);
    return await this.queryBus.execute(query);
  }
}

