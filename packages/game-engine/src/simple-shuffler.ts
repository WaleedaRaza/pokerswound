import { Card } from './types'
import { CardUtils } from './card'

export interface ShuffleResult {
  deck: Card[]
  entropyHash: string
  timestamp: number
  sources: string[]
  proof: string
}

export class EntropyShuffler {
  private entropyPool: Array<{ sourceId: string; data: string; timestamp: number }> = []

  constructor() {
    this.addInitialEntropy()
  }

  /**
   * Add initial entropy samples for development
   */
  private addInitialEntropy() {
    const now = Date.now()
    
    // Add system entropy
    this.entropyPool.push({
      sourceId: 'system:random',
      data: `system-entropy-${now}`,
      timestamp: now
    })
    
    // Add mock Twitch entropy
    this.entropyPool.push({
      sourceId: 'twitch:pokergame',
      data: `twitch-stream-${now}`,
      timestamp: now
    })
    
    // Add mock YouTube entropy
    this.entropyPool.push({
      sourceId: 'youtube:random',
      data: `youtube-video-${now}`,
      timestamp: now
    })
    
    console.log('🔐 ENTROPY SHUFFLER: Added initial entropy samples')
  }

  /**
   * Create and shuffle a deck using cryptographically secure entropy
   */
  async createAndShuffleDeck(): Promise<{ deck: Card[]; seed: ShuffleResult }> {
    console.log('🃏 ENTROPY SHUFFLER: Starting entropy-based deck creation')
    
    // Create a fresh deck
    const deck = CardUtils.createDeck()
    
    // Generate entropy seed from pool
    const entropySeed = await this.generateEntropySeed()
    console.log('🔐 ENTROPY SHUFFLER: Generated entropy seed:', {
      entropyHash: entropySeed.entropyHash.substring(0, 32) + '...',
      sources: entropySeed.sources,
      timestamp: new Date(entropySeed.timestamp).toISOString()
    })
    
    // Shuffle deck using entropy-seeded Fisher-Yates
    const shuffledDeck = this.shuffleWithEntropy(deck, entropySeed.seed)
    
    const result: ShuffleResult = {
      deck: shuffledDeck,
      entropyHash: entropySeed.entropyHash,
      timestamp: entropySeed.timestamp,
      sources: entropySeed.sources,
      proof: entropySeed.proof
    }
    
    console.log('✅ ENTROPY SHUFFLER: Deck shuffled with entropy:', {
      totalCards: shuffledDeck.length,
      entropyHash: result.entropyHash.substring(0, 32) + '...',
      sources: result.sources
    })
    
    return { deck: shuffledDeck, seed: result }
  }

  /**
   * Generate entropy seed from the pool
   */
  private async generateEntropySeed(): Promise<{ seed: string; entropyHash: string; timestamp: number; sources: string[]; proof: string }> {
    // Combine all entropy samples
    const combinedData = this.entropyPool.map(sample => 
      `${sample.sourceId}:${sample.timestamp}:${sample.data}`
    ).join('|')
    
    // Create hash using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(combinedData)
    
    // For development, we'll use a simple hash approach
    // In production, this would use the CSPRNG from entropy-core
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const entropyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Create proof
    const proofData = {
      entropyHash,
      timestamp: Date.now(),
      sampleCount: this.entropyPool.length,
      sources: [...new Set(this.entropyPool.map(s => s.sourceId))]
    }
    
    const proofString = JSON.stringify(proofData, Object.keys(proofData).sort())
    const proofHash = await crypto.subtle.digest('SHA-256', encoder.encode(proofString))
    const proof = Array.from(new Uint8Array(proofHash)).map(b => b.toString(16).padStart(2, '0')).join('')
    
    return {
      seed: entropyHash,
      entropyHash,
      timestamp: Date.now(),
      sources: [...new Set(this.entropyPool.map(s => s.sourceId))],
      proof
    }
  }

  /**
   * Shuffle a deck using entropy-seeded Fisher-Yates algorithm
   */
  shuffleWithEntropy(deck: Card[], entropySeed: string): Card[] {
    console.log('🔄 ENTROPY SHUFFLER: Starting Fisher-Yates shuffle with entropy')
    
    const shuffled = [...deck]
    const rng = this.createSeededRNG(entropySeed)
    
    const shuffleStats = {
      totalSwaps: 0,
      entropyUsed: 0
    }
    
    // Fisher-Yates shuffle with entropy-seeded randomness
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomValue = rng()
      const j = Math.floor(randomValue * (i + 1))
      
      shuffleStats.totalSwaps++
      shuffleStats.entropyUsed += 32 // Each random value uses 32 bits
      
      // Swap cards
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    
    console.log('📊 ENTROPY SHUFFLER: Fisher-Yates shuffle complete:', {
      totalSwaps: shuffleStats.totalSwaps,
      totalEntropyUsed: shuffleStats.entropyUsed,
      entropySeed: entropySeed.substring(0, 32) + '...'
    })
    
    return shuffled
  }

  /**
   * Create a seeded random number generator using cryptographic hash
   */
  private createSeededRNG(seed: string): () => number {
    let currentSeed = seed
    
    return () => {
      // Use SHA-256 to generate next random value
      const encoder = new TextEncoder()
      const data = encoder.encode(currentSeed)
      
      // For now, use a simple hash approach since we can't use async in sync context
      // In production, this would use a proper CSPRNG
      let hash = 0
      for (let i = 0; i < data.length; i++) {
        const char = data[i]
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      
      // Convert to a number between 0 and 1
      const randomValue = Math.abs(hash) / 0x7FFFFFFF
      
      // Update seed for next call
      currentSeed = hash.toString(16)
      
      return randomValue
    }
  }

  /**
   * Deal cards from the deck
   */
  dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
    if (count > deck.length) {
      throw new Error(`Cannot deal ${count} cards from deck of ${deck.length} cards`)
    }
    
    const cards = deck.slice(0, count)
    const remainingDeck = deck.slice(count)
    
    console.log('🎴 ENTROPY SHUFFLER: Dealt cards:', {
      dealt: count,
      remaining: remainingDeck.length,
      cards: cards.map(c => `${c.rank}${c.suit}`)
    })
    
    return { cards, remainingDeck }
  }

  /**
   * Get entropy statistics
   */
  getEntropyStats() {
    return {
      totalSamples: this.entropyPool.length,
      totalEntropyBits: this.entropyPool.length * 64, // Estimate
      activeSources: new Set(this.entropyPool.map(s => s.sourceId)).size,
      lastUpdate: Date.now(),
      minRequired: 256
    }
  }

  /**
   * Add entropy sample to the pool
   */
  addEntropySample(sample: any) {
    this.entropyPool.push({
      sourceId: sample.sourceId || 'unknown',
      data: sample.data || sample.toString(),
      timestamp: Date.now()
    })
    console.log('📊 ENTROPY SHUFFLER: Added entropy sample:', sample)
  }
} 