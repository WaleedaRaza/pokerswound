# Development Guide - Pohkur Poker

This guide provides comprehensive information for developers working on the Pohkur Poker application.

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   Admin Panel   │
│   (React)       │    │ (React Native)  │    │   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx)       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (Express)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Game Service   │    │  Auth Service   │    │  Token Service  │
│  (Socket.IO)    │    │   (JWT)         │    │   (Virtual)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │  (PostgreSQL)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Cache         │
                    │   (Redis)       │
                    └─────────────────┘
```

### Data Flow

1. **Authentication Flow**
   ```
   Client → Auth Service → JWT Token → Protected Routes
   ```

2. **Game Flow**
   ```
   Player Action → Socket.IO → Game Service → Database → Broadcast to Players
   ```

3. **Entropy Flow**
   ```
   Game Start → Entropy Service → YouTube/Twitch APIs → Hash → Shuffle Deck
   ```

## 🎯 Key Features Implementation

### 1. Entropy-Based Randomness

The entropy system ensures truly unpredictable card shuffling by combining multiple external data sources:

```typescript
// Entropy Service Implementation
class EntropyService {
  async generateEntropy(): Promise<EntropyResult> {
    // Fetch from multiple sources concurrently
    const [youtubeEntropy, twitchEntropy] = await Promise.allSettled([
      this.fetchYouTubeEntropy(),
      this.fetchTwitchEntropy()
    ]);

    // Combine entropy sources
    const entropyString = sources
      .map(source => JSON.stringify(source.data))
      .join('|');

    // Hash for unpredictability
    const hash = crypto.createHash('sha256')
      .update(entropyString)
      .digest('hex');

    return { hash, sources, timestamp: new Date() };
  }
}
```

### 2. Real-time Game State Management

Game state is managed server-side with Socket.IO for real-time updates:

```typescript
// Game State Management
class PokerGameService {
  async processPlayerAction(data: PlayerAction): Promise<HandAction> {
    // Validate action
    await this.validateAction(data);
    
    // Update game state
    const handAction = await this.prisma.handAction.create({
      data: { ...data }
    });

    // Broadcast to all players
    this.io.to(data.gameId).emit('action-performed', handAction);
    
    return handAction;
  }
}
```

### 3. Token Economy System

Virtual currency system with secure transaction handling:

```typescript
// Token Service Implementation
class TokenService {
  async addTokens(userId: string, amount: number, reason: string): Promise<number> {
    return await this.prisma.$transaction(async (tx) => {
      // Update balance atomically
      const user = await tx.user.update({
        where: { id: userId },
        data: { tokenBalance: { increment: amount } }
      });

      // Create transaction record
      await tx.transaction.create({
        data: { userId, type: 'PURCHASE', amount, description: reason }
      });

      return user.tokenBalance;
    });
  }
}
```

## 📁 Project Structure

```
pohkur/
├── src/
│   ├── server/
│   │   ├── services/          # Business logic services
│   │   ├── socket/            # WebSocket server
│   │   ├── utils/             # Utility functions
│   │   └── index.ts           # Server entry point
│   ├── types/                 # Shared TypeScript types
│   └── shared/                # Shared utilities
├── web/                       # React web client
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   └── styles/           # CSS styles
├── mobile/                    # React Native mobile client
│   ├── src/
│   │   ├── screens/          # Screen components
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts
│   │   └── services/         # API services
├── prisma/                    # Database schema and migrations
├── docker/                    # Docker configurations
├── k8s/                      # Kubernetes manifests
└── docs/                     # Documentation
```

## 🛠️ Development Setup

### 1. Environment Setup

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 3. API Keys Configuration

```bash
# YouTube API Key
# 1. Go to Google Cloud Console
# 2. Create project and enable YouTube Data API v3
# 3. Create API key
# 4. Add to .env file

# Twitch API Credentials
# 1. Go to Twitch Developer Console
# 2. Create application
# 3. Get Client ID and Secret
# 4. Add to .env file
```

## 🧪 Testing Strategy

### 1. Unit Tests

```typescript
// Example test for EntropyService
describe('EntropyService', () => {
  it('should generate entropy from multiple sources', async () => {
    const entropyService = new EntropyService(apiKeys);
    const result = await entropyService.generateEntropy();
    
    expect(result.hash).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

```typescript
// Example test for game flow
describe('Game Flow', () => {
  it('should handle complete poker hand', async () => {
    // Create game
    const game = await gameService.createGame(gameData);
    
    // Join players
    await gameService.joinGame(game.id, player1.id, 0);
    await gameService.joinGame(game.id, player2.id, 1);
    
    // Start hand
    const hand = await gameService.startNewHand(game.id);
    
    // Perform actions
    await gameService.processPlayerAction({
      gameId: game.id,
      handId: hand.id,
      userId: player1.id,
      action: 'BET',
      amount: 100
    });
    
    // Verify state
    const updatedGame = await gameService.getGameState(game.id);
    expect(updatedGame.currentHand.pot).toBe(100);
  });
});
```

### 3. E2E Tests

```typescript
// Example Playwright test
test('complete poker game flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  await page.click('[data-testid=login-button]');
  
  await page.waitForURL('/dashboard');
  await page.click('[data-testid=create-game]');
  
  // ... continue with game flow
});
```

## 🔒 Security Considerations

### 1. Authentication & Authorization

```typescript
// JWT Token Validation
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 2. Input Validation

```typescript
// Joi Schema Validation
const playerActionSchema = Joi.object({
  gameId: Joi.string().required(),
  handId: Joi.string().required(),
  action: Joi.string().valid('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN').required(),
  amount: Joi.number().min(0).when('action', {
    is: Joi.string().valid('BET', 'RAISE', 'ALL_IN'),
    then: Joi.required()
  })
});
```

### 3. Rate Limiting

```typescript
// Rate Limiter Implementation
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyGenerator: (req) => req.user?.id || req.ip,
  points: 100, // requests
  duration: 60, // per minute
});
```

## 📊 Monitoring & Observability

### 1. Health Checks

```typescript
// Health Check Endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    entropy: await checkEntropyService(),
    timestamp: new Date().toISOString()
  };
  
  const isHealthy = Object.values(checks).every(check => check === true);
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

### 2. Metrics Collection

```typescript
// Custom Metrics
const gameMetrics = {
  activeGames: new prometheus.Gauge({
    name: 'poker_active_games',
    help: 'Number of active poker games'
  }),
  playerActions: new prometheus.Counter({
    name: 'poker_player_actions_total',
    help: 'Total number of player actions'
  })
};
```

### 3. Logging Strategy

```typescript
// Structured Logging
logger.info('Player action processed', {
  userId: action.userId,
  gameId: action.gameId,
  action: action.type,
  amount: action.amount,
  timestamp: new Date().toISOString()
});
```

## 🚀 Performance Optimization

### 1. Database Optimization

```sql
-- Indexes for performance
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
```

### 2. Caching Strategy

```typescript
// Redis Caching
class CacheService {
  async getGameState(gameId: string): Promise<Game | null> {
    const cached = await this.redis.get(`game:${gameId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const game = await this.gameService.getGameState(gameId);
    await this.redis.setex(`game:${gameId}`, 300, JSON.stringify(game));
    return game;
  }
}
```

### 3. Connection Pooling

```typescript
// Database Connection Pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t pohkur-poker .
      - run: docker push ${{ secrets.DOCKER_REGISTRY }}/pohkur-poker
```

### 2. Deployment Strategy

```bash
# Blue-Green Deployment
kubectl apply -f k8s/blue-deployment.yaml
kubectl apply -f k8s/blue-service.yaml

# Test blue deployment
curl -f http://blue-service/health

# Switch traffic to blue
kubectl apply -f k8s/green-service.yaml
```

## 📚 Best Practices

### 1. Code Organization

- Use TypeScript for type safety
- Follow SOLID principles
- Implement dependency injection
- Use interfaces for contracts
- Write self-documenting code

### 2. Error Handling

```typescript
// Centralized Error Handling
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error Handler Middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }
  
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};
```

### 3. Testing Strategy

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for scalability
- Security tests for vulnerabilities

## 🎯 Future Enhancements

### 1. Planned Features

- [ ] Tournament system
- [ ] Leaderboards and rankings
- [ ] Social features (friends, chat)
- [ ] Advanced poker variants
- [ ] AI opponents
- [ ] Spectator mode

### 2. Technical Improvements

- [ ] GraphQL API
- [ ] Microservices architecture
- [ ] Event sourcing
- [ ] CQRS pattern
- [ ] Real-time analytics
- [ ] Machine learning integration

## 📞 Support & Resources

- **Documentation**: [Wiki](link-to-wiki)
- **API Reference**: [Swagger Docs](link-to-swagger)
- **Community**: [Discord Server](link-to-discord)
- **Issues**: [GitHub Issues](link-to-issues)

---

**Happy Coding! 🚀** 