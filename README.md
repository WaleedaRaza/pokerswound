
A sophisticated real-time multiplayer poker application with entropy-based randomness, built with Node.js, React, React Native, and PostgreSQL. A cryptographically secure poker application that uses real-time entropy from multiple sources to ensure provably fair card shuffling.


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


## 📱 Mobile App

### React Native Features
- Cross-platform (iOS/Android)
- Expo for easy development
- Native performance
- Push notifications
- Offline support
- Haptic feedback

### Authentication
- JWT token-based authentication
- Secure password hashing with bcrypt
- Token refresh mechanism
- Session management


# PokerSwound - Production-Ready Poker with Real Entropy

A cryptographically secure poker application that uses real-time entropy from multiple sources to ensure provably fair card shuffling.

## 🎯 Production-Ready Features

- **Live Entropy Sources**: Twitch streams, YouTube videos, system entropy
- **Cryptographic Proof**: SHA-256 hashing for provably fair shuffling
- **Game Linking**: Entropy demo shows actual game entropy in real-time
- **Verification**: Anyone can verify shuffle fairness using cryptographic proofs

- **📺 Twitch Streams**: Real viewer counts, chat messages, follower counts
- **📹 YouTube Videos**: View counts, likes, comments, upload dates
- **💻 System Entropy**: Performance timing, crypto random, user agent data

### 2. Cryptographic Mixing
All entropy data is processed through SHA-256 hashing:

### 3. Provably Fair Shuffling
The entropy hash is used to seed a Fisher-Yates shuffle:

### 4. Cryptographic Proof
Every shuffle creates a verifiable proof:

### Real Poker Gameplay
- **4 Players**: You + 3 AI opponents with different personalities
- **Full Betting Rounds**: Preflop, flop, turn, river, showdown
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

