import { createHash } from 'crypto';

/**
 * Estimate entropy bits in a string or buffer
 */
export function estimateEntropyBits(data: string | Buffer): number {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'utf8');
  }

  // Count byte frequencies
  const byteCounts = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    byteCounts[data[i]]++;
  }

  // Calculate entropy using Shannon's formula
  let entropy = 0;
  const totalBytes = data.length;

  for (let i = 0; i < 256; i++) {
    if (byteCounts[i] > 0) {
      const probability = byteCounts[i] / totalBytes;
      entropy -= probability * Math.log2(probability);
    }
  }

  return Math.floor(entropy * totalBytes);
}

/**
 * Generate a hash of entropy data
 */
export function hashEntropy(data: string | Buffer): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Validate entropy quality
 */
export function validateEntropyQuality(entropyBits: number, minRequired: number = 128): boolean {
  return entropyBits >= minRequired;
}

/**
 * Calculate entropy rate (bits per second)
 */
export function calculateEntropyRate(samples: Array<{ entropyBits: number; timestamp: number }>): number {
  if (samples.length < 2) return 0;

  const totalEntropy = samples.reduce((sum, sample) => sum + sample.entropyBits, 0);
  const timeSpan = samples[samples.length - 1].timestamp - samples[0].timestamp;
  const seconds = timeSpan / 1000;

  return seconds > 0 ? totalEntropy / seconds : 0;
}

/**
 * Mix multiple entropy sources
 */
export function mixEntropySources(sources: Array<{ data: string | Buffer; weight: number }>): Buffer {
  if (sources.length === 0) {
    throw new Error('No entropy sources provided');
  }

  // Combine all sources with their weights
  let combined = Buffer.alloc(0);
  
  for (const source of sources) {
    const data = typeof source.data === 'string' ? Buffer.from(source.data, 'utf8') : source.data;
    const weightedData = Buffer.alloc(data.length * source.weight);
    
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < source.weight; j++) {
        weightedData[i * source.weight + j] = data[i];
      }
    }
    
    combined = Buffer.concat([combined, weightedData]);
  }

  // Hash the combined data
  const hash = createHash('sha256');
  hash.update(combined);
  return hash.digest();
}

/**
 * Generate a random seed from entropy
 */
export function generateSeed(entropy: Buffer, length: number = 32): Buffer {
  const hash = createHash('sha256');
  hash.update(entropy);
  return hash.digest().slice(0, length);
}

/**
 * Convert entropy to a number between 0 and 1
 */
export function entropyToNumber(entropy: Buffer): number {
  const hash = createHash('sha256');
  hash.update(entropy);
  const digest = hash.digest();
  
  // Use first 8 bytes to create a 64-bit number
  const value = digest.readBigUInt64BE(0);
  return Number(value) / Number(BigInt(2) ** BigInt(64));
}

/**
 * Create a cryptographic proof of entropy mixing
 */
export function createMixingProof(
  sources: Array<{ id: string; data: string | Buffer }>,
  result: Buffer,
  timestamp: number
): string {
  const proofData = {
    sources: sources.map(s => ({ id: s.id, hash: hashEntropy(s.data) })),
    resultHash: hashEntropy(result),
    timestamp
  };

  const proofString = JSON.stringify(proofData, Object.keys(proofData).sort());
  return hashEntropy(proofString);
} 