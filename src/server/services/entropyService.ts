import axios from 'axios';
import crypto from 'crypto';
import seedrandom from 'seedrandom';
import { EntropySource, EntropyResult } from '../../types';
import { logger } from '../utils/logger';

export class EntropyService {
  private youtubeApiKey: string;
  private twitchClientId: string;
  private twitchClientSecret: string;
  private twitchAccessToken?: string;
  private twitchTokenExpiry?: Date;

  constructor(
    youtubeApiKey: string,
    twitchClientId: string,
    twitchClientSecret: string
  ) {
    this.youtubeApiKey = youtubeApiKey;
    this.twitchClientId = twitchClientId;
    this.twitchClientSecret = twitchClientSecret;
  }

  /**
   * Generate entropy from external sources (YouTube and Twitch)
   * This creates truly unpredictable randomness for card shuffling
   */
  async generateEntropy(): Promise<EntropyResult> {
    const sources: EntropySource[] = [];
    
    try {
      // Fetch entropy from multiple sources concurrently
      const [youtubeEntropy, twitchEntropy] = await Promise.allSettled([
        this.fetchYouTubeEntropy(),
        this.fetchTwitchEntropy()
      ]);

      if (youtubeEntropy.status === 'fulfilled') {
        sources.push(youtubeEntropy.value);
      }

      if (twitchEntropy.status === 'fulfilled') {
        sources.push(twitchEntropy.value);
      }

      // Add system entropy as fallback
      const systemEntropy = this.generateSystemEntropy();
      sources.push(systemEntropy);

      // Combine all entropy sources
      const entropyString = sources
        .map(source => JSON.stringify(source.data))
        .join('|');

      // Hash the combined entropy
      const hash = crypto.createHash('sha256').update(entropyString).digest('hex');

      const result: EntropyResult = {
        hash,
        sources,
        timestamp: new Date()
      };

      logger.info('Generated entropy', {
        hash: result.hash.substring(0, 8) + '...',
        sourceCount: sources.length,
        timestamp: result.timestamp
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate entropy, using fallback', { error });
      
      // Fallback to system entropy only
      const fallbackSource = this.generateSystemEntropy();
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(fallbackSource.data))
        .digest('hex');

      return {
        hash,
        sources: [fallbackSource],
        timestamp: new Date()
      };
    }
  }

  /**
   * Fetch entropy from YouTube trending videos
   */
  private async fetchYouTubeEntropy(): Promise<EntropySource> {
    try {
      // Get trending videos
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            part: 'statistics,snippet',
            chart: 'mostPopular',
            regionCode: 'US',
            maxResults: 5,
            key: this.youtubeApiKey
          },
          timeout: 5000
        }
      );

      const videos = response.data.items;
      if (!videos || videos.length === 0) {
        throw new Error('No trending videos found');
      }

      // Select a random video from trending
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      
      // Extract entropy from video data
      const entropyData = {
        videoId: randomVideo.id,
        viewCount: randomVideo.statistics?.viewCount || '0',
        likeCount: randomVideo.statistics?.likeCount || '0',
        commentCount: randomVideo.statistics?.commentCount || '0',
        publishedAt: randomVideo.snippet?.publishedAt || new Date().toISOString(),
        title: randomVideo.snippet?.title || '',
        timestamp: Date.now()
      };

      return {
        type: 'youtube',
        data: entropyData,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to fetch YouTube entropy', { error });
      throw error;
    }
  }

  /**
   * Fetch entropy from Twitch live streams
   */
  private async fetchTwitchEntropy(): Promise<EntropySource> {
    try {
      // Get or refresh Twitch access token
      await this.ensureTwitchToken();

      // Get top live streams
      const response = await axios.get(
        'https://api.twitch.tv/helix/streams',
        {
          params: {
            first: 10,
            game_id: '33214' // Poker category
          },
          headers: {
            'Client-ID': this.twitchClientId,
            'Authorization': `Bearer ${this.twitchAccessToken}`
          },
          timeout: 5000
        }
      );

      const streams = response.data.data;
      if (!streams || streams.length === 0) {
        // Fallback to any top streams if no poker streams
        const fallbackResponse = await axios.get(
          'https://api.twitch.tv/helix/streams',
          {
            params: { first: 10 },
            headers: {
              'Client-ID': this.twitchClientId,
              'Authorization': `Bearer ${this.twitchAccessToken}`
            }
          }
        );
        streams.push(...fallbackResponse.data.data);
      }

      if (!streams || streams.length === 0) {
        throw new Error('No live streams found');
      }

      // Select a random stream
      const randomStream = streams[Math.floor(Math.random() * streams.length)];
      
      // Extract entropy from stream data
      const entropyData = {
        streamId: randomStream.id,
        viewerCount: randomStream.viewer_count,
        startedAt: randomStream.started_at,
        title: randomStream.title,
        userId: randomStream.user_id,
        timestamp: Date.now()
      };

      return {
        type: 'twitch',
        data: entropyData,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to fetch Twitch entropy', { error });
      throw error;
    }
  }

  /**
   * Generate system entropy as fallback
   */
  private generateSystemEntropy(): EntropySource {
    const entropyData = {
      randomBytes: crypto.randomBytes(32).toString('hex'),
      timestamp: Date.now(),
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    return {
      type: 'youtube', // Using youtube type for consistency
      data: entropyData,
      timestamp: new Date()
    };
  }

  /**
   * Ensure Twitch access token is valid
   */
  private async ensureTwitchToken(): Promise<void> {
    if (this.twitchAccessToken && this.twitchTokenExpiry && this.twitchTokenExpiry > new Date()) {
      return; // Token is still valid
    }

    try {
      const response = await axios.post(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: this.twitchClientId,
            client_secret: this.twitchClientSecret,
            grant_type: 'client_credentials'
          }
        }
      );

      this.twitchAccessToken = response.data.access_token;
      this.twitchTokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      logger.info('Refreshed Twitch access token');
    } catch (error) {
      logger.error('Failed to refresh Twitch token', { error });
      throw error;
    }
  }

  /**
   * Create a seeded random number generator from entropy
   */
  createSeededRNG(entropyResult: EntropyResult): seedrandom.PRNG {
    return seedrandom(entropyResult.hash);
  }

  /**
   * Shuffle a deck of cards using entropy-based randomness
   */
  shuffleDeck(deck: string[], entropyResult: EntropyResult): string[] {
    const rng = this.createSeededRNG(entropyResult);
    const shuffled = [...deck];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    logger.info('Shuffled deck using entropy', {
      deckSize: shuffled.length,
      entropyHash: entropyResult.hash.substring(0, 8) + '...',
      sourceCount: entropyResult.sources.length
    });

    return shuffled;
  }
} 