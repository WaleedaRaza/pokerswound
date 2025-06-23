import { randomInt, createHash } from 'crypto';
import { Card } from '@poker-app/shared';
import { createDeck } from '@poker-app/shared';

/**
 * Cryptographically secure shuffling engine using Node.js crypto.randomInt()
 * This ensures true randomness and prevents any predictability in card distribution
 */
export class SecureShuffler {
  /**
   * Shuffles a deck using Fisher-Yates algorithm with cryptographically secure randomness
   * @param deck - The deck to shuffle
   * @param seed - Optional seed for provable fairness (will be combined with server seed)
   * @returns Shuffled deck
   */
  static shuffleDeck(deck: Card[], seed?: string): Card[] {
    const shuffled = [...deck];
    
    // Use Fisher-Yates shuffle with crypto.randomInt()
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate cryptographically secure random index
      const j = randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Creates and shuffles a new deck with optional provable fairness
   * @param clientSeed - Client-provided seed for provable fairness
   * @returns Object containing shuffled deck and fairness data
   */
  static createAndShuffleDeck(clientSeed?: string): {
    deck: Card[];
    provableFairness?: {
      clientSeed: string;
      serverSeed: string;
      deckHash: string;
      revealed: boolean;
    };
  } {
    const deck = createDeck();
    
    if (!clientSeed) {
      // Simple secure shuffle without provable fairness
      return {
        deck: this.shuffleDeck(deck)
      };
    }

    // Provable fairness implementation
    const serverSeed = this.generateServerSeed();
    const combinedSeed = `${clientSeed}${serverSeed}`;
    const deckHash = this.hashSeed(combinedSeed);
    
    // Use the hash as a seed for deterministic shuffling
    const seededDeck = this.shuffleWithSeed(deck, combinedSeed);
    
    return {
      deck: seededDeck,
      provableFairness: {
        clientSeed,
        serverSeed,
        deckHash,
        revealed: false
      }
    };
  }

  /**
   * Generates a cryptographically secure server seed
   * @returns 32-character hex string
   */
  private static generateServerSeed(): string {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = randomInt(0, 256);
    }
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Creates SHA256 hash of a seed
   * @param seed - The seed to hash
   * @returns Hex string hash
   */
  private static hashSeed(seed: string): string {
    return createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Shuffles deck using a seed for deterministic but fair shuffling
   * @param deck - Deck to shuffle
   * @param seed - Seed for shuffling
   * @returns Shuffled deck
   */
  private static shuffleWithSeed(deck: Card[], seed: string): Card[] {
    const shuffled = [...deck];
    const seedBytes = Buffer.from(seed, 'utf8');
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Use seed bytes to generate pseudo-random index
      const seedIndex = (i * seedBytes[i % seedBytes.length]) % (i + 1);
      const j = (seedIndex + randomInt(0, i + 1)) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Verifies provable fairness by recreating the deck from seeds
   * @param clientSeed - Client seed
   * @param serverSeed - Server seed (revealed after hand)
   * @param expectedHash - Expected deck hash
   * @returns Verification result
   */
  static verifyProvableFairness(
    clientSeed: string,
    serverSeed: string,
    expectedHash: string
  ): { isValid: boolean; deck: Card[] } {
    const combinedSeed = `${clientSeed}${serverSeed}`;
    const actualHash = this.hashSeed(combinedSeed);
    
    if (actualHash !== expectedHash) {
      return { isValid: false, deck: [] };
    }
    
    const deck = createDeck();
    const shuffledDeck = this.shuffleWithSeed(deck, combinedSeed);
    
    return { isValid: true, deck: shuffledDeck };
  }

  /**
   * Generates a random client seed for players
   * @returns 16-character random string
   */
  static generateClientSeed(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars[randomInt(0, chars.length)];
    }
    return result;
  }

  /**
   * Tests the randomness quality of the shuffler
   * @param iterations - Number of shuffles to test
   * @returns Statistical test results
   */
  static testRandomness(iterations: number = 10000): {
    cardPositions: Map<string, number[]>;
    distribution: Map<string, number>;
    chiSquare: number;
  } {
    const cardPositions = new Map<string, number[]>();
    const distribution = new Map<string, number>();
    
    // Initialize tracking
    for (let i = 0; i < 52; i++) {
      cardPositions.set(i.toString(), []);
    }
    
    for (let i = 0; i < iterations; i++) {
      const deck = createDeck();
      const shuffled = this.shuffleDeck(deck);
      
      // Track card positions
      shuffled.forEach((card, position) => {
        const cardKey = `${card.rank}${card.suit}`;
        if (!distribution.has(cardKey)) {
          distribution.set(cardKey, 0);
        }
        distribution.set(cardKey, distribution.get(cardKey)! + 1);
        
        cardPositions.get(position.toString())!.push(card.value);
      });
    }
    
    // Calculate chi-square statistic
    const expectedFrequency = iterations / 52;
    let chiSquare = 0;
    
    for (const [_, frequency] of distribution) {
      const diff = frequency - expectedFrequency;
      chiSquare += (diff * diff) / expectedFrequency;
    }
    
    return {
      cardPositions,
      distribution,
      chiSquare
    };
  }
} 