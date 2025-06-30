export interface EntropySource {
  id: string;
  name: string;
  type: 'twitch' | 'youtube' | 'weather' | 'stock' | 'crypto' | 'random';
  reliability: number; // 0-1, how reliable this source is
  latency: number; // milliseconds
  entropyPerSecond: number; // bits per second
}

export interface EntropySample {
  sourceId: string;
  timestamp: number;
  data: string | Buffer;
  entropyBits: number;
  quality: number; // 0-1, quality of this sample
}

export interface EntropyPool {
  samples: EntropySample[];
  totalEntropyBits: number;
  lastUpdate: number;
  minEntropyRequired: number;
}

export interface EntropyMixer {
  pool: EntropyPool;
  sources: EntropySource[];
  mixingAlgorithm: 'sha256' | 'blake2b' | 'chacha20';
  outputLength: number; // bytes
}

export interface ShuffleSeed {
  seed: string; // hex string
  entropyHash: string; // hash of all entropy used
  timestamp: number;
  sources: string[]; // source IDs used
  proof: string; // cryptographic proof of fairness
}

export interface EntropyConfig {
  minSources: number;
  minEntropyBits: number;
  mixingRounds: number;
  outputFormat: 'hex' | 'base64' | 'bytes';
  sources: EntropySource[];
}

export interface EntropyStats {
  totalSamples: number;
  totalEntropyBits: number;
  activeSources: number;
  averageLatency: number;
  reliabilityScore: number;
  lastUpdate: number;
}

export interface EntropyData {
  sourceId: string;
  timestamp: number;
  data: Buffer | string;
  entropyBits: number;
  hash: string;
}

export interface EntropyProvider {
  getEntropy(): Promise<string>;
  getEntropyWithMetadata(): Promise<EntropyData>;
  isAvailable(): Promise<boolean>;
}

export interface EntropyProcessor {
  process(data: Buffer | string): Promise<string>;
  estimateEntropyBits(data: Buffer | string): number;
}

export interface CSPRNGConfig {
  algorithm: 'sha256' | 'sha512' | 'aes';
  seedLength: number;
  outputLength: number;
} 