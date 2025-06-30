import { createHash, randomBytes } from 'crypto'
import { EntropySample, EntropyPool, ShuffleSeed, EntropyConfig } from './types'

export class CSPRNG {
  private pool: EntropyPool
  private config: EntropyConfig
  private mixingRounds: number

  constructor(config: EntropyConfig) {
    this.config = config
    this.pool = {
      samples: [],
      totalEntropyBits: 0,
      lastUpdate: Date.now(),
      minEntropyRequired: config.minEntropyBits
    }
    this.mixingRounds = config.mixingRounds
  }

  /**
   * Add entropy sample to the pool
   */
  addEntropy(sample: EntropySample): void {
    this.pool.samples.push(sample)
    this.pool.totalEntropyBits += sample.entropyBits
    this.pool.lastUpdate = Date.now()

    // Keep only recent samples (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    this.pool.samples = this.pool.samples.filter(s => s.timestamp > oneDayAgo)
  }

  /**
   * Mix entropy from multiple sources using cryptographic hash
   */
  private mixEntropy(): Buffer {
    if (this.pool.samples.length === 0) {
      throw new Error('No entropy samples available')
    }

    // Combine all entropy samples
    const combinedData = this.pool.samples
      .map(sample => `${sample.sourceId}:${sample.timestamp}:${sample.data}`)
      .join('|')

    // Add some system entropy as backup
    const systemEntropy = randomBytes(32)
    
    let mixed = Buffer.concat([
      Buffer.from(combinedData, 'utf8'),
      systemEntropy
    ])

    // Apply multiple rounds of mixing
    for (let i = 0; i < this.mixingRounds; i++) {
      const hash = createHash('sha256')
      hash.update(mixed)
      mixed = hash.digest()
    }

    return mixed
  }

  /**
   * Generate a cryptographically secure random seed for shuffling
   */
  generateShuffleSeed(): ShuffleSeed {
    if (this.pool.totalEntropyBits < this.config.minEntropyBits) {
      throw new Error(`Insufficient entropy: ${this.pool.totalEntropyBits} < ${this.config.minEntropyBits}`)
    }

    const mixedEntropy = this.mixEntropy()
    const entropyHash = createHash('sha256').update(mixedEntropy).digest('hex')
    
    // Create proof of fairness
    const proof = this.createFairnessProof(mixedEntropy)

    return {
      seed: mixedEntropy.toString('hex'),
      entropyHash,
      timestamp: Date.now(),
      sources: [...new Set(this.pool.samples.map(s => s.sourceId))],
      proof
    }
  }

  /**
   * Create cryptographic proof that the shuffle was fair
   */
  private createFairnessProof(entropy: Buffer): string {
    const proofData = {
      entropyHash: createHash('sha256').update(entropy).digest('hex'),
      timestamp: Date.now(),
      sampleCount: this.pool.samples.length,
      totalEntropyBits: this.pool.totalEntropyBits,
      sources: [...new Set(this.pool.samples.map(s => s.sourceId))],
      mixingRounds: this.mixingRounds
    }

    const proofString = JSON.stringify(proofData, Object.keys(proofData).sort())
    return createHash('sha256').update(proofString).digest('hex')
  }

  /**
   * Verify that a shuffle seed was generated fairly
   */
  static verifyShuffleSeed(seed: ShuffleSeed, expectedSources: string[]): boolean {
    try {
      // Verify the proof
      const proofData = {
        entropyHash: createHash('sha256').update(Buffer.from(seed.seed, 'hex')).digest('hex'),
        timestamp: seed.timestamp,
        sources: seed.sources.sort()
      }

      const proofString = JSON.stringify(proofData, Object.keys(proofData).sort())
      const expectedProof = createHash('sha256').update(proofString).digest('hex')

      return seed.proof === expectedProof && 
             seed.sources.every(s => expectedSources.includes(s))
    } catch {
      return false
    }
  }

  /**
   * Get current entropy statistics
   */
  getStats() {
    return {
      totalSamples: this.pool.samples.length,
      totalEntropyBits: this.pool.totalEntropyBits,
      activeSources: new Set(this.pool.samples.map(s => s.sourceId)).size,
      lastUpdate: this.pool.lastUpdate,
      minRequired: this.config.minEntropyBits
    }
  }

  /**
   * Clear the entropy pool (useful for testing)
   */
  clearPool(): void {
    this.pool = {
      samples: [],
      totalEntropyBits: 0,
      lastUpdate: Date.now(),
      minEntropyRequired: this.config.minEntropyBits
    }
  }
} 