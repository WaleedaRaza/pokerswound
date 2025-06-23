export interface EntropySource {
  id: string;
  name: string;
  type: 'twitch' | 'youtube' | 'webcam' | 'audio' | 'motion';
  isActive: boolean;
  lastUpdate: number;
  entropyBits: number;
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

export interface EntropyConfig {
  sources: EntropySource[];
  minEntropyBits: number;
  updateInterval: number; // milliseconds
  fallbackSources: string[];
}

export interface CSPRNGConfig {
  algorithm: 'sha256' | 'sha512' | 'aes';
  seedLength: number;
  outputLength: number;
} 