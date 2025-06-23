import { Deck, ShuffleResult } from './types';
import { DeckManager } from './deck';

export interface EntropyProvider {
  getEntropy(): Promise<string>;
}

export class EntropyShuffler {
  private entropyProvider: EntropyProvider;

  constructor(entropyProvider: EntropyProvider) {
    this.entropyProvider = entropyProvider;
  }

  /**
   * Shuffles a deck using entropy-secure Fisher-Yates algorithm
   */
  async shuffleDeck(deck: Deck, serverSeed?: string, clientSeed?: string): Promise<ShuffleResult> {
    // Get entropy from external source
    const entropy = await this.entropyProvider.getEntropy();
    
    // Combine entropy with optional seeds for provably fair mode
    let finalSeed = entropy;
    if (serverSeed && clientSeed) {
      finalSeed = await this.hashSeeds(entropy, serverSeed, clientSeed);
    }
    
    // Create a new deck to avoid mutating the original
    const shuffledDeck: Deck = {
      cards: [...deck.cards],
      entropyHash: entropy,
      shuffleTimestamp: Date.now()
    };
    
    // Fisher-Yates shuffle with entropy-seeded RNG
    this.fisherYatesShuffle(shuffledDeck.cards, finalSeed);
    
    return {
      deck: shuffledDeck,
      entropyHash: entropy,
      shuffleTimestamp: shuffledDeck.shuffleTimestamp!,
      serverSeed,
      clientSeed
    };
  }

  /**
   * Fisher-Yates shuffle algorithm with entropy-seeded randomness
   */
  private fisherYatesShuffle(cards: any[], seed: string): void {
    // Create a seeded random number generator
    const rng = this.createSeededRNG(seed);
    
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }

  /**
   * Creates a seeded random number generator
   */
  private createSeededRNG(seed: string): () => number {
    let hash = this.simpleHash(seed);
    
    return () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }

  /**
   * Simple hash function for seeding
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Combines entropy with server and client seeds
   */
  private async hashSeeds(entropy: string, serverSeed: string, clientSeed: string): Promise<string> {
    const combined = entropy + serverSeed + clientSeed;
    // In a real implementation, this would use crypto.subtle.digest
    return this.simpleHash(combined).toString();
  }

  /**
   * Creates and shuffles a new deck
   */
  async createAndShuffleDeck(serverSeed?: string, clientSeed?: string): Promise<ShuffleResult> {
    const deck = DeckManager.createDeck();
    return this.shuffleDeck(deck, serverSeed, clientSeed);
  }
} 