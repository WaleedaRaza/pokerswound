# Pohkur Poker - Real-Time Multiplayer Poker App

A sophisticated real-time multiplayer poker application with entropy-based randomness, built with Node.js, React, React Native, and PostgreSQL.

## 🎯 Features

- **Real-time multiplayer poker** with WebSocket communication
- **Entropy-based randomness** using YouTube/Twitch APIs for fair shuffling
- **Cross-platform support** - Web and mobile (iOS/Android)
- **Token economy** with virtual currency system
- **Secure authentication** with JWT tokens
- **Modern UI/UX** with responsive design
- **Scalable architecture** with Docker and Kubernetes support

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js for REST API
- Socket.IO for real-time communication
- PostgreSQL with Prisma ORM
- Redis for caching and session storage
- JWT for authentication

**Frontend:**
- React with TypeScript (Web)
- React Native with Expo (Mobile)
- Socket.IO client for real-time updates
- Tailwind CSS for styling
- Framer Motion for animations

**Infrastructure:**
- Docker and Docker Compose
- PostgreSQL database
- Redis cache
- Nginx reverse proxy (production)
- Prometheus/Grafana monitoring

### Key Components

1. **Entropy Service** - Fetches data from YouTube/Twitch APIs to generate truly random card shuffles
2. **Game Service** - Handles poker game logic and state management
3. **Auth Service** - Manages user authentication and JWT tokens
4. **Token Service** - Handles virtual currency transactions
5. **Socket Server** - Real-time communication between players

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pohkur
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install

   # Install web client dependencies
   cd web && npm install && cd ..

   # Install mobile client dependencies
   cd mobile && npm install && cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env.example .env

   # Edit .env with your configuration
   nano .env
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up postgres redis -d

   # Run database migrations
   npm run db:migrate

   # Generate Prisma client
   npm run db:generate
   ```

5. **Start Development Servers**
   ```bash
   # Start backend server
   npm run dev:server

   # Start web client (in new terminal)
   npm run dev:web

   # Start mobile client (in new terminal)
   npm run dev:mobile
   ```

### Production Deployment

1. **Build and deploy with Docker**
   ```bash
   # Build all services
   docker-compose build

   # Start all services
   docker-compose up -d

   # View logs
   docker-compose logs -f
   ```

2. **Kubernetes Deployment**
   ```bash
   # Apply Kubernetes manifests
   kubectl apply -f k8s/

   # Check deployment status
   kubectl get pods
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `YOUTUBE_API_KEY` | YouTube API key for entropy | - |
| `TWITCH_CLIENT_ID` | Twitch API client ID | - |
| `TWITCH_CLIENT_SECRET` | Twitch API client secret | - |

### API Keys Setup

1. **YouTube API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API Key)
   - Add to `.env` file

2. **Twitch API Credentials**
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console)
   - Create a new application
   - Get Client ID and Client Secret
   - Add to `.env` file

## 🎮 Game Features

### Poker Variants
- Texas Hold'em (primary)
- Omaha (planned)
- Seven Card Stud (planned)

### Real-time Features
- Live game state updates
- Player actions (fold, check, call, bet, raise, all-in)
- Chat system
- Typing indicators
- Player join/leave notifications

### Entropy-based Randomness
- Fetches live data from YouTube trending videos
- Incorporates Twitch stream statistics
- Combines multiple entropy sources
- Uses SHA-256 hashing for unpredictability
- Fisher-Yates shuffle algorithm for card distribution

### Token Economy
- Virtual currency system
- Daily bonus tokens
- Purchase packages
- Transaction history
- Secure balance management

## 📱 Mobile App

### React Native Features
- Cross-platform (iOS/Android)
- Expo for easy development
- Native performance
- Push notifications
- Offline support
- Haptic feedback

### Development
```bash
# Start Expo development server
cd mobile && npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run web client tests
cd web && npm test

# Run mobile tests
cd mobile && npm test

# Run integration tests
npm run test:integration
```

## 📊 Monitoring

### Health Checks
- `/health` endpoint for server status
- Database connectivity checks
- Redis connection monitoring
- Socket.IO connection tracking

### Metrics
- Prometheus metrics collection
- Grafana dashboards
- Custom game metrics
- Performance monitoring

### Logging
- Winston structured logging
- Error tracking with Sentry
- Request/response logging
- Game action logging

## 🔒 Security

### Authentication
- JWT token-based authentication
- Secure password hashing with bcrypt
- Token refresh mechanism
- Session management

### Data Protection
- HTTPS/TLS encryption
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Game Security
- Server-side game logic validation
- Anti-cheat measures
- Rate limiting
- Fair play monitoring

## 🚀 Deployment

### Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commits
- Update documentation
- Follow the code style guide

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discord**: [Community Server](link-to-discord)
- **Email**: support@pohkur.com

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- Prisma for database management
- Expo for React Native development
- Tailwind CSS for styling
- Framer Motion for animations

---

**Built with ❤️ by the Pohkur Team** 