import type { UUID, SeatIndex } from '../../types/common.types';
import { Street } from '../../types/common.types';
import type { GameStateModel } from '../models/game-state';
import type { PlayerModel } from '../models/player';

export interface TurnOrder {
  playerUuid: UUID;
  seatIndex: SeatIndex;
  position: string;
  isActive: boolean;
}

export interface TurnInfo {
  currentPlayer: UUID;
  nextPlayer: UUID | null;
  turnOrder: TurnOrder[];
  playersToAct: UUID[];
  isRoundComplete: boolean;
}

export class TurnManager {
  /**
   * Determines the next player to act
   */
  public getNextToAct(
    gameState: GameStateModel,
    currentStreet: Street,
    lastAggressor?: UUID
  ): UUID | null {
    const activePlayers = this.getActivePlayersInOrder(gameState);
    
    if (activePlayers.length <= 1) {
      return null; // Game over or only one player left
    }

    const currentToAct = gameState.toAct;
    
    if (!currentToAct) {
      // Start of betting round - determine first to act
      return this.getFirstToAct(gameState, currentStreet);
    }

    // Find current player in the order
    const currentIndex = activePlayers.findIndex(p => p.uuid === currentToAct);
    if (currentIndex === -1) {
      // Current player not found, start from beginning
      return this.getFirstToAct(gameState, currentStreet);
    }

    // Look for next active player who can act
    for (let i = 1; i <= activePlayers.length; i++) {
      const nextIndex = (currentIndex + i) % activePlayers.length;
      const nextPlayer = activePlayers[nextIndex];
      
      if (this.canPlayerAct(nextPlayer)) {
        return nextPlayer.uuid;
      }
    }

    return null; // No one can act (shouldn't happen in normal play)
  }

  /**
   * Gets complete turn information for current state
   */
  public getTurnInfo(
    gameState: GameStateModel,
    currentStreet: Street,
    lastAggressor?: UUID
  ): TurnInfo {
    const activePlayers = this.getActivePlayersInOrder(gameState);
    const currentPlayer = gameState.toAct;
    const nextPlayer = this.getNextToAct(gameState, currentStreet, lastAggressor);
    
    const turnOrder: TurnOrder[] = activePlayers.map((player, index) => ({
      playerUuid: player.uuid,
      seatIndex: player.seatIndex as SeatIndex,
      position: this.getPositionName(index, activePlayers.length),
      isActive: this.canPlayerAct(player),
    }));

    const playersToAct = activePlayers
      .filter(p => this.canPlayerAct(p))
      .map(p => p.uuid);

    const isRoundComplete = this.isBettingRoundComplete(
      gameState,
      currentStreet,
      lastAggressor
    );

    return {
      currentPlayer: currentPlayer || (activePlayers[0]?.uuid || null),
      nextPlayer,
      turnOrder,
      playersToAct,
      isRoundComplete,
    };
  }

  /**
   * Advances to the next player
   */
  public advanceTurn(
    gameState: GameStateModel,
    currentStreet: Street,
    lastAggressor?: UUID
  ): UUID | null {
    const nextPlayer = this.getNextToAct(gameState, currentStreet, lastAggressor);
    gameState.setToAct(nextPlayer);
    return nextPlayer;
  }

  /**
   * Determines if betting round is complete
   */
  public isBettingRoundComplete(
    gameState: GameStateModel,
    currentStreet: Street,
    lastAggressor?: UUID
  ): boolean {
    const activePlayers = this.getActivePlayersInOrder(gameState);
    
    // Only one player left
    if (activePlayers.length <= 1) {
      return true;
    }

    // All players are all-in except at most one
    const nonAllInPlayers = activePlayers.filter(p => !p.isAllIn);
    if (nonAllInPlayers.length <= 1) {
      return true;
    }

    // Check if all active players have acted and matched the current bet
    const currentBet = this.getCurrentBet(gameState);
    let allPlayersActed = true;
    let allBetsMatched = true;

    for (const player of activePlayers) {
      if (player.isAllIn) {
        continue; // All-in players don't need to act further
      }

      const playerBet = player.betThisStreet as unknown as number;
      const currentBetNum = currentBet as unknown as number;

      // Player hasn't matched the current bet
      if (playerBet < currentBetNum) {
        allBetsMatched = false;
        allPlayersActed = false;
        break;
      }
    }

    if (!allBetsMatched) {
      return false;
    }

    // If there was an aggressor, ensure action has come back to them
    if (lastAggressor && allPlayersActed) {
      const aggressor = gameState.getPlayer(lastAggressor);
      if (aggressor && !aggressor.isAllIn && !aggressor.hasFolded) {
        // Check if aggressor's bet is still the highest
        const aggressorBet = aggressor.betThisStreet as unknown as number;
        const currentBetNum = currentBet as unknown as number;
        
        if (aggressorBet === currentBetNum) {
          return true; // Action completed back to aggressor
        }
      }
    }

    return allPlayersActed;
  }

  /**
   * Gets the first player to act for a given street
   */
  public getFirstToAct(gameState: GameStateModel, street: Street): UUID | null {
    const activePlayers = this.getActivePlayersInOrder(gameState);
    
    if (activePlayers.length === 0) {
      return null;
    }

    if (street === Street.Preflop) {
      // Preflop: first to act is left of big blind (UTG)
      const bbPosition = gameState.table.bigBlindPosition as unknown as number;
      return this.getPlayerLeftOf(gameState, bbPosition);
    } else {
      // Postflop: first to act is left of dealer (small blind position)
      const dealerPosition = gameState.table.dealerPosition as unknown as number;
      return this.getPlayerLeftOf(gameState, dealerPosition);
    }
  }

  /**
   * Skips players who cannot act (folded, all-in)
   */
  public skipInactivePlayers(gameState: GameStateModel): UUID | null {
    const currentToAct = gameState.toAct;
    if (!currentToAct) {
      return null;
    }

    const currentPlayer = gameState.getPlayer(currentToAct);
    if (!currentPlayer || this.canPlayerAct(currentPlayer)) {
      return currentToAct; // Current player can act
    }

    // Current player can't act, find next active player
    return this.getNextToAct(gameState, Street.Preflop); // Street doesn't matter for skipping
  }

  /**
   * Gets active players in seating order
   */
  private getActivePlayersInOrder(gameState: GameStateModel): PlayerModel[] {
    return gameState.getActivePlayers()
      .sort((a, b) => {
        const seatA = a.seatIndex as unknown as number;
        const seatB = b.seatIndex as unknown as number;
        const dealerSeat = gameState.table.dealerPosition as unknown as number;
        
        // Calculate distance from dealer
        const distanceA = (seatA - dealerSeat + 10) % 10;
        const distanceB = (seatB - dealerSeat + 10) % 10;
        
        return distanceA - distanceB;
      });
  }

  /**
   * Checks if a player can act (not folded, not all-in, has chips)
   */
  private canPlayerAct(player: PlayerModel): boolean {
    return !player.hasFolded && 
           !player.isAllIn && 
           (player.stack as unknown as number) > 0;
  }

  /**
   * Gets the current highest bet on the table
   */
  private getCurrentBet(gameState: GameStateModel): number {
    const activePlayers = gameState.getActivePlayers();
    let maxBet = 0;

    for (const player of activePlayers) {
      const playerBet = player.betThisStreet as unknown as number;
      if (playerBet > maxBet) {
        maxBet = playerBet;
      }
    }

    return maxBet;
  }

  /**
   * Gets the next active player left of a given seat
   */
  private getPlayerLeftOf(gameState: GameStateModel, seatIndex: number): UUID | null {
    const activePlayers = this.getActivePlayersInOrder(gameState);
    
    if (activePlayers.length === 0) {
      return null;
    }

    // Find first active player clockwise from the given seat
    for (let offset = 1; offset <= 10; offset++) {
      const targetSeat = (seatIndex + offset) % 10;
      const player = activePlayers.find(p => 
        (p.seatIndex as unknown as number) === targetSeat && this.canPlayerAct(p)
      );
      
      if (player) {
        return player.uuid;
      }
    }

    // Fallback: return first active player
    const firstActive = activePlayers.find(p => this.canPlayerAct(p));
    return firstActive?.uuid || null;
  }

  /**
   * Gets position name based on seat order
   */
  private getPositionName(index: number, totalPlayers: number): string {
    if (totalPlayers === 2) {
      return index === 0 ? 'BTN' : 'BB';
    }

    switch (index) {
      case 0: return 'BTN';
      case 1: return 'SB';
      case 2: return 'BB';
      case 3: return totalPlayers <= 6 ? 'UTG' : 'UTG';
      case 4: return totalPlayers <= 6 ? 'MP' : 'UTG+1';
      case 5: return totalPlayers <= 6 ? 'CO' : 'MP';
      default:
        if (index === totalPlayers - 1) {
          return 'CO';
        } else if (index === totalPlayers - 2) {
          return 'HJ';
        } else {
          return 'MP';
        }
    }
  }

  /**
   * Rotates dealer button to next active player
   */
  public rotateDealer(gameState: GameStateModel): void {
    const activePlayers = gameState.getActivePlayers();
    if (activePlayers.length < 2) {
      return; // Can't rotate with less than 2 players
    }

    const currentDealer = gameState.table.dealerPosition as unknown as number;
    
    // Find next active player clockwise
    for (let offset = 1; offset <= 10; offset++) {
      const nextSeat = (currentDealer + offset) % 10;
      const nextPlayer = activePlayers.find(p => 
        (p.seatIndex as unknown as number) === nextSeat
      );
      
      if (nextPlayer) {
        gameState.table.rotateDealer();
        break;
      }
    }
  }

  /**
   * Sets blind positions based on dealer position
   */
  public setBlindPositions(gameState: GameStateModel): void {
    const activePlayers = gameState.getActivePlayers();
    const dealerSeat = gameState.table.dealerPosition as unknown as number;

    if (activePlayers.length === 2) {
      // Heads-up: dealer is small blind
      gameState.table.setBlinds(
        gameState.table.dealerPosition,
        this.getNextActiveSeat(gameState, dealerSeat) || gameState.table.dealerPosition
      );
    } else {
      // Multi-way: small blind is left of dealer, big blind is left of small blind
      const sbSeat = this.getNextActiveSeat(gameState, dealerSeat);
      const bbSeat = sbSeat ? this.getNextActiveSeat(gameState, sbSeat as unknown as number) : null;
      
      if (sbSeat && bbSeat) {
        gameState.table.setBlinds(sbSeat, bbSeat);
      }
    }
  }

  /**
   * Gets the next active seat clockwise from given seat
   */
  private getNextActiveSeat(gameState: GameStateModel, fromSeat: number): SeatIndex | null {
    const activePlayers = gameState.getActivePlayers();
    
    for (let offset = 1; offset <= 10; offset++) {
      const nextSeat = (fromSeat + offset) % 10;
      const player = activePlayers.find(p => 
        (p.seatIndex as unknown as number) === nextSeat
      );
      
      if (player) {
        return nextSeat as SeatIndex;
      }
    }
    
    return null;
  }
}