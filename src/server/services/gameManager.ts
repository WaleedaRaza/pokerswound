import { Card, Rank, Suit, Street, PlayerStatus, Action, Player, GameState } from './pokerEngine';
import { HandEvaluator, HandResult } from './handEvaluator';

export interface BettingAction {
  playerId: string;
  action: Action;
  amount?: number;
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[];
}

export interface GameResult {
  winners: string[];
  handResults: { [playerId: string]: HandResult };
  potDistribution: { [playerId: string]: number };
}

export class GameManager {
  private games: Map<string, GameState> = new Map();

  async createGame(
    gameId: string,
    players: Omit<Player, 'holeCards' | 'status' | 'paidAmount' | 'position' | 'isDealer' | 'isSmallBlind' | 'isBigBlind'>[],
    smallBlindAmount: number
  ): Promise<GameState> {
    const deck = this.createDeck();
    await this.shuffleDeck(deck);

    const gameState: GameState = {
      id: gameId,
      players: players.map((p, i) => ({
        ...p,
        holeCards: [],
        status: PlayerStatus.ACTIVE,
        paidAmount: 0,
        position: i,
        isDealer: i === 0,
        isSmallBlind: i === 1,
        isBigBlind: i === 2
      })),
      communityCards: [],
      pot: 0,
      currentBet: 0,
      street: Street.PREFLOP,
      currentPlayerIndex: 3, // Start after big blind
      deck,
      smallBlindAmount,
      bigBlindAmount: smallBlindAmount * 2,
      roundCount: 1
    };

    // Deal hole cards
    for (let i = 0; i < 2; i++) {
      for (const player of gameState.players) {
        player.holeCards.push(deck.pop()!);
      }
    }

    // Post blinds
    this.postBlinds(gameState);
    this.games.set(gameId, gameState);

    return gameState;
  }

  processAction(gameId: string, action: BettingAction): GameState | null {
    const gameState = this.games.get(gameId);
    if (!gameState) return null;

    const player = gameState.players.find(p => p.id === action.playerId);
    if (!player || player.status !== PlayerStatus.ACTIVE) return null;

    // Validate action
    if (!this.isValidAction(gameState, player, action)) return null;

    // Execute action
    this.executeAction(gameState, player, action);

    // Check if betting round is complete
    if (this.isBettingRoundComplete(gameState)) {
      this.advanceStreet(gameState);
    } else {
      this.moveToNextPlayer(gameState);
    }

    return gameState;
  }

  private isValidAction(gameState: GameState, player: Player, action: BettingAction): boolean {
    const currentBet = this.getCurrentBet(gameState);
    const playerBet = player.paidAmount;

    switch (action.action) {
      case Action.FOLD:
        return true;

      case Action.CALL:
        const callAmount = currentBet - playerBet;
        return player.stack >= callAmount;

      case Action.RAISE:
        if (!action.amount) return false;
        const raiseAmount = action.amount - playerBet;
        const minRaise = this.getMinRaise(gameState);
        return player.stack >= raiseAmount && action.amount >= minRaise;

      case Action.CHECK:
        return currentBet === playerBet;

      default:
        return false;
    }
  }

  private executeAction(gameState: GameState, player: Player, action: BettingAction): void {
    const currentBet = this.getCurrentBet(gameState);
    const playerBet = player.paidAmount;

    switch (action.action) {
      case Action.FOLD:
        player.status = PlayerStatus.FOLDED;
        break;

      case Action.CALL:
        const callAmount = currentBet - playerBet;
        player.stack -= callAmount;
        player.paidAmount += callAmount;
        gameState.pot += callAmount;
        break;

      case Action.RAISE:
        const raiseAmount = action.amount! - playerBet;
        player.stack -= raiseAmount;
        player.paidAmount += raiseAmount;
        gameState.pot += raiseAmount;
        gameState.currentBet = action.amount!;
        break;

      case Action.CHECK:
        // No action needed
        break;
    }

    // Check for all-in
    if (player.stack === 0 && player.status === PlayerStatus.ACTIVE) {
      player.status = PlayerStatus.ALLIN;
    }
  }

  private advanceStreet(gameState: GameState): void {
    switch (gameState.street) {
      case Street.PREFLOP:
        this.dealFlop(gameState);
        break;
      case Street.FLOP:
        this.dealTurn(gameState);
        break;
      case Street.TURN:
        this.dealRiver(gameState);
        break;
      case Street.RIVER:
        this.showdown(gameState);
        break;
    }
  }

  private dealFlop(gameState: GameState): void {
    // Deal 3 community cards
    for (let i = 0; i < 3; i++) {
      gameState.communityCards.push(gameState.deck.pop()!);
    }
    gameState.street = Street.FLOP;
    this.resetBettingRound(gameState);
  }

  private dealTurn(gameState: GameState): void {
    // Deal 1 community card
    gameState.communityCards.push(gameState.deck.pop()!);
    gameState.street = Street.TURN;
    this.resetBettingRound(gameState);
  }

  private dealRiver(gameState: GameState): void {
    // Deal 1 community card
    gameState.communityCards.push(gameState.deck.pop()!);
    gameState.street = Street.RIVER;
    this.resetBettingRound(gameState);
  }

  private showdown(gameState: GameState): GameResult {
    const activePlayers = gameState.players.filter(p => p.status === PlayerStatus.ACTIVE);
    const handResults: { [playerId: string]: HandResult } = {};
    const winners: string[] = [];

    // Evaluate hands
    for (const player of activePlayers) {
      handResults[player.id] = HandEvaluator.evaluateHand(player.holeCards, gameState.communityCards);
    }

    // Find winners
    let bestHand: HandResult | null = null;
    for (const player of activePlayers) {
      const hand = handResults[player.id];
      if (hand && (!bestHand || HandEvaluator.compareHands(hand, bestHand) > 0)) {
        bestHand = hand;
        winners.length = 0;
        winners.push(player.id);
      } else if (hand && bestHand && HandEvaluator.compareHands(hand, bestHand) === 0) {
        winners.push(player.id);
      }
    }

    // Distribute pot
    const potDistribution: { [playerId: string]: number } = {};
    const potPerWinner = Math.floor(gameState.pot / winners.length);
    const remainder = gameState.pot % winners.length;

    for (let i = 0; i < winners.length; i++) {
      const winnerId = winners[i];
      if (winnerId) {
        potDistribution[winnerId] = potPerWinner + (i < remainder ? 1 : 0);
        
        const winner = gameState.players.find(p => p.id === winnerId);
        if (winner) {
          winner.stack += potDistribution[winnerId];
        }
      }
    }

    gameState.street = Street.SHOWDOWN;
    gameState.pot = 0;

    return { winners, handResults, potDistribution };
  }

  private resetBettingRound(gameState: GameState): void {
    // Reset betting state
    gameState.currentBet = 0;
    gameState.currentPlayerIndex = this.findFirstActivePlayer(gameState);
    
    // Reset player paid amounts
    for (const player of gameState.players) {
      player.paidAmount = 0;
    }
  }

  private findFirstActivePlayer(gameState: GameState): number {
    for (let i = 0; i < gameState.players.length; i++) {
      if (gameState.players[i]?.status === PlayerStatus.ACTIVE) {
        return i;
      }
    }
    return 0;
  }

  private moveToNextPlayer(gameState: GameState): void {
    do {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    } while (gameState.players[gameState.currentPlayerIndex]?.status !== PlayerStatus.ACTIVE);
  }

  private isBettingRoundComplete(gameState: GameState): boolean {
    const activePlayers = gameState.players.filter(p => p.status === PlayerStatus.ACTIVE);
    if (activePlayers.length <= 1) return true;

    const currentBet = this.getCurrentBet(gameState);
    return activePlayers.every(p => p.paidAmount === currentBet || p.status === PlayerStatus.ALLIN);
  }

  private getCurrentBet(gameState: GameState): number {
    return Math.max(...gameState.players.map(p => p.paidAmount));
  }

  private getMinRaise(gameState: GameState): number {
    const currentBet = this.getCurrentBet(gameState);
    const lastRaise = this.getLastRaiseAmount(gameState);
    return currentBet + (lastRaise || gameState.bigBlindAmount);
  }

  private getLastRaiseAmount(gameState: GameState): number {
    // This would track the last raise amount in a real implementation
    return gameState.bigBlindAmount;
  }

  private postBlinds(gameState: GameState): void {
    const smallBlindPlayer = gameState.players.find(p => p.isSmallBlind);
    const bigBlindPlayer = gameState.players.find(p => p.isBigBlind);

    if (smallBlindPlayer) {
      smallBlindPlayer.paidAmount = gameState.smallBlindAmount;
      smallBlindPlayer.stack -= gameState.smallBlindAmount;
      gameState.pot += gameState.smallBlindAmount;
    }

    if (bigBlindPlayer) {
      bigBlindPlayer.paidAmount = gameState.bigBlindAmount;
      bigBlindPlayer.stack -= gameState.bigBlindAmount;
      gameState.pot += gameState.bigBlindAmount;
      gameState.currentBet = gameState.bigBlindAmount;
    }
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        if (typeof rank === 'number') {
          deck.push(new Card(rank, suit));
        }
      }
    }
    return deck;
  }

  private async shuffleDeck(deck: Card[]): Promise<void> {
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = deck[i];
      deck[i] = deck[j]!;
      deck[j] = temp!;
    }
  }

  getGameState(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getActiveGames(): string[] {
    return Array.from(this.games.keys());
  }
} 