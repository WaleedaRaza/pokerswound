# POC 1.1: BASIC CARD & DECK SYSTEM IMPLEMENTATION

## OVERVIEW
**Goal**: Create a bulletproof card and deck system with entropy-based shuffling
**Timeline**: 2 days
**Deliverables**: Working card system, deck management, entropy integration, test suite

## IMPLEMENTATION PLAN

### Day 1: Core Card System

#### 1.1 Card Class Implementation
**File**: `src/server/services/card.ts`

```typescript
// Core card representation
export enum Suit {
  CLUBS = '♣',
  DIAMONDS = '♦', 
  HEARTS = '♥',
  SPADES = '♠'
}

export enum Rank {
  DEUCE = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14
}

export class Card {
  constructor(
    public readonly rank: Rank,
    public readonly suit: Suit
  ) {}

  toString(): string {
    const rankStr = this.rank <= 10 ? this.rank.toString() : 
      this.rank === 11 ? 'J' : 
      this.rank === 12 ? 'Q' : 
      this.rank === 13 ? 'K' : 'A';
    return `${rankStr}${this.suit}`;
  }

  toId(): number {
    const suitValue = Object.values(Suit).indexOf(this.suit) * 13;
    const rankValue = this.rank === 14 ? 1 : this.rank;
    return rankValue + suitValue;
  }

  static fromId(id: number): Card {
    const suitIndex = Math.floor((id - 1) / 13);
    const rankValue = ((id - 1) % 13) + 1;
    const suit = Object.values(Suit)[suitIndex];
    const rank = rankValue === 1 ? 14 : rankValue;
    return new Card(rank as Rank, suit as Suit);
  }

  static fromString(str: string): Card {
    if (!str || str.length !== 2) {
      throw new Error('Invalid card string');
    }
    
    const rankStr = str[0];
    const suitStr = str[1];
    
    let rank: Rank;
    if (rankStr === 'T') rank = Rank.TEN;
    else if (rankStr === 'J') rank = Rank.JACK;
    else if (rankStr === 'Q') rank = Rank.QUEEN;
    else if (rankStr === 'K') rank = Rank.KING;
    else if (rankStr === 'A') rank = Rank.ACE;
    else rank = parseInt(rankStr) as Rank;

    const suit = Object.values(Suit).find(s => s === suitStr) as Suit;
    if (!suit) {
      throw new Error(`Invalid suit: ${suitStr}`);
    }
    
    return new Card(rank, suit);
  }

  equals(other: Card): boolean {
    return this.rank === other.rank && this.suit === other.suit;
  }

  compareTo(other: Card): number {
    if (this.rank !== other.rank) {
      return this.rank - other.rank;
    }
    return Object.values(Suit).indexOf(this.suit) - Object.values(Suit).indexOf(other.suit);
  }
}
```

#### 1.2 Deck Class Implementation
**File**: `src/server/services/deck.ts`

```typescript
import { Card, Rank, Suit } from './card';
import { EntropyService } from './entropyService';

export class Deck {
  private cards: Card[] = [];
  private drawnCards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    this.drawnCards = [];
    
    // Create standard 52-card deck
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        if (typeof rank === 'number') {
          this.cards.push(new Card(rank, suit));
        }
      }
    }
  }

  async shuffle(): Promise<void> {
    const entropy = await this.getEntropy();
    const seed = this.hashEntropy(entropy);
    
    // Fisher-Yates shuffle with entropy seed
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = this.seededRandom(seed, i + 1);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j]!;
      this.cards[j] = temp!;
    }
  }

  draw(): Card | null {
    if (this.cards.length === 0) {
      return null;
    }
    
    const card = this.cards.pop()!;
    this.drawnCards.push(card);
    return card;
  }

  drawCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  remainingCards(): number {
    return this.cards.length;
  }

  getDrawnCards(): Card[] {
    return [...this.drawnCards];
  }

  private async getEntropy(): Promise<string> {
    const entropyService = new EntropyService(
      process.env.YOUTUBE_API_KEY || '',
      process.env.TWITCH_CLIENT_ID || '',
      process.env.TWITCH_CLIENT_SECRET || ''
    );
    return await entropyService.getEntropy();
  }

  private hashEntropy(entropy: string): number {
    let hash = 0;
    for (let i = 0; i < entropy.length; i++) {
      const char = entropy.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number, max: number): number {
    const x = Math.sin(seed++) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
  }

  serialize(): any {
    return {
      cards: this.cards.map(card => card.toId()),
      drawnCards: this.drawnCards.map(card => card.toId())
    };
  }

  static deserialize(data: any): Deck {
    const deck = new Deck();
    deck.cards = data.cards.map((id: number) => Card.fromId(id));
    deck.drawnCards = data.drawnCards.map((id: number) => Card.fromId(id));
    return deck;
  }
}
```

#### 1.3 Entropy Service Implementation
**File**: `src/server/services/entropyService.ts`

```typescript
import axios from 'axios';
import crypto from 'crypto';

export class EntropyService {
  constructor(
    private youtubeApiKey: string,
    private twitchClientId: string,
    private twitchClientSecret: string
  ) {}

  async getEntropy(): Promise<string> {
    try {
      // Try YouTube first
      const youtubeEntropy = await this.getYouTubeEntropy();
      if (youtubeEntropy) {
        return youtubeEntropy;
      }
    } catch (error) {
      console.warn('YouTube entropy failed, trying Twitch:', error);
    }

    try {
      // Try Twitch as fallback
      const twitchEntropy = await this.getTwitchEntropy();
      if (twitchEntropy) {
        return twitchEntropy;
      }
    } catch (error) {
      console.warn('Twitch entropy failed, using system entropy:', error);
    }

    // Fallback to system entropy
    return this.getSystemEntropy();
  }

  private async getYouTubeEntropy(): Promise<string> {
    if (!this.youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Get trending videos
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=10&key=${this.youtubeApiKey}`
    );

    const videos = response.data.items;
    if (!videos || videos.length === 0) {
      throw new Error('No YouTube videos found');
    }

    // Combine video data for entropy
    const entropyData = videos.map((video: any) => 
      `${video.id}-${video.snippet.title}-${video.statistics.viewCount}-${video.statistics.likeCount}`
    ).join('|');

    return this.hashEntropy(entropyData);
  }

  private async getTwitchEntropy(): Promise<string> {
    if (!this.twitchClientId || !this.twitchClientSecret) {
      throw new Error('Twitch credentials not configured');
    }

    // Get OAuth token
    const tokenResponse = await axios.post(
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

    const accessToken = tokenResponse.data.access_token;

    // Get top streams
    const streamsResponse = await axios.get(
      'https://api.twitch.tv/helix/streams?first=10',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.twitchClientId
        }
      }
    );

    const streams = streamsResponse.data.data;
    if (!streams || streams.length === 0) {
      throw new Error('No Twitch streams found');
    }

    // Combine stream data for entropy
    const entropyData = streams.map((stream: any) => 
      `${stream.id}-${stream.user_name}-${stream.viewer_count}-${stream.title}`
    ).join('|');

    return this.hashEntropy(entropyData);
  }

  private getSystemEntropy(): string {
    // Use system entropy as fallback
    return crypto.randomBytes(32).toString('hex');
  }

  private hashEntropy(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

### Day 2: Testing & Integration

#### 2.1 Comprehensive Test Suite
**File**: `src/server/tests/card.test.ts`

```typescript
import { Card, Rank, Suit } from '../services/card';
import { Deck } from '../services/deck';

describe('Card System', () => {
  describe('Card Creation', () => {
    test('should create card from string', () => {
      const card = Card.fromString('Ah');
      expect(card.rank).toBe(Rank.ACE);
      expect(card.suit).toBe(Suit.HEARTS);
    });

    test('should create card from ID', () => {
      const card = Card.fromId(1);
      expect(card.rank).toBe(Rank.ACE);
      expect(card.suit).toBe(Suit.CLUBS);
    });

    test('should convert card to string', () => {
      const card = new Card(Rank.ACE, Suit.HEARTS);
      expect(card.toString()).toBe('A♥');
    });

    test('should convert card to ID', () => {
      const card = new Card(Rank.ACE, Suit.CLUBS);
      expect(card.toId()).toBe(1);
    });

    test('should handle invalid card string', () => {
      expect(() => Card.fromString('')).toThrow('Invalid card string');
      expect(() => Card.fromString('A')).toThrow('Invalid card string');
      expect(() => Card.fromString('Ax')).toThrow('Invalid suit');
    });
  });

  describe('Card Comparison', () => {
    test('should compare cards correctly', () => {
      const aceHearts = new Card(Rank.ACE, Suit.HEARTS);
      const kingHearts = new Card(Rank.KING, Suit.HEARTS);
      const aceSpades = new Card(Rank.ACE, Suit.SPADES);

      expect(aceHearts.compareTo(kingHearts)).toBeGreaterThan(0);
      expect(kingHearts.compareTo(aceHearts)).toBeLessThan(0);
      expect(aceHearts.compareTo(aceSpades)).toBeLessThan(0);
    });

    test('should check card equality', () => {
      const card1 = new Card(Rank.ACE, Suit.HEARTS);
      const card2 = new Card(Rank.ACE, Suit.HEARTS);
      const card3 = new Card(Rank.KING, Suit.HEARTS);

      expect(card1.equals(card2)).toBe(true);
      expect(card1.equals(card3)).toBe(false);
    });
  });
});

describe('Deck System', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  describe('Deck Creation', () => {
    test('should create standard 52-card deck', () => {
      expect(deck.remainingCards()).toBe(52);
    });

    test('should have all cards unique', () => {
      const cards = new Set<string>();
      while (deck.remainingCards() > 0) {
        const card = deck.draw();
        if (card) {
          cards.add(card.toString());
        }
      }
      expect(cards.size).toBe(52);
    });
  });

  describe('Deck Operations', () => {
    test('should draw cards correctly', () => {
      const card = deck.draw();
      expect(card).not.toBeNull();
      expect(deck.remainingCards()).toBe(51);
      expect(deck.getDrawnCards()).toHaveLength(1);
    });

    test('should draw multiple cards', () => {
      const cards = deck.drawCards(5);
      expect(cards).toHaveLength(5);
      expect(deck.remainingCards()).toBe(47);
    });

    test('should handle empty deck', () => {
      deck.drawCards(52);
      const card = deck.draw();
      expect(card).toBeNull();
    });

    test('should reset deck', () => {
      deck.drawCards(10);
      deck.reset();
      expect(deck.remainingCards()).toBe(52);
      expect(deck.getDrawnCards()).toHaveLength(0);
    });
  });

  describe('Deck Shuffling', () => {
    test('should shuffle deck', async () => {
      const originalOrder = deck.serialize().cards;
      await deck.shuffle();
      const shuffledOrder = deck.serialize().cards;
      
      // Verify order changed (very unlikely to be same after shuffle)
      expect(shuffledOrder).not.toEqual(originalOrder);
    });

    test('should maintain all cards after shuffle', async () => {
      const beforeShuffle = new Set(deck.serialize().cards);
      await deck.shuffle();
      const afterShuffle = new Set(deck.serialize().cards);
      
      expect(afterShuffle).toEqual(beforeShuffle);
    });
  });

  describe('Deck Serialization', () => {
    test('should serialize and deserialize correctly', () => {
      deck.drawCards(5);
      const serialized = deck.serialize();
      const deserialized = Deck.deserialize(serialized);
      
      expect(deserialized.remainingCards()).toBe(deck.remainingCards());
      expect(deserialized.getDrawnCards()).toHaveLength(deck.getDrawnCards().length);
    });
  });
});
```

#### 2.2 Integration Test
**File**: `src/server/tests/integration.test.ts`

```typescript
import { Card, Rank, Suit } from '../services/card';
import { Deck } from '../services/deck';
import { EntropyService } from '../services/entropyService';

describe('Card & Deck Integration', () => {
  test('should create and shuffle deck with entropy', async () => {
    const deck = new Deck();
    expect(deck.remainingCards()).toBe(52);
    
    await deck.shuffle();
    expect(deck.remainingCards()).toBe(52);
    
    // Verify we can draw all cards
    const cards = deck.drawCards(52);
    expect(cards).toHaveLength(52);
    expect(deck.remainingCards()).toBe(0);
  });

  test('should handle entropy service', async () => {
    const entropyService = new EntropyService('', '', '');
    const entropy = await entropyService.getEntropy();
    
    expect(entropy).toBeDefined();
    expect(entropy.length).toBeGreaterThan(0);
  });

  test('should deal poker hands correctly', async () => {
    const deck = new Deck();
    await deck.shuffle();
    
    // Deal 4 players, 2 cards each
    const players = [];
    for (let i = 0; i < 4; i++) {
      players.push(deck.drawCards(2));
    }
    
    expect(players).toHaveLength(4);
    players.forEach(hand => {
      expect(hand).toHaveLength(2);
      expect(hand[0]).not.toEqual(hand[1]); // No duplicate cards
    });
    
    expect(deck.remainingCards()).toBe(44); // 52 - (4 * 2)
  });
});
```

#### 2.3 Performance Test
**File**: `src/server/tests/performance.test.ts`

```typescript
import { Deck } from '../services/deck';

describe('Performance Tests', () => {
  test('should shuffle deck quickly', async () => {
    const startTime = Date.now();
    
    const deck = new Deck();
    await deck.shuffle();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('should handle multiple shuffles', async () => {
    const deck = new Deck();
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      deck.reset();
      await deck.shuffle();
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
  });
});
```

## SUCCESS CRITERIA VALIDATION

### 1. Card Creation Tests
```bash
# Run card tests
npm test -- --testNamePattern="Card Creation"

# Expected output:
# ✓ should create card from string
# ✓ should create card from ID
# ✓ should convert card to string
# ✓ should convert card to ID
# ✓ should handle invalid card string
```

### 2. Deck Operations Tests
```bash
# Run deck tests
npm test -- --testNamePattern="Deck Operations"

# Expected output:
# ✓ should create standard 52-card deck
# ✓ should have all cards unique
# ✓ should draw cards correctly
# ✓ should draw multiple cards
# ✓ should handle empty deck
# ✓ should reset deck
```

### 3. Shuffling Tests
```bash
# Run shuffle tests
npm test -- --testNamePattern="Deck Shuffling"

# Expected output:
# ✓ should shuffle deck
# ✓ should maintain all cards after shuffle
```

### 4. Integration Tests
```bash
# Run integration tests
npm test -- --testNamePattern="Card & Deck Integration"

# Expected output:
# ✓ should create and shuffle deck with entropy
# ✓ should handle entropy service
# ✓ should deal poker hands correctly
```

## DELIVERABLES CHECKLIST

- [ ] Card class with rank/suit representation
- [ ] Card creation from string and ID
- [ ] Card comparison and equality
- [ ] Deck class with Fisher-Yates shuffle
- [ ] Entropy integration (YouTube/Twitch API)
- [ ] Deck serialization/deserialization
- [ ] Comprehensive test suite
- [ ] Performance benchmarks
- [ ] Error handling for invalid inputs
- [ ] Documentation and examples

## NEXT STEPS

After completing POC 1.1:

1. **Move to POC 1.2**: Hand Evaluation Engine
2. **Set up CI/CD**: Automated testing pipeline
3. **Document APIs**: Create API documentation
4. **Performance optimization**: If needed based on benchmarks

This POC provides the foundation for all subsequent poker functionality and ensures we have a robust, tested card and deck system with entropy-based shuffling. 