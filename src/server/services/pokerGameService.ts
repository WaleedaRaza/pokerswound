import { PrismaClient } from '@prisma/client';
import { 
  Game, 
  GamePlayer, 
  Hand, 
  HandAction, 
  ActionType, 
  PokerRound,
  GameStatus,
  Card,
  Suit,
  Rank,
  CardString
} from '../../types';
import { EntropyService } from './entropyService';
import { logger } from '../utils/logger';

export class PokerGameService {
  private prisma: PrismaClient;
  private entropyService: EntropyService;

  constructor(prisma: PrismaClient, entropyService: EntropyService) {
    this.prisma = prisma;
    this.entropyService = entropyService;
  }

  /**
   * Create a new poker game
   */
  async createGame(data: {
    name: string;
    gameType: string;
    maxPlayers: number;
    minBet: number;
    maxBet: number;
    createdBy: string;
  }): Promise<Game> {
    const game = await this.prisma.game.create({
      data: {
        name: data.name,
        gameType: data.gameType as any,
        maxPlayers: data.maxPlayers,
        minBet: data.minBet,
        maxBet: data.maxBet,
        status: GameStatus.WAITING
      },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    // Add the creator as the first player
    await this.joinGame(game.id, data.createdBy, 0);

    logger.info('Created new poker game', { gameId: game.id, name: game.name });
    return game;
  }

  /**
   * Join a poker game
   */
  async joinGame(gameId: string, userId: string, seat: number): Promise<GamePlayer> {
    // Check if seat is available
    const existingPlayer = await this.prisma.gamePlayer.findFirst({
      where: {
        gameId,
        OR: [
          { seat },
          { userId }
        ]
      }
    });

    if (existingPlayer) {
      throw new Error('Seat is taken or user already in game');
    }

    // Get user's token balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const player = await this.prisma.gamePlayer.create({
      data: {
        userId,
        gameId,
        seat,
        chips: 1000, // Starting chips
        isDealer: false
      },
      include: {
        user: true
      }
    });

    logger.info('Player joined game', { gameId, userId, seat });
    return player;
  }

  /**
   * Start a new hand in a game
   */
  async startNewHand(gameId: string): Promise<Hand> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { isActive: true },
          include: { user: true }
        }
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start a hand');
    }

    // Generate entropy for shuffling
    const entropyResult = await this.entropyService.generateEntropy();

    // Create a new deck and shuffle it
    const deck = this.createDeck();
    const shuffledDeck = this.entropyService.shuffleDeck(deck, entropyResult);

    // Get the next hand number
    const lastHand = await this.prisma.hand.findFirst({
      where: { gameId },
      orderBy: { handNumber: 'desc' }
    });
    const handNumber = (lastHand?.handNumber || 0) + 1;

    // Create the hand
    const hand = await this.prisma.hand.create({
      data: {
        gameId,
        handNumber,
        entropy: entropyResult.hash,
        entropySources: entropyResult.sources.map(s => s.type),
        currentRound: PokerRound.PREFLOP
      }
    });

    // Deal hole cards to each player
    const players = game.players;
    for (let i = 0; i < players.length; i++) {
      const holeCards = [shuffledDeck[i * 2], shuffledDeck[i * 2 + 1]];
      
      // Store hole cards in memory (not in DB for security)
      // In a real implementation, you'd store this in Redis or similar
      logger.info('Dealt hole cards', {
        playerId: players[i].userId,
        cards: holeCards
      });
    }

    // Update game status
    await this.prisma.game.update({
      where: { id: gameId },
      data: { 
        status: GameStatus.PLAYING,
        currentHand: { connect: { id: hand.id } }
      }
    });

    logger.info('Started new hand', { 
      gameId, 
      handId: hand.id, 
      playerCount: players.length,
      entropyHash: entropyResult.hash.substring(0, 8) + '...'
    });

    return hand;
  }

  /**
   * Process a player action
   */
  async processPlayerAction(data: {
    gameId: string;
    handId: string;
    userId: string;
    action: ActionType;
    amount?: number;
  }): Promise<HandAction> {
    const { gameId, handId, userId, action, amount } = data;

    // Validate the action
    await this.validateAction(gameId, handId, userId, action, amount);

    // Create the action record
    const handAction = await this.prisma.handAction.create({
      data: {
        handId,
        userId,
        actionType: action,
        amount
      }
    });

    // Update game state based on action
    await this.updateGameState(gameId, handId, action, amount);

    logger.info('Player action processed', {
      gameId,
      handId,
      userId,
      action,
      amount
    });

    return handAction;
  }

  /**
   * Validate if a player action is legal
   */
  private async validateAction(
    gameId: string,
    handId: string,
    userId: string,
    action: ActionType,
    amount?: number
  ): Promise<void> {
    const hand = await this.prisma.hand.findUnique({
      where: { id: handId },
      include: {
        game: {
          include: {
            players: {
              where: { isActive: true },
              include: { user: true }
            }
          }
        }
      }
    });

    if (!hand) {
      throw new Error('Hand not found');
    }

    if (hand.gameId !== gameId) {
      throw new Error('Hand does not belong to game');
    }

    const player = hand.game.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error('Player not in game');
    }

    // Check if it's the player's turn
    if (hand.currentPlayer !== userId) {
      throw new Error('Not your turn');
    }

    // Validate action based on current game state
    switch (action) {
      case ActionType.FOLD:
      case ActionType.CHECK:
        // Always valid
        break;
      
      case ActionType.CALL:
      case ActionType.BET:
      case ActionType.RAISE:
      case ActionType.ALL_IN:
        if (!amount || amount <= 0) {
          throw new Error('Amount required for this action');
        }
        if (amount > player.chips) {
          throw new Error('Insufficient chips');
        }
        break;
      
      default:
        throw new Error('Invalid action');
    }
  }

  /**
   * Update game state after an action
   */
  private async updateGameState(
    gameId: string,
    handId: string,
    action: ActionType,
    amount?: number
  ): Promise<void> {
    const hand = await this.prisma.hand.findUnique({
      where: { id: handId },
      include: {
        game: {
          include: {
            players: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!hand) return;

    // Update pot if betting
    if (amount && amount > 0) {
      await this.prisma.hand.update({
        where: { id: handId },
        data: {
          pot: { increment: amount }
        }
      });
    }

    // Move to next player or next round
    await this.moveToNextPlayer(hand);
  }

  /**
   * Move to the next player or advance the round
   */
  private async moveToNextPlayer(hand: any): Promise<void> {
    const players = hand.game.players;
    const currentPlayerIndex = players.findIndex(p => p.userId === hand.currentPlayer);
    
    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    
    // Check if we've completed a full round
    if (nextPlayerIndex === 0) {
      // Advance to next round
      await this.advanceRound(hand);
    } else {
      // Move to next player
      const nextPlayer = players[nextPlayerIndex];
      await this.prisma.hand.update({
        where: { id: hand.id },
        data: { currentPlayer: nextPlayer.userId }
      });
    }
  }

  /**
   * Advance to the next round of poker
   */
  private async advanceRound(hand: any): Promise<void> {
    const currentRound = hand.currentRound;
    let nextRound: PokerRound;
    let communityCards: string[] = [];

    switch (currentRound) {
      case PokerRound.PREFLOP:
        nextRound = PokerRound.FLOP;
        // Deal 3 community cards
        communityCards = await this.dealCommunityCards(hand.id, 3);
        break;
      
      case PokerRound.FLOP:
        nextRound = PokerRound.TURN;
        // Deal 1 community card
        communityCards = await this.dealCommunityCards(hand.id, 1);
        break;
      
      case PokerRound.TURN:
        nextRound = PokerRound.RIVER;
        // Deal 1 community card
        communityCards = await this.dealCommunityCards(hand.id, 1);
        break;
      
      case PokerRound.RIVER:
        nextRound = PokerRound.SHOWDOWN;
        // Determine winners
        await this.determineWinners(hand);
        return;
      
      default:
        throw new Error('Invalid round');
    }

    // Update hand with new round and community cards
    await this.prisma.hand.update({
      where: { id: hand.id },
      data: {
        currentRound: nextRound,
        communityCards: {
          push: communityCards
        },
        currentPlayer: hand.game.players[0].userId // Reset to first player
      }
    });

    logger.info('Advanced to next round', {
      handId: hand.id,
      fromRound: currentRound,
      toRound: nextRound,
      communityCards
    });
  }

  /**
   * Deal community cards
   */
  private async dealCommunityCards(handId: string, count: number): Promise<string[]> {
    // In a real implementation, you'd get the shuffled deck from memory/Redis
    // For now, we'll generate random cards
    const cards: string[] = [];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

    for (let i = 0; i < count; i++) {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const card: CardString = `${rank}${suit[0].toUpperCase()}` as CardString;
      cards.push(card);
    }

    return cards;
  }

  /**
   * Determine winners of the hand
   */
  private async determineWinners(hand: any): Promise<void> {
    // In a real implementation, you'd evaluate poker hands
    // For now, we'll randomly select winners
    const players = hand.game.players;
    const winnerCount = Math.floor(Math.random() * players.length) + 1;
    const winners = players
      .sort(() => Math.random() - 0.5)
      .slice(0, winnerCount)
      .map(p => p.userId);

    // Update hand with winners
    await this.prisma.hand.update({
      where: { id: hand.id },
      data: {
        winnerIds: winners,
        endedAt: new Date(),
        currentRound: PokerRound.SHOWDOWN
      }
    });

    // Distribute pot to winners
    const potPerWinner = Math.floor(hand.pot / winners.length);
    for (const winnerId of winners) {
      await this.prisma.gamePlayer.update({
        where: {
          gameId_userId: {
            gameId: hand.gameId,
            userId: winnerId
          }
        },
        data: {
          chips: { increment: potPerWinner }
        }
      });
    }

    // Update game status
    await this.prisma.game.update({
      where: { id: hand.gameId },
      data: { status: GameStatus.WAITING }
    });

    logger.info('Hand ended', {
      handId: hand.id,
      winners,
      pot: hand.pot,
      potPerWinner
    });
  }

  /**
   * Create a standard 52-card deck
   */
  private createDeck(): string[] {
    const deck: string[] = [];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

    for (const suit of suits) {
      for (const rank of ranks) {
        const card: CardString = `${rank}${suit[0].toUpperCase()}` as CardString;
        deck.push(card);
      }
    }

    return deck;
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            user: true
          }
        },
        currentHand: {
          include: {
            actions: true
          }
        }
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    return game;
  }

  /**
   * Leave a game
   */
  async leaveGame(gameId: string, userId: string): Promise<void> {
    await this.prisma.gamePlayer.updateMany({
      where: {
        gameId,
        userId
      },
      data: {
        isActive: false
      }
    });

    logger.info('Player left game', { gameId, userId });
  }
} 