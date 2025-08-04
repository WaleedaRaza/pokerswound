<<<<<<< HEAD
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
=======
# EntroPoker - Production-Ready Poker with Real Entropy

A cryptographically secure poker application that uses real-time entropy from multiple sources to ensure provably fair card shuffling.

## 🎯 Production-Ready Features

### ✅ Fixed Game Logic Issues
- **Proper Turn Management**: Clear turn indicators, no more skipped turns
- **Accurate Betting Logic**: Calls, raises, and all-in actions work correctly
- **Phase Progression**: Automatic community card dealing (flop, turn, river)
- **Amount Tracking**: All bets and pot amounts are properly stored and displayed
- **AI Player Logic**: Intelligent AI opponents with realistic decision making

### ✅ Enhanced UI/UX
- **Clear Turn Indicators**: Visual indicators showing whose turn it is
- **Turn Timer**: 30-second countdown with auto-fold on timeout
- **Better Visual Design**: Modern, clean interface with proper spacing
- **Real-time Status**: Live entropy status and game information
- **Responsive Design**: Works on all screen sizes

### ✅ Real Entropy Integration
- **Live Entropy Sources**: Twitch streams, YouTube videos, system entropy
- **Cryptographic Proof**: SHA-256 hashing for provably fair shuffling
- **Game Linking**: Entropy demo shows actual game entropy in real-time
- **Verification**: Anyone can verify shuffle fairness using cryptographic proofs

## 🔐 How the Entropy System Works

### 1. Real-Time Entropy Collection
The system collects entropy from multiple live sources:

- **📺 Twitch Streams**: Real viewer counts, chat messages, follower counts
- **📹 YouTube Videos**: View counts, likes, comments, upload dates
- **💻 System Entropy**: Performance timing, crypto random, user agent data

### 2. Cryptographic Mixing
All entropy data is processed through SHA-256 hashing:

```javascript
// Combine all entropy sources
const combinedData = twitchData + youtubeData + systemData

// Create cryptographic hash
const entropy = await crypto.subtle.digest('SHA-256', combinedData)
```

### 3. Provably Fair Shuffling
The entropy hash is used to seed a Fisher-Yates shuffle:

```javascript
// Use entropy to generate random numbers
for (let i = deck.length - 1; i > 0; i--) {
  const randomIndex = generateRandomFromEntropy(entropy, i)
  swap(deck[i], deck[randomIndex])
}
```

### 4. Cryptographic Proof
Every shuffle creates a verifiable proof:

```javascript
const proof = {
  entropyHash: "a1b2c3d4...",
  timestamp: Date.now(),
  sampleCount: 75,
  totalEntropyBits: 2400,
  sources: ["twitch:pokergame", "system:random"]
}
```

## 🎮 Game Features

### Real Poker Gameplay
- **4 Players**: You + 3 AI opponents with different personalities
- **Full Betting Rounds**: Preflop, flop, turn, river, showdown
- **Blind System**: Small blind ($10) and big blind ($20)
- **All Actions**: Fold, check, call, bet, raise, all-in
- **Hand Evaluation**: Automatic winner determination

### AI Opponents
- **Alice**: Aggressive player (70% aggression)
- **Bob**: Tight player (40% aggression)  
- **Charlie**: Loose player (60% aggression)

### Turn Management
- **30-Second Timer**: Auto-fold if no action taken
- **Clear Indicators**: Visual cues for whose turn it is
- **AI Thinking**: Realistic delays for AI decisions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/entropoker.git
cd entropoker

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Running the Application
1. Open `http://localhost:3000`
2. Click "New Game" to start a poker game
3. Click "Deal Cards" to begin the hand
4. Use the game controls to make your moves
5. View the "Entropy Demo" tab to see real-time entropy collection

## 📊 Entropy Demo

The entropy demo shows:
- **Real-time entropy collection** from live sources
- **Cryptographic shuffling** with Fisher-Yates algorithm
- **Fairness verification** using SHA-256 proofs
- **Live game integration** - same entropy used in actual games

### Viewing Entropy Sources
1. Navigate to the "Entropy Demo" tab
2. Watch real-time entropy collection from:
   - Twitch streams (viewer counts, chat messages)
   - YouTube videos (view counts, likes, comments)
   - System sources (performance timing, crypto random)
3. Click "Shuffle Deck" to see entropy-based shuffling in action
4. Verify fairness using the cryptographic proof

## 🔧 Technical Architecture

### Frontend (Next.js)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Real-time updates** with useEffect hooks
- **State management** with custom hooks

### Entropy System
- **Multiple sources** for redundancy
- **SHA-256 hashing** for cryptographic security
- **Fisher-Yates shuffle** for unbiased card mixing
- **Verifiable proofs** for fairness

### Game Engine
- **State machine** for game progression
- **AI decision logic** with hand strength evaluation
- **Betting round management** with proper validation
- **Hand evaluation** for winner determination

## 🛡️ Security Features

### Cryptographic Security
- **SHA-256 hashing** prevents entropy manipulation
- **Multiple entropy sources** prevent single-point failure
- **Verifiable proofs** allow fairness verification
- **Time-stamped data** prevents replay attacks

### Fairness Guarantees
- **Impossible to predict** card order before shuffle
- **Cryptographic proof** that shuffle was fair
- **Public verification** of all entropy sources
- **No hardcoded values** - all entropy is live

## 📈 Production Improvements

### Game Logic Fixes
- ✅ Fixed turn skipping issues
- ✅ Proper betting amount tracking
- ✅ Correct phase progression
- ✅ Accurate pot calculation
- ✅ Realistic AI behavior

### UI/UX Enhancements
- ✅ Clear turn indicators
- ✅ Turn timer with auto-fold
- ✅ Better visual design
- ✅ Real-time status updates
- ✅ Responsive layout

### Entropy Integration
- ✅ Real entropy sources connected
- ✅ Live game integration
- ✅ Cryptographic proofs
- ✅ Fairness verification
- ✅ Real-time monitoring
>>>>>>> 05e80d3dca48ddc751e5ffb54e8024bd1b150aff

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<<<<<<< HEAD
### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commits
- Update documentation
- Follow the code style guide

=======
>>>>>>> 05e80d3dca48ddc751e5ffb54e8024bd1b150aff
## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<<<<<<< HEAD
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
=======
## 🙏 Acknowledgments

- **Twitch API** for real-time stream data
- **YouTube Data API** for video statistics
- **Web Crypto API** for cryptographic functions
- **Fisher-Yates algorithm** for unbiased shuffling

---

**EntroPoker** - Where cryptography meets poker for provably fair gameplay. 
>>>>>>> 05e80d3dca48ddc751e5ffb54e8024bd1b150aff
