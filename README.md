# Poker Web App

A real-time multiplayer Texas Hold'em poker application with cryptographically secure randomness and optional provable fairness.

## 🌟 Features

- **Real-time multiplayer** Texas Hold'em poker
- **Cryptographically secure** card shuffling using Node.js `crypto.randomInt()`
- **Provable fairness** with client/server seed verification
- **Responsive design** for mobile and desktop
- **Private game rooms** with UUID-based invites
- **Reconnection support** for dropped connections

## 🏗️ Architecture

This is a monorepo with three main packages:

- **`client/`** - React frontend with TypeScript and TailwindCSS
- **`server/`** - Fastify backend with Socket.io for real-time communication
- **`shared/`** - Shared TypeScript types and utilities

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   cd server
   npx prisma db push
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## 🔐 Security & Fairness

### Randomness
- Uses Node.js `crypto.randomInt()` for cryptographically secure random number generation
- Implements Fisher-Yates shuffle algorithm
- No use of `Math.random()` or other pseudo-random generators

### Provable Fairness (Optional)
- Players can provide a `clientSeed` (random string)
- Server generates a `serverSeed` (kept secret until round ends)
- Final deck hash: `SHA256(clientSeed + serverSeed)`
- Server reveals `serverSeed` post-game for verification

## 🧪 Testing

Run statistical simulations to verify randomness:

```bash
npm run test:randomness
```

This simulates 1M hands and compares hand frequencies with expected Texas Hold'em statistics.

## 📁 Project Structure

```
/poker-app
├── /client (React frontend)
│   ├── /src
│   │   ├── /components (card UI, table UI, player avatar)
│   │   ├── /pages (lobby, table, history)
│   │   ├── /hooks (useGameState, useWebSocket)
│   │   ├── /store (Zustand state management)
│   │   ├── /utils (card helpers, formatting)
│   │   └── /types (local client types)
│   └── tailwind.config.js
│
├── /server (Fastify backend)
│   ├── /src
│   │   ├── /controllers (socket event handlers)
│   │   ├── /routes (HTTP endpoints)
│   │   ├── /services (game logic, player management)
│   │   ├── /models (Prisma DB models)
│   │   ├── /shuffling (secure shuffling + provable fair logic)
│   │   ├── /utils (random, hash, seed tools)
│   │   └── server.ts
│   └── prisma/schema.prisma
│
├── /shared
│   └── /types (shared types between client/server)
└── README.md
```

## 🎯 Key Components

### Shuffling Engine
- `shuffleDeck(deck: Card[], seed?: string): Card[]`
- Secure randomness via `crypto.randomInt`
- Fisher-Yates shuffle implementation
- Optional SHA256-based provable fairness

### Game Engine
- Manages game state: player hands, board, pot, turn, blinds
- Advances phases: preflop → flop → turn → river
- Validates moves: fold, check, call, raise
- Emits state updates via WebSocket

### WebSocket Controller
- Connects clients to game rooms
- Handles join/create/leave events
- Routes player actions to game engine
- Sends diff-based updates

## 🔧 Development

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build all packages for production
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

### Environment Variables

Create a `.env` file in the server directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/poker_app"
JWT_SECRET="your-secret-key"
PORT=3000
```

## 🚀 Deployment

### Frontend
- Build with `npm run build` in client directory
- Deploy to Vercel, Netlify, or any static hosting

### Backend
- Build with `npm run build` in server directory
- Deploy to Railway, Heroku, or any Node.js hosting
- Set up PostgreSQL database
- Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details 