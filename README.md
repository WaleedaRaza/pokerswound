# 🃏 Entropoker

> A next-gen, modular, and entropy-secure poker platform built with TypeScript, real-time play, and future-proof architecture.

## 🚀 Purpose

Online poker often uses pseudo-random shuffling that, while statistically fair, is **not cryptographically secure**. Entropoker solves this by:

* Incorporating **external, public entropy** sources (e.g. Mecca Broadcast, Kai Cenat streams) to fuel deck shuffles.
* Building a pipeline for **verifiable randomness and provable fairness**, even if not initially surfaced to users.
* Enabling a clean dev experience powered by **Cursor + modular TypeScript** stack.
* Designing for scalability: from 1-table MVP to a fully tokenized, multi-room platform.

## 📐 Core Architectural Pillars

### 1. **Entropy-Centric Shuffling**

#### 🔁 Entropy Sources (Pluggable)
* **Primary Targets**:
  * Live Twitch streams (Mecca Broadcast, Kai Cenat)
  * Public YouTube livestreams
* **Future Inputs**:
  * Lava lamp wall
  * Device motion (mobile clients)
  * Audio waveform from public broadcasts

#### 🎲 Entropy Processing
* Frames/audio converted to entropy:
  * Extract pixel noise, color histograms, waveform spikes
  * Reduce to entropy bits
  * Hash and seed secure RNG

#### 🔐 Secure Deck Shuffling
* Use **Fisher-Yates + CSPRNG (e.g., `crypto.subtle`, `node:crypto`)**
* Seed the CSPRNG with processed entropy
* Store entropy hash in game logs for future auditability

#### 🔎 Optional Provably Fair Mode
* Append ServerSeed + ClientSeed to entropy
* Final seed: `SHA256(entropy || serverSeed || clientSeed)`
* Deck hash committed before game, revealed after

### 2. **Gameplay + Engine**

#### 🌐 Real-Time Stack
* **Frontend**: Next.js (App Router), TailwindCSS, Zustand/Context, Socket.IO
* **Backend**: Node.js + Express + Socket.IO, optional switch to Fastify later
* **Database**: PostgreSQL (via Prisma), Redis for ephemeral game state
* **Auth**: Clerk.dev or Auth.js (passwordless + Google/GitHub)

#### ♣️ Game Logic
* Deck manager, hand evaluator, pot manager (modular logic files)
* Server-side enforcement only — no game logic trusted on client
* Turn timers, folding logic, showdown resolution, etc.

#### 🔄 Real-Time Features
* Room sync (Socket.IO rooms)
* Join/leave events
* Player reconnect (session ID via token/cookie)
* Chat, emotes, live table state

## 📁 Project Structure

```
entropoker/
├── apps/
│   └── web/                # Next.js frontend (TODO)
├── packages/
│   └── game-engine/        # All core poker logic (pure TS)
│       ├── deck/
│       ├── hand-eval/
│       ├── shuffler/
│       └── state-machine/
│   └── entropy-core/       # Handles entropy ingestion + seeding
│       ├── sources/
│       ├── processors/
│       ├── csprng.ts
│       └── utils.ts
├── backend/
│   ├── index.ts
│   ├── sockets/
│   ├── services/
│   ├── game-manager/
│   ├── auth/
│   └── db/
└── prisma/
    └── schema.prisma
```

## 🛠️ Development Setup

### Prerequisites
* **Node.js 18+** (Check with `node --version`)
* **npm 7+** (Check with `npm --version`)
* **PostgreSQL** (for database)
* **Redis** (optional for development)

### ⚠️ IMPORTANT: Installation Troubleshooting

**If you get errors during `npm install`, follow these steps BEFORE trying to install:**

#### For Windows Users:
1. **Install Windows Build Tools** (REQUIRED for canvas package):
   ```bash
   npm install --global windows-build-tools
   ```
   - This may take 10-15 minutes
   - If this fails, install Visual Studio Build Tools manually:
     - Download from: https://visualstudio.microsoft.com/downloads/
     - Install "C++ build tools" workload
     - Restart your computer

2. **Install Python** (if not already installed):
   - Download from: https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation

3. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

#### For macOS Users:
1. **Install required libraries** (REQUIRED for canvas package):
   ```bash
   brew install pkg-config cairo pango libpng jpeg giflib librsvg
   ```
   - If you don't have Homebrew: https://brew.sh/

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

#### For Linux Users:
1. **Install required libraries** (REQUIRED for canvas package):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

   # CentOS/RHEL/Fedora
   sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/WaleedaRaza/pokerswound.git
   cd pokerswound
   ```

2. **Install dependencies** (AFTER completing troubleshooting steps above)
   ```bash
   npm install
   ```
   
   **If you still get errors:**
   - Try: `npm install --legacy-peer-deps`
   - Or: `npm install --force`
   - If canvas still fails, try: `npm install --build-from-source`

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individual services
   npm run dev:backend
   npm run dev:game-engine
   npm run dev:entropy-core
   ```

### 🔧 Common Error Solutions

| Error | Solution |
|-------|----------|
| `pkg-config: command not found` | Install build tools (see troubleshooting above) |
| `canvas` build fails | Install system dependencies (see troubleshooting above) |
| `workspace:*` protocol error | ✅ Fixed in latest version |
| `node-gyp` errors | Install Python and build tools |
| `EACCES` permission errors | Use `sudo` (Linux/macOS) or run as Administrator (Windows) |

### 🚨 Still Having Issues?

1. **Check your Node.js version**: Must be 18+ (`node --version`)
2. **Check your npm version**: Must be 7+ (`npm --version`)
3. **Try using yarn instead**:
   ```bash
   npm install -g yarn
   yarn install
   ```
4. **Try using pnpm instead**:
   ```bash
   npm install -g pnpm
   pnpm install
   ```
5. **Delete node_modules and try again**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Need help?** Open an issue on GitHub with:
- Your operating system
- Node.js version (`node --version`)
- npm version (`npm --version`)
- The exact error message you're seeing

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=@entropoker/game-engine
npm test --workspace=@entropoker/entropy-core
```

## 📦 Core Modules

### 🎴 `game-engine`
Pure, testable TypeScript poker engine with responsibilities:
* Deck creation and management
* Entropy-secure shuffling
* Hand evaluation and comparison
* Pot calculation and distribution
* Game state management

### 🔥 `entropy-core`
Handles entropy ingestion and processing:
* Twitch/YouTube stream entropy extraction
* Image and audio processing
* CSPRNG seeding and validation
* Entropy quality assessment

### 🌍 `backend`
Real-time game server with:
* Socket.IO for real-time communication
* Game room management
* Player session handling
* Database integration via Prisma

## 🔐 Security & Fairness Model

| Concern | Solution |
|---------|----------|
| Seed predictability | Combine high-entropy public inputs with internal server randomness |
| Manipulation | Server logs entropy hash + seed timestamp |
| Auditability | Option to reveal entropy + server seed for verification |
| Replays | Log full deck state per hand (hash-stamped) |

## 🚀 Deployment

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/entropoker"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Entropy Sources
TWITCH_CLIENT_ID="your_twitch_client_id"
TWITCH_CLIENT_SECRET="your_twitch_client_secret"
YOUTUBE_API_KEY="your_youtube_api_key"

# JWT
JWT_SECRET="your_jwt_secret"

# Frontend URL
FRONTEND_URL="http://localhost:3000"
```

### Production Build
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 TODO

### Phase 1: Foundation ✅
- [x] Project structure and monorepo setup
- [x] Core game engine types and interfaces
- [x] Entropy core foundation
- [x] Database schema design
- [x] Backend server foundation

### Phase 2: Core Implementation
- [ ] Complete hand evaluation logic
- [ ] Implement entropy source integrations
- [ ] Real-time game state management
- [ ] Frontend UI components
- [ ] Authentication system

### Phase 3: Advanced Features
- [ ] Provably fair mode
- [ ] Mobile responsiveness
- [ ] Spectator mode
- [ ] Tournament system
- [ ] Tokenized chips

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

* Inspired by the need for truly fair online poker
* Built with modern TypeScript and real-time technologies
* Designed for scalability and provable fairness 