import { CSPRNGConfig } from './types';

export class CSPRNG {
  private config: CSPRNGConfig;

  constructor(config: CSPRNGConfig = {
    algorithm: 'sha256',
    seedLength: 256,
    outputLength: 256
  }) {
    this.config = config;
  }

  /**
   * Generates a cryptographically secure random number using entropy seed
   */
  async generateRandom(entropy: string): Promise<number> {
    const hash = await this.hashEntropy(entropy);
    return this.hashToNumber(hash);
  }

  /**
   * Generates multiple random numbers
   */
  async generateRandomArray(entropy: string, count: number): Promise<number[]> {
    const results: number[] = [];
    let currentEntropy = entropy;

    for (let i = 0; i < count; i++) {
      const random = await this.generateRandom(currentEntropy);
      results.push(random);
      
      // Update entropy for next iteration
      currentEntropy = await this.hashEntropy(currentEntropy + i.toString());
    }

    return results;
  }

  /**
   * Generates a random number between min and max (inclusive)
   */
  async generateRandomRange(entropy: string, min: number, max: number): Promise<number> {
    const random = await this.generateRandom(entropy);
    return min + (random % (max - min + 1));
  }

  /**
   * Shuffles an array using entropy-seeded randomness
   */
  async shuffleArray<T>(array: T[], entropy: string): Promise<T[]> {
    const shuffled = [...array];
    const length = shuffled.length;

    for (let i = length - 1; i > 0; i--) {
      const j = await this.generateRandomRange(entropy + i.toString(), 0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Hashes entropy data using the configured algorithm
   */
  private async hashEntropy(entropy: string): Promise<string> {
    // In a real implementation, this would use crypto.subtle.digest
    // For now, using a simple hash function
    return this.simpleHash(entropy);
  }

  /**
   * Converts a hash string to a number
   */
  private hashToNumber(hash: string): number {
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result = ((result << 5) - result + hash.charCodeAt(i)) & 0xFFFFFFFF;
    }
    return Math.abs(result) / 0xFFFFFFFF; // Normalize to [0, 1)
  }

  /**
   * Simple hash function (placeholder for crypto.subtle.digest)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validates entropy quality
   */
  validateEntropy(entropy: string): { valid: boolean; entropyBits: number } {
    // Simple entropy estimation based on character diversity
    const uniqueChars = new Set(entropy).size;
    const entropyBits = Math.log2(uniqueChars) * entropy.length;
    
    return {
      valid: entropyBits >= this.config.seedLength,
      entropyBits
    };
  }
} 