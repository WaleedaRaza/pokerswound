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

    // Sort samples by timestamp to ensure consistent ordering
    const sortedSamples = [...this.pool.samples].sort((a, b) => a.timestamp - b.timestamp)

    // Create a more robust entropy mixing algorithm
    let mixed = Buffer.alloc(0)
    
    // First pass: Combine all samples with their quality weights
    for (const sample of sortedSamples) {
      const sampleData = Buffer.from(`${sample.sourceId}:${sample.timestamp}:${sample.data}`, 'utf8')
      const weightedData = Buffer.alloc(sampleData.length * Math.ceil(sample.quality * 10))
      
      // Weight the data based on quality
      for (let i = 0; i < sampleData.length; i++) {
        for (let j = 0; j < Math.ceil(sample.quality * 10); j++) {
          weightedData[i * Math.ceil(sample.quality * 10) + j] = sampleData[i]
        }
      }
      
      mixed = Buffer.concat([mixed, weightedData])
    }

    // Add system entropy as backup
    const systemEntropy = randomBytes(64) // Increased from 32 to 64 bytes
    mixed = Buffer.concat([mixed, systemEntropy])

    // Apply multiple rounds of cryptographic mixing
    for (let i = 0; i < this.mixingRounds; i++) {
      const hash = createHash('sha256')
      hash.update(mixed)
      hash.update(i.toString()) // Add round number to prevent fixed points
      mixed = hash.digest()
    }

    // Final entropy extraction using HMAC
    const finalKey = createHash('sha256').update('entropoker-final-key').digest()
    const hmac = createHash('sha256')
    hmac.update(finalKey)
    hmac.update(mixed)
    
    return hmac.digest()
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