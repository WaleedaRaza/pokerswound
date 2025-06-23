import { EntropyData, EntropySource } from './types';

/**
 * Combines multiple entropy sources into a single entropy string
 */
export function combineEntropySources(entropyData: EntropyData[]): string {
  if (entropyData.length === 0) {
    throw new Error('No entropy data provided');
  }

  // Sort by timestamp to ensure consistent ordering
  const sortedData = entropyData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Combine all entropy hashes
  const combined = sortedData.map(data => data.hash).join('');
  
  return simpleHash(combined);
}

/**
 * Validates entropy quality
 */
export function validateEntropyQuality(entropy: string, minBits: number = 128): boolean {
  const uniqueChars = new Set(entropy).size;
  const entropyBits = Math.log2(uniqueChars) * entropy.length;
  
  return entropyBits >= minBits;
}

/**
 * Estimates entropy bits from a string
 */
export function estimateEntropyBits(data: string): number {
  const uniqueChars = new Set(data).size;
  return Math.log2(uniqueChars) * data.length;
}

/**
 * Generates a timestamp-based entropy fallback
 */
export function generateFallbackEntropy(): string {
  const timestamp = Date.now();
  const random = Math.random();
  const processId = process.pid || 0;
  
  return simpleHash(`${timestamp}_${random}_${processId}`);
}

/**
 * Simple hash function for development
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Formats entropy data for logging
 */
export function formatEntropyData(data: EntropyData): string {
  return `[${data.sourceId}] ${data.entropyBits} bits at ${new Date(data.timestamp).toISOString()}`;
}

/**
 * Checks if entropy source is stale
 */
export function isEntropyStale(source: EntropySource, maxAgeMs: number = 60000): boolean {
  return Date.now() - source.lastUpdate > maxAgeMs;
}

/**
 * Calculates entropy source health score
 */
export function calculateSourceHealth(source: EntropySource): number {
  const age = Date.now() - source.lastUpdate;
  const ageScore = Math.max(0, 1 - (age / 60000)); // Decay over 1 minute
  const entropyScore = Math.min(1, source.entropyBits / 256); // Normalize to 256 bits
  
  return (ageScore + entropyScore) / 2;
} 