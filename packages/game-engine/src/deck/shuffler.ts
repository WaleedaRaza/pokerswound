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
    console.log('🃏 GAME ENGINE: Starting entropy-based deck shuffle');
    
    // Get entropy from external source
    const entropy = await this.entropyProvider.getEntropy();
    console.log('🔐 GAME ENGINE: Real entropy obtained:', {
      entropyLength: entropy.length,
      entropyPreview: entropy.substring(0, 32) + '...',
      source: 'RealEntropyProvider'
    });
    
    // Combine entropy with optional seeds for provably fair mode
    let finalSeed = entropy;
    if (serverSeed && clientSeed) {
      finalSeed = await this.hashSeeds(entropy, serverSeed, clientSeed);
      console.log('🔗 GAME ENGINE: Combined seeds for provably fair mode:', {
        serverSeed: serverSeed.substring(0, 16) + '...',
        clientSeed: clientSeed.substring(0, 16) + '...',
        finalSeed: finalSeed.substring(0, 32) + '...'
      });
    }
    
    // Create a new deck to avoid mutating the original
    const shuffledDeck: Deck = {
      cards: [...deck.cards],
      entropyHash: entropy,
      shuffleTimestamp: Date.now()
    };
    
    console.log('📊 GAME ENGINE: Shuffling deck with', shuffledDeck.cards.length, 'cards');
    console.log('🎲 GAME ENGINE: Using Fisher-Yates algorithm with entropy-seeded RNG');
    
    // Fisher-Yates shuffle with entropy-seeded RNG
    this.fisherYatesShuffle(shuffledDeck.cards, finalSeed);
    
    console.log('✅ GAME ENGINE: Deck shuffle complete!');
    console.log('📈 GAME ENGINE: Shuffle statistics:', {
      totalCards: shuffledDeck.cards.length,
      entropyUsed: entropy.length * 4, // Each character is ~4 bits
      shuffleTimestamp: new Date(shuffledDeck.shuffleTimestamp!).toISOString(),
      entropyHash: shuffledDeck.entropyHash?.substring(0, 32) + '...'
    });
    
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
    console.log('🔄 GAME ENGINE: Starting Fisher-Yates shuffle with entropy seed');
    
    // Create a seeded random number generator
    const rng = this.createSeededRNG(seed);
    
    const shuffleStats = {
      totalSwaps: 0,
      randomValues: [] as number[],
      entropyUsed: 0
    };
    
    for (let i = cards.length - 1; i > 0; i--) {
      const randomValue = rng();
      const j = Math.floor(randomValue * (i + 1));
      
      shuffleStats.totalSwaps++;
      shuffleStats.randomValues.push(randomValue);
      shuffleStats.entropyUsed += 32; // Each random value uses 32 bits
      
      console.log(`🔄 GAME ENGINE: Swap ${i} ↔ ${j}:`, {
        cardI: `${cards[i].rank}${cards[i].suit}`,
        cardJ: `${cards[j].rank}${cards[j].suit}`,
        randomValue: randomValue.toFixed(6),
        entropyUsed: shuffleStats.entropyUsed
      });
      
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    console.log('📊 GAME ENGINE: Fisher-Yates shuffle complete!', {
      totalSwaps: shuffleStats.totalSwaps,
      totalEntropyUsed: shuffleStats.entropyUsed,
      averageRandomValue: shuffleStats.randomValues.reduce((a, b) => a + b, 0) / shuffleStats.randomValues.length,
      randomValueDistribution: {
        min: Math.min(...shuffleStats.randomValues),
        max: Math.max(...shuffleStats.randomValues)
      }
    });
  }

  /**
   * Creates a seeded random number generator using cryptographic hash
   */
  private createSeededRNG(seed: string): () => number {
    let counter = 0;
    let currentHash = this.cryptographicHash(seed);
    
    return () => {
      // Generate new hash for each random number
      const newSeed = seed + counter.toString();
      currentHash = this.cryptographicHash(newSeed);
      counter++;
      
      // Convert hash to number between 0 and 1
      const hashHex = currentHash.toString('hex');
      const hashInt = parseInt(hashHex.substring(0, 8), 16);
      return hashInt / 0xffffffff;
    };
  }

  /**
   * Cryptographic hash function using SHA-256
   */
  private cryptographicHash(input: string): Buffer {
    const { createHash } = require('crypto');
    const hash = createHash('sha256');
    hash.update(input);
    return hash.digest();
  }

  /**
   * Combines entropy with server and client seeds using cryptographic hash
   */
  private async hashSeeds(entropy: string, serverSeed: string, clientSeed: string): Promise<string> {
    const combined = entropy + serverSeed + clientSeed;
    const hash = this.cryptographicHash(combined);
    return hash.toString('hex');
  }

  /**
   * Creates and shuffles a new deck
   */
  async createAndShuffleDeck(serverSeed?: string, clientSeed?: string): Promise<ShuffleResult> {
    const deck = DeckManager.createDeck();
    return this.shuffleDeck(deck, serverSeed, clientSeed);
  }
} 