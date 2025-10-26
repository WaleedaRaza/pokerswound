"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameApplicationService = void 0;
const CommandBus_1 = require("../commands/CommandBus");
const QueryBus_1 = require("../queries/QueryBus");
const CreateGameCommand_1 = require("../commands/CreateGame/CreateGameCommand");
const CreateGameHandler_1 = require("../commands/CreateGame/CreateGameHandler");
const StartHandCommand_1 = require("../commands/StartHand/StartHandCommand");
const StartHandHandler_1 = require("../commands/StartHand/StartHandHandler");
const JoinRoomCommand_1 = require("../commands/JoinRoom/JoinRoomCommand");
const JoinRoomHandler_1 = require("../commands/JoinRoom/JoinRoomHandler");
const LeaveRoomCommand_1 = require("../commands/LeaveRoom/LeaveRoomCommand");
const LeaveRoomHandler_1 = require("../commands/LeaveRoom/LeaveRoomHandler");
const ProcessPlayerActionCommand_1 = require("../commands/ProcessPlayerAction/ProcessPlayerActionCommand");
const ProcessPlayerActionHandler_1 = require("../commands/ProcessPlayerAction/ProcessPlayerActionHandler");
const GetGameStateQuery_1 = require("../queries/GetGameState/GetGameStateQuery");
const GetGameStateHandler_1 = require("../queries/GetGameState/GetGameStateHandler");
const GetRoomInfoQuery_1 = require("../queries/GetRoomInfo/GetRoomInfoQuery");
const GetRoomInfoHandler_1 = require("../queries/GetRoomInfo/GetRoomInfoHandler");
const GetPlayerStatsQuery_1 = require("../queries/GetPlayerStats/GetPlayerStatsQuery");
const GetPlayerStatsHandler_1 = require("../queries/GetPlayerStats/GetPlayerStatsHandler");
class GameApplicationService {
    constructor(options) {
        this.stateMachine = options.stateMachine;
        this.gameStateStore = options.gameStateStore;
        this.playerStatsStore = options.playerStatsStore || new Map();
        this.commandBus = new CommandBus_1.CommandBus();
        this.queryBus = new QueryBus_1.QueryBus();
        this.registerCommandHandlers();
        this.registerQueryHandlers();
    }
    registerCommandHandlers() {
        const gameStateProvider = (gameId) => this.gameStateStore.get(gameId);
        this.commandBus.register('CreateGame', new CreateGameHandler_1.CreateGameHandler(this.gameStateStore));
        this.commandBus.register('StartHand', new StartHandHandler_1.StartHandHandler(this.stateMachine, gameStateProvider));
        this.commandBus.register('JoinRoom', new JoinRoomHandler_1.JoinRoomHandler(this.stateMachine, gameStateProvider));
        this.commandBus.register('LeaveRoom', new LeaveRoomHandler_1.LeaveRoomHandler(this.stateMachine, gameStateProvider));
        this.commandBus.register('ProcessPlayerAction', new ProcessPlayerActionHandler_1.ProcessPlayerActionHandler(this.stateMachine, gameStateProvider));
    }
    registerQueryHandlers() {
        const gameStateProvider = (gameId) => this.gameStateStore.get(gameId);
        this.queryBus.register('GetGameState', new GetGameStateHandler_1.GetGameStateHandler(gameStateProvider));
        this.queryBus.register('GetRoomInfo', new GetRoomInfoHandler_1.GetRoomInfoHandler(this.gameStateStore));
        this.queryBus.register('GetPlayerStats', new GetPlayerStatsHandler_1.GetPlayerStatsHandler(this.playerStatsStore));
    }
    async createGame(options) {
        const command = new CreateGameCommand_1.CreateGameCommand(options);
        return await this.commandBus.execute(command);
    }
    async startHand(gameId) {
        const command = new StartHandCommand_1.StartHandCommand(gameId);
        return await this.commandBus.execute(command);
    }
    async joinRoom(gameId, playerId, playerName, seatNumber, buyIn) {
        const command = new JoinRoomCommand_1.JoinRoomCommand(gameId, playerId, playerName, seatNumber, buyIn);
        return await this.commandBus.execute(command);
    }
    async leaveRoom(gameId, playerId) {
        const command = new LeaveRoomCommand_1.LeaveRoomCommand(gameId, playerId);
        return await this.commandBus.execute(command);
    }
    async processPlayerAction(gameId, playerId, actionType, amount) {
        const command = new ProcessPlayerActionCommand_1.ProcessPlayerActionCommand(gameId, playerId, actionType, amount);
        return await this.commandBus.execute(command);
    }
    async getGameState(gameId) {
        const query = new GetGameStateQuery_1.GetGameStateQuery(gameId);
        return await this.queryBus.execute(query);
    }
    async getRoomInfo(roomId) {
        const query = new GetRoomInfoQuery_1.GetRoomInfoQuery(roomId);
        return await this.queryBus.execute(query);
    }
    async getPlayerStats(playerId) {
        const query = new GetPlayerStatsQuery_1.GetPlayerStatsQuery(playerId);
        return await this.queryBus.execute(query);
    }
}
exports.GameApplicationService = GameApplicationService;
