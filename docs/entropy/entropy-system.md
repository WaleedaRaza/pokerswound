# ENTROPY SYSTEM

## Overview
The entropy system provides cryptographically secure randomness for the poker engine by combining multiple external entropy sources with local system entropy. This ensures fair, unpredictable card shuffling that cannot be manipulated by any party.

## Architecture

### 1. Multi-Source Entropy Collection
```
External APIs → Entropy Service → Hash Function → Seed → Shuffle Algorithm
     ↓              ↓              ↓           ↓      ↓
  YouTube API   Collection    SHA-256 Hash   RNG   Fisher-Yates
  Twitch API    & Validation                Seed   Shuffle
  System Entropy
  Network Entropy
```

### 2. Entropy Sources

#### Primary Sources (External APIs)
**YouTube API**:
- Trending video statistics
- View counts, like counts, comment counts
- Video timestamps and durations
- Channel subscriber counts
- Live stream viewer counts

**Twitch API**:
- Live stream viewer counts
- Chat message rates
- Stream titles and descriptions
- Channel follower counts
- Stream uptime and duration

#### Secondary Sources (System)
**System Entropy**:
- Hardware random number generation
- CPU timing variations
- Memory allocation patterns
- Process ID and thread information
- System load and performance metrics

**Network Entropy**:
- Network packet timing
- Connection latency variations
- DNS resolution times
- Network interface statistics
- Connection pool states

### 3. Entropy Service Implementation

```typescript
class EntropyService {
  private youtubeApi: YouTubeAPI;
  private twitchApi: TwitchAPI;
  private cache: Map<string, string> = new Map();
  private auditLogger: AuditLogger;
  private fallbackSources: EntropySource[];

  constructor() {
    this.youtubeApi = new YouTubeAPI();
    this.twitchApi = new TwitchAPI();
    this.auditLogger = new AuditLogger();
    this.fallbackSources = [
      new SystemEntropySource(),
      new NetworkEntropySource(),
      new HardwareEntropySource()
    ];
  }

  async getSeed(): Promise<string> {
    try {
      // Collect entropy from all sources
      const entropySources = await this.collectEntropyFromAllSources();
      
      // Combine and hash
      const combinedEntropy = this.combineEntropySources(entropySources);
      const seed = this.hashEntropy(combinedEntropy);
      
      // Cache and audit
      await this.cacheAndAuditSeed(seed, entropySources);
      
      return seed;
    } catch (error) {
      return await this.getFallbackSeed();
    }
  }
}
```

## Entropy Collection

### 1. YouTube API Integration
```typescript
class YouTubeAPI {
  private apiKey: string;
  private baseUrl: string = 'https://www.googleapis.com/youtube/v3';

  async getTrendingVideos(): Promise<YouTubeVideo[]> {
    const response = await fetch(
      `${this.baseUrl}/videos?part=statistics,snippet&chart=mostPopular&maxResults=50&key=${this.apiKey}`
    );
    
    const data = await response.json();
    return data.items.map(this.mapVideoData);
  }

  async getLiveStreams(): Promise<YouTubeLiveStream[]> {
    const response = await fetch(
      `${this.baseUrl}/search?part=snippet&eventType=live&type=video&maxResults=20&key=${this.apiKey}`
    );
    
    const data = await response.json();
    return data.items.map(this.mapLiveStreamData);
  }

  private mapVideoData(item: any): YouTubeVideo {
    return {
      id: item.id,
      title: item.snippet.title,
      viewCount: parseInt(item.statistics.viewCount || '0'),
      likeCount: parseInt(item.statistics.likeCount || '0'),
      commentCount: parseInt(item.statistics.commentCount || '0'),
      publishedAt: item.snippet.publishedAt,
      channelId: item.snippet.channelId
    };
  }
}
```

### 2. Twitch API Integration
```typescript
class TwitchAPI {
  private clientId: string;
  private accessToken: string;
  private baseUrl: string = 'https://api.twitch.tv/helix';

  async getLiveStreams(): Promise<TwitchLiveStream[]> {
    const response = await fetch(`${this.baseUrl}/streams?first=20`, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    const data = await response.json();
    return data.data.map(this.mapStreamData);
  }

  async getStreamChat(streamId: string): Promise<TwitchChatMessage[]> {
    const response = await fetch(`${this.baseUrl}/chat/messages?broadcaster_id=${streamId}`, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    const data = await response.json();
    return data.data.map(this.mapChatData);
  }

  private mapStreamData(item: any): TwitchLiveStream {
    return {
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      title: item.title,
      viewerCount: item.viewer_count,
      startedAt: item.started_at,
      language: item.language,
      gameId: item.game_id
    };
  }
}
```

### 3. System Entropy Collection
```typescript
class SystemEntropySource {
  async collectEntropy(): Promise<SystemEntropy> {
    return {
      timestamp: Date.now(),
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      networkInterfaces: os.networkInterfaces()
    };
  }

  async getHardwareEntropy(): Promise<HardwareEntropy> {
    return {
      randomBytes: crypto.randomBytes(32),
      randomInt: crypto.randomInt(0, Number.MAX_SAFE_INTEGER),
      randomFloat: Math.random(),
      performanceNow: performance.now()
    };
  }
}
```

## Entropy Processing

### 1. Entropy Combination
```typescript
class EntropyProcessor {
  combineEntropySources(sources: EntropySource[]): string {
    // Convert all entropy sources to strings
    const entropyStrings = sources.map(source => this.serializeEntropy(source));
    
    // Concatenate with separators
    const combined = entropyStrings.join('|');
    
    // Add timestamp for additional randomness
    const timestamp = Date.now().toString();
    
    return `${combined}|${timestamp}`;
  }

  private serializeEntropy(source: EntropySource): string {
    switch (source.type) {
      case 'youtube':
        return this.serializeYouTubeEntropy(source.data);
      case 'twitch':
        return this.serializeTwitchEntropy(source.data);
      case 'system':
        return this.serializeSystemEntropy(source.data);
      case 'network':
        return this.serializeNetworkEntropy(source.data);
      default:
        return JSON.stringify(source.data);
    }
  }

  private serializeYouTubeEntropy(data: YouTubeVideo[]): string {
    return data.map(video => 
      `${video.id}|${video.viewCount}|${video.likeCount}|${video.commentCount}`
    ).join('|');
  }

  private serializeTwitchEntropy(data: TwitchLiveStream[]): string {
    return data.map(stream => 
      `${stream.id}|${stream.viewerCount}|${stream.title}|${stream.startedAt}`
    ).join('|');
  }
}
```

### 2. Cryptographic Hashing
```typescript
class EntropyHasher {
  hashEntropy(entropy: string): string {
    // Use SHA-256 for cryptographic security
    const hash = crypto.createHash('sha256');
    hash.update(entropy);
    return hash.digest('hex');
  }

  validateEntropyQuality(entropy: string): boolean {
    // Check entropy quality using statistical tests
    const byteArray = Buffer.from(entropy, 'hex');
    
    // Perform basic statistical tests
    const tests = [
      this.frequencyTest(byteArray),
      this.runsTest(byteArray),
      this.serialTest(byteArray)
    ];
    
    return tests.every(test => test.passed);
  }

  private frequencyTest(data: Buffer): TestResult {
    const ones = data.reduce((count, byte) => 
      count + byte.toString(2).split('1').length - 1, 0
    );
    const totalBits = data.length * 8;
    const ratio = ones / totalBits;
    
    return {
      passed: ratio > 0.4 && ratio < 0.6,
      name: 'frequency',
      value: ratio
    };
  }
}
```

## Seed Generation and Usage

### 1. Seed Generation
```typescript
class SeedGenerator {
  async generateSeed(): Promise<EntropySeed> {
    const entropyService = new EntropyService();
    const rawSeed = await entropyService.getSeed();
    
    return {
      seed: rawSeed,
      timestamp: Date.now(),
      sources: await entropyService.getSourceInfo(),
      quality: this.assessSeedQuality(rawSeed)
    };
  }

  private assessSeedQuality(seed: string): SeedQuality {
    const entropy = this.calculateEntropy(seed);
    const randomness = this.assessRandomness(seed);
    
    return {
      entropyBits: entropy,
      randomnessScore: randomness,
      quality: this.determineQualityLevel(entropy, randomness)
    };
  }

  private calculateEntropy(seed: string): number {
    const byteArray = Buffer.from(seed, 'hex');
    const frequency = new Array(256).fill(0);
    
    for (const byte of byteArray) {
      frequency[byte]++;
    }
    
    let entropy = 0;
    const total = byteArray.length;
    
    for (const count of frequency) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
  }
}
```

### 2. Seeded Random Number Generation
```typescript
class SeededRNG {
  private seed: string;
  private generator: any;

  constructor(seed: string) {
    this.seed = seed;
    this.generator = this.initializeGenerator(seed);
  }

  private initializeGenerator(seed: string): any {
    // Use a cryptographically secure seeded RNG
    const seedBytes = Buffer.from(seed, 'hex');
    const generator = new (require('seedrandom'))(seedBytes);
    
    // Mix in additional entropy
    generator.seedrandom(seedBytes);
    
    return generator;
  }

  nextInt(min: number, max: number): number {
    const range = max - min;
    const random = this.generator();
    return Math.floor(random * range) + min;
  }

  nextFloat(): number {
    return this.generator();
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    
    // Fisher-Yates shuffle with seeded RNG
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
}
```

## Audit and Verification

### 1. Entropy Audit Logging
```typescript
class EntropyAuditLogger {
  async logEntropySeed(seed: EntropySeed, sources: EntropySource[]): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      seed: seed.seed,
      sources: sources.map(source => ({
        type: source.type,
        data: this.sanitizeSourceData(source.data),
        timestamp: source.timestamp
      })),
      quality: seed.quality,
      gameId: seed.gameId,
      handNumber: seed.handNumber
    };
    
    await this.databaseService.saveAuditLog(auditEntry);
  }

  private sanitizeSourceData(data: any): any {
    // Remove sensitive information while preserving entropy value
    if (data.viewerCount) {
      return { viewerCount: data.viewerCount, timestamp: data.timestamp };
    }
    if (data.viewCount) {
      return { viewCount: data.viewCount, timestamp: data.timestamp };
    }
    return { timestamp: data.timestamp };
  }
}
```

### 2. Entropy Verification
```typescript
class EntropyVerifier {
  async verifySeed(seed: string, gameId: string): Promise<VerificationResult> {
    const auditEntry = await this.databaseService.getAuditLog(gameId);
    
    if (!auditEntry) {
      return { verified: false, reason: 'No audit entry found' };
    }
    
    // Verify seed matches audit entry
    if (auditEntry.seed !== seed) {
      return { verified: false, reason: 'Seed mismatch' };
    }
    
    // Verify entropy quality
    const quality = this.assessSeedQuality(seed);
    if (quality.entropyBits < 7.5) {
      return { verified: false, reason: 'Insufficient entropy' };
    }
    
    return { verified: true, quality };
  }

  async verifyShuffle(deck: Card[], seed: string): Promise<ShuffleVerification> {
    // Recreate shuffle with same seed
    const rng = new SeededRNG(seed);
    const recreatedDeck = rng.shuffleArray([...new Array(52)].map((_, i) => i));
    
    // Compare with actual deck
    const actualDeck = deck.map(card => card.toIndex());
    
    return {
      verified: JSON.stringify(recreatedDeck) === JSON.stringify(actualDeck),
      recreatedDeck,
      actualDeck
    };
  }
}
```

## Fallback Strategies

### 1. Primary Fallback Sources
```typescript
class FallbackEntropySource {
  async getFallbackSeed(): Promise<string> {
    const sources = [
      await this.getSystemEntropy(),
      await this.getNetworkEntropy(),
      await this.getHardwareEntropy(),
      await this.getTimeEntropy()
    ];
    
    const combined = this.combineSources(sources);
    return this.hashEntropy(combined);
  }

  private async getSystemEntropy(): Promise<string> {
    const systemInfo = {
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      load: os.loadavg()
    };
    
    return JSON.stringify(systemInfo);
  }

  private async getHardwareEntropy(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  private async getTimeEntropy(): Promise<string> {
    return `${Date.now()}|${performance.now()}|${process.hrtime.bigint()}`;
  }
}
```

### 2. Emergency Entropy
```typescript
class EmergencyEntropySource {
  getEmergencySeed(): string {
    // Use only local sources in emergency
    const sources = [
      crypto.randomBytes(32),
      Buffer.from(Date.now().toString()),
      Buffer.from(process.pid.toString()),
      Buffer.from(Math.random().toString())
    ];
    
    const combined = Buffer.concat(sources);
    return crypto.createHash('sha256').update(combined).digest('hex');
  }
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
class EntropyCache {
  private cache: Map<string, CachedEntropy> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCachedSeed(): Promise<string | null> {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp < this.CACHE_DURATION) {
        return cached.seed;
      } else {
        this.cache.delete(key);
      }
    }
    
    return null;
  }

  cacheSeed(seed: string, sources: EntropySource[]): void {
    const key = this.generateCacheKey(sources);
    this.cache.set(key, {
      seed,
      timestamp: Date.now(),
      sources
    });
  }
}
```

### 2. Parallel Collection
```typescript
class ParallelEntropyCollector {
  async collectEntropyParallel(): Promise<EntropySource[]> {
    const collectors = [
      this.collectYouTubeEntropy(),
      this.collectTwitchEntropy(),
      this.collectSystemEntropy(),
      this.collectNetworkEntropy()
    ];
    
    const results = await Promise.allSettled(collectors);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<EntropySource>).value);
  }
}
```

## Error Handling

### 1. API Failure Handling
```typescript
class EntropyErrorHandler {
  async handleAPIError(error: Error, source: string): Promise<EntropySource> {
    console.error(`Entropy API error (${source}):`, error);
    
    // Log error for monitoring
    await this.logError(error, source);
    
    // Return fallback entropy for this source
    return this.getFallbackForSource(source);
  }

  private getFallbackForSource(source: string): EntropySource {
    switch (source) {
      case 'youtube':
        return this.getSystemEntropy();
      case 'twitch':
        return this.getNetworkEntropy();
      default:
        return this.getHardwareEntropy();
    }
  }
}
```

### 2. Quality Assurance
```typescript
class EntropyQualityAssurance {
  validateEntropyQuality(entropy: string): QualityResult {
    const tests = [
      this.frequencyTest(entropy),
      this.runsTest(entropy),
      this.serialTest(entropy),
      this.entropyTest(entropy)
    ];
    
    const passedTests = tests.filter(test => test.passed).length;
    const qualityScore = passedTests / tests.length;
    
    return {
      qualityScore,
      passedTests,
      totalTests: tests.length,
      details: tests
    };
  }
}
```

## Monitoring and Metrics

### 1. Entropy Metrics
```typescript
class EntropyMetrics {
  private metrics = {
    collectionTime: [] as number[],
    qualityScores: [] as number[],
    sourceAvailability: {} as Record<string, number>,
    errorRates: {} as Record<string, number>
  };

  recordCollectionTime(time: number): void {
    this.metrics.collectionTime.push(time);
    if (this.metrics.collectionTime.length > 100) {
      this.metrics.collectionTime.shift();
    }
  }

  recordQualityScore(score: number): void {
    this.metrics.qualityScores.push(score);
    if (this.metrics.qualityScores.length > 100) {
      this.metrics.qualityScores.shift();
    }
  }

  getAverageCollectionTime(): number {
    return this.metrics.collectionTime.reduce((sum, time) => sum + time, 0) / 
           this.metrics.collectionTime.length;
  }

  getAverageQualityScore(): number {
    return this.metrics.qualityScores.reduce((sum, score) => sum + score, 0) / 
           this.metrics.qualityScores.length;
  }
}
```

### 2. Health Monitoring
```typescript
class EntropyHealthMonitor {
  async checkEntropyHealth(): Promise<HealthStatus> {
    const checks = [
      this.checkYouTubeAPI(),
      this.checkTwitchAPI(),
      this.checkSystemEntropy(),
      this.checkQualityMetrics()
    ];
    
    const results = await Promise.all(checks);
    
    return {
      isHealthy: results.every(check => check.healthy),
      checks: results,
      timestamp: new Date()
    };
  }
}
```

This comprehensive entropy system ensures fair, unpredictable randomness for the poker engine while providing robust fallback mechanisms, complete audit trails, and quality assurance measures. 