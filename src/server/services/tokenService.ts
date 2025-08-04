import { PrismaClient } from '@prisma/client';
import { Transaction, TransactionType, TokenPurchaseRequest } from '../../types';
import { logger } from '../utils/logger';

export class TokenService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get user's token balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.tokenBalance;
  }

  /**
   * Add tokens to user's balance
   */
  async addTokens(userId: string, amount: number, reason: string, reference?: string): Promise<number> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update user balance
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          tokenBalance: { increment: amount }
        },
        select: { tokenBalance: true }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.PURCHASE,
          amount,
          description: reason,
          reference
        }
      });

      return user.tokenBalance;
    });

    logger.info('Tokens added to user', {
      userId,
      amount,
      reason,
      newBalance: result
    });

    return result;
  }

  /**
   * Deduct tokens from user's balance
   */
  async deductTokens(userId: string, amount: number, reason: string, reference?: string): Promise<number> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Check current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.tokenBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          tokenBalance: { decrement: amount }
        },
        select: { tokenBalance: true }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.LOSS,
          amount: -amount,
          description: reason,
          reference
        }
      });

      return updatedUser.tokenBalance;
    });

    logger.info('Tokens deducted from user', {
      userId,
      amount,
      reason,
      newBalance: result
    });

    return result;
  }

  /**
   * Process token purchase
   */
  async processPurchase(data: TokenPurchaseRequest): Promise<Transaction> {
    const { amount, paymentMethod, paymentToken } = data;

    // In a real implementation, you would:
    // 1. Validate the payment token with the payment processor
    // 2. Process the payment
    // 3. Only add tokens if payment is successful

    // For now, we'll simulate a successful payment
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: 'temp-user-id', // This would come from the authenticated user
        type: TransactionType.PURCHASE,
        amount,
        description: `Token purchase via ${paymentMethod}`,
        reference: paymentToken
      }
    });

    logger.info('Token purchase processed', {
      amount,
      paymentMethod,
      transactionId: transaction.id
    });

    return transaction;
  }

  /**
   * Award bonus tokens
   */
  async awardBonus(userId: string, amount: number, reason: string): Promise<number> {
    const newBalance = await this.addTokens(userId, amount, `Bonus: ${reason}`, 'bonus');

    logger.info('Bonus tokens awarded', {
      userId,
      amount,
      reason,
      newBalance
    });

    return newBalance;
  }

  /**
   * Award daily bonus
   */
  async awardDailyBonus(userId: string): Promise<number> {
    // Check if user already received daily bonus today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingBonus = await this.prisma.transaction.findFirst({
      where: {
        userId,
        type: TransactionType.BONUS,
        description: { contains: 'Daily bonus' },
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingBonus) {
      throw new Error('Daily bonus already claimed today');
    }

    const bonusAmount = 50; // Daily bonus amount
    const newBalance = await this.addTokens(
      userId,
      bonusAmount,
      'Daily bonus',
      'daily-bonus'
    );

    logger.info('Daily bonus awarded', {
      userId,
      amount: bonusAmount,
      newBalance
    });

    return newBalance;
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      }),
      this.prisma.transaction.count({
        where: { userId }
      })
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return transaction;
  }

  /**
   * Process game winnings
   */
  async processGameWinnings(userId: string, amount: number, gameId: string): Promise<number> {
    const newBalance = await this.addTokens(
      userId,
      amount,
      `Game winnings from game ${gameId}`,
      `game-${gameId}`
    );

    logger.info('Game winnings processed', {
      userId,
      amount,
      gameId,
      newBalance
    });

    return newBalance;
  }

  /**
   * Process game losses
   */
  async processGameLoss(userId: string, amount: number, gameId: string): Promise<number> {
    const newBalance = await this.deductTokens(
      userId,
      amount,
      `Game loss from game ${gameId}`,
      `game-${gameId}`
    );

    logger.info('Game loss processed', {
      userId,
      amount,
      gameId,
      newBalance
    });

    return newBalance;
  }

  /**
   * Refund tokens
   */
  async refundTokens(userId: string, amount: number, reason: string, originalTransactionId?: string): Promise<number> {
    const newBalance = await this.addTokens(
      userId,
      amount,
      `Refund: ${reason}`,
      originalTransactionId || 'refund'
    );

    logger.info('Tokens refunded', {
      userId,
      amount,
      reason,
      originalTransactionId,
      newBalance
    });

    return newBalance;
  }

  /**
   * Get token statistics for admin
   */
  async getTokenStatistics(): Promise<{
    totalTokensInCirculation: number;
    totalTransactions: number;
    totalPurchases: number;
    totalBonuses: number;
    averageBalance: number;
  }> {
    const [
      totalTokensInCirculation,
      totalTransactions,
      totalPurchases,
      totalBonuses,
      averageBalance
    ] = await Promise.all([
      this.prisma.user.aggregate({
        _sum: { tokenBalance: true }
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: { type: TransactionType.PURCHASE }
      }),
      this.prisma.transaction.count({
        where: { type: TransactionType.BONUS }
      }),
      this.prisma.user.aggregate({
        _avg: { tokenBalance: true }
      })
    ]);

    return {
      totalTokensInCirculation: totalTokensInCirculation._sum.tokenBalance || 0,
      totalTransactions,
      totalPurchases,
      totalBonuses,
      averageBalance: averageBalance._avg.tokenBalance || 0
    };
  }

  /**
   * Validate token amount
   */
  validateTokenAmount(amount: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000 tokens');
    }

    if (!Number.isInteger(amount)) {
      errors.push('Amount must be a whole number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get token packages for purchase
   */
  getTokenPackages(): Array<{
    id: string;
    name: string;
    tokens: number;
    price: number;
    bonus?: number;
  }> {
    return [
      {
        id: 'starter',
        name: 'Starter Pack',
        tokens: 1000,
        price: 4.99
      },
      {
        id: 'popular',
        name: 'Popular Pack',
        tokens: 5000,
        price: 19.99,
        bonus: 500
      },
      {
        id: 'premium',
        name: 'Premium Pack',
        tokens: 15000,
        price: 49.99,
        bonus: 2000
      },
      {
        id: 'mega',
        name: 'Mega Pack',
        tokens: 50000,
        price: 149.99,
        bonus: 10000
      }
    ];
  }
} 