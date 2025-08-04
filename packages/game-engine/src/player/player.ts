import { Player, PlayerInGame, PlayerStats, PlayerAction, PlayerConnection } from './types';
import { Card } from '../deck/types';

export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private connections: Map<string, PlayerConnection> = new Map();

  /**
   * Creates a new player
   */
  createPlayer(id: string, name: string, initialChips: number = 1000): Player {
    const player: Player = {
      id,
      name,
      chips: initialChips,
      isOnline: true,
      isReady: false,
      lastSeen: Date.now(),
      totalHandsPlayed: 0,
      totalWinnings: 0,
      biggestPot: 0,
      joinTime: Date.now()
    };

    this.players.set(id, player);
    return player;
  }

  /**
   * Gets a player by ID
   */
  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  /**
   * Updates player information
   */
  updatePlayer(id: string, updates: Partial<Player>): Player | undefined {
    const player = this.players.get(id);
    if (!player) return undefined;

    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  /**
   * Removes a player
   */
  removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  /**
   * Gets all players
   */
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Gets online players
   */
  getOnlinePlayers(): Player[] {
    return this.getAllPlayers().filter(p => p.isOnline);
  }

  /**
   * Creates a player in-game state
   */
  createPlayerInGame(player: Player, position: number): PlayerInGame {
    return {
      ...player,
      position,
      holeCards: [],
      isActive: true,
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      timeBank: 30 // 30 seconds default time bank
    };
  }

  /**
   * Deals hole cards to a player
   */
  dealHoleCards(playerInGame: PlayerInGame, cards: Card[]): PlayerInGame {
    if (cards.length !== 2) {
      throw new Error('Must deal exactly 2 hole cards');
    }

    return {
      ...playerInGame,
      holeCards: cards
    };
  }

  /**
   * Processes a player action
   */
  processPlayerAction(playerInGame: PlayerInGame, action: PlayerAction): PlayerInGame {
    const updatedPlayer = { ...playerInGame };

    switch (action.action) {
      case 'fold':
        updatedPlayer.isFolded = true;
        updatedPlayer.isActive = false;
        break;

      case 'check':
        // Check is only valid if no bet to call
        break;

      case 'call':
        // Call logic would be handled by game state machine
        break;

      case 'bet':
      case 'raise':
        if (action.amount) {
          updatedPlayer.chips -= action.amount;
          updatedPlayer.currentBet += action.amount;
        }
        break;

      case 'all_in':
        updatedPlayer.isAllIn = true;
        updatedPlayer.currentBet += updatedPlayer.chips;
        updatedPlayer.chips = 0;
        break;
    }

    updatedPlayer.lastAction = action.action;
    updatedPlayer.lastActionAmount = action.amount;
    updatedPlayer.timeBank = 30; // Reset time bank after action

    return updatedPlayer;
  }

  /**
   * Manages player connections
   */
  connectPlayer(playerId: string, socketId: string): PlayerConnection {
    const connection: PlayerConnection = {
      playerId,
      socketId,
      isConnected: true,
      lastPing: Date.now()
    };

    this.connections.set(playerId, connection);
    this.updatePlayer(playerId, { isOnline: true, lastSeen: Date.now() });

    return connection;
  }

  /**
   * Disconnects a player
   */
  disconnectPlayer(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.isConnected = false;
      this.connections.set(playerId, connection);
    }

    this.updatePlayer(playerId, { isOnline: false, lastSeen: Date.now() });
  }

  /**
   * Gets player connection status
   */
  getPlayerConnection(playerId: string): PlayerConnection | undefined {
    return this.connections.get(playerId);
  }

  /**
   * Updates player ping
   */
  updatePlayerPing(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.lastPing = Date.now();
      this.connections.set(playerId, connection);
    }
  }

  /**
   * Calculates player statistics
   */
  calculatePlayerStats(playerId: string, gameHistory: any[]): PlayerStats {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    // TODO: Implement proper stats calculation based on game history
    const stats: PlayerStats = {
      playerId,
      handsPlayed: player.totalHandsPlayed,
      handsWon: 0, // TODO: Calculate from game history
      totalWinnings: player.totalWinnings,
      biggestPot: player.biggestPot,
      averageBet: 0, // TODO: Calculate from game history
      foldRate: 0, // TODO: Calculate from game history
      vpip: 0, // TODO: Calculate from game history
      pfr: 0, // TODO: Calculate from game history
      af: 0 // TODO: Calculate from game history
    };

    return stats;
  }

  /**
   * Assigns positions to players (dealer, blinds, etc.)
   */
  assignPositions(players: PlayerInGame[], dealerPosition: number): PlayerInGame[] {
    return players.map((player, index) => {
      const position = (dealerPosition + index) % players.length;
      return {
        ...player,
        position,
        isDealer: position === dealerPosition,
        isSmallBlind: position === (dealerPosition + 1) % players.length,
        isBigBlind: position === (dealerPosition + 2) % players.length
      };
    });
  }
} 