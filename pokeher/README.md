# 🎰 **POKEHER** - Next-Generation Poker Platform

![Poker Engine](https://img.shields.io/badge/Engine-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-v18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)

**A production-grade poker platform with provably random shuffling, real-time multiplayer, and beautiful UI**

---

## 🚀 **QUICK START**

### **Prerequisites**
- Node.js 18+ and npm
- Git
- Modern browser (Chrome, Firefox, Safari, Edge)

### **🏃‍♂️ Run the App (30 seconds)**
```bash
# Clone the repository
git clone <your-repo-url>
cd pokeher

# Navigate to poker engine
cd poker-engine

# Install dependencies
npm install

# Start the server
node fixed-sophisticated-server.js

# Open your browser to:
# http://localhost:3000/test
```

**🎯 That's it! You're running a full poker game with:**
- ✅ Beautiful massive poker table
- ✅ Complete game logic (betting, dealing, hand evaluation)
- ✅ Real-time player actions
- ✅ Professional UI with animations

---

## 📁 **PROJECT STRUCTURE**

```
pokeher/
├── 📂 poker-engine/              # 🎯 MAIN APPLICATION
│   ├── 🚀 fixed-sophisticated-server.js  # ⭐ START HERE - Main server
│   ├── 🎮 poker-test.html        # ⭐ Beautiful game UI
│   ├── 📦 package.json           # Dependencies
│   ├── 🔧 src/                   # TypeScript source code
│   │   ├── core/                 # Game engine logic
│   │   ├── types/                # Type definitions
│   │   ├── services/             # Backend services
│   │   └── utils/                # Helper functions
│   ├── 🎨 cards/                 # Beautiful card images
│   ├── 🧪 tests/                 # Comprehensive test suite
│   └── 📊 dist/                  # Compiled JavaScript
│
├── 📚 poker-engine-docs/         # Comprehensive documentation
├── 🎯 POKER_GAME_ROADMAP.md     # Development roadmap
└── 📖 README.md                 # This file
```

---

## 🎮 **CORE FILES EXPLAINED**

### **🚀 Server Files (START HERE)**
| File | Purpose | When to Use |
|------|---------|-------------|
| `fixed-sophisticated-server.js` | **⭐ MAIN SERVER** - Start here! | Always run this to start the app |
| `poker-test.html` | **🎮 Game Interface** - Beautiful poker UI | Open in browser after starting server |
| `package.json` | Dependencies and scripts | When installing/updating packages |

### **🧠 Game Engine Core**
| Directory | Purpose | For Developers |
|-----------|---------|----------------|
| `src/core/engine/` | **Game logic** - Betting, dealing, hand evaluation | Modify poker rules here |
| `src/core/models/` | **Data models** - Players, game state, tables | Change data structures |
| `src/types/` | **TypeScript types** - Type safety | Add new types/interfaces |
| `src/services/` | **Backend services** - Database, auth, WebSocket | Add new features |

### **🎨 Frontend & Assets**
| File/Directory | Purpose | Customization |
|----------------|---------|---------------|
| `poker-test.html` | **Main UI** - Complete game interface | Modify styling/layout |
| `cards/` | **Card images** - High-quality PNG cards | Replace with custom designs |
| `card-images-base64.js` | **Embedded cards** - Base64 encoded | For offline/fast loading |

### **🧪 Testing & Development**
| File | Purpose | Usage |
|------|---------|-------|
| `tests/unit/` | **Unit tests** - Individual component tests | `npm test` |
| `tests/integration/` | **Integration tests** - Full system tests | `npm run test:integration` |
| `test-*.js` | **Quick tests** - Manual testing scripts | `node test-engine.js` |

---

## 🔧 **DEVELOPMENT SETUP**

### **For Contributors**
```bash
# 1. Clone and setup
git clone <repo-url>
cd pokeher/poker-engine
npm install

# 2. Development mode (auto-reload)
npm run dev

# 3. Run tests
npm test

# 4. Build for production
npm run build

# 5. Type checking
npm run type-check
```

### **🛠️ Available Scripts**
```bash
npm run dev          # Development server with auto-reload
npm run build        # Build for production
npm run test         # Run all tests
npm run type-check   # TypeScript type checking
npm run lint         # Code linting
npm start            # Production server
```

---

## 🎯 **CURRENT FEATURES**

### **✅ Working Now**
- 🃏 **Complete Poker Engine** - Full Texas Hold'em implementation
- 🎮 **Beautiful UI** - Professional-grade poker table design
- 👥 **Multi-player Support** - Up to 10 players per table
- 💰 **Betting System** - Blinds, betting rounds, all-in, side pots
- 🏆 **Hand Evaluation** - Accurate poker hand rankings
- 🎴 **Card Dealing** - Proper deck shuffling and dealing
- 📊 **Game State Management** - Complete game flow control
- 🔄 **Real-time Updates** - Live game state synchronization

### **🎨 UI Features**
- 🏟️ **Massive poker table** - Main focus of the screen
- 👤 **Player avatars** - Beautiful styled player icons
- 💎 **Enhanced styling** - Maximum visual impact
- 📱 **Responsive design** - Works on all devices
- ⚡ **Smooth animations** - Professional game feel

---

## 🚗 **DEVELOPMENT ROADMAP**

### **🔥 PHASE 1: Authentication & Rooms** (Next 2-4 weeks)
- [ ] User registration/login system
- [ ] Room creation with shareable links
- [ ] Friend system and invitations
- [ ] Persistent user accounts

### **🌐 PHASE 2: Production Deployment** (Next 4-6 weeks)
- [ ] Next.js frontend migration
- [ ] Supabase backend integration
- [ ] Real-time WebSocket connections
- [ ] Global deployment on Vercel

### **🎲 PHASE 3: Entropy-Based Shuffling** (Next 6-8 weeks)
- [ ] YouTube video frame harvesting
- [ ] Cryptographic shuffle algorithm
- [ ] Provably random verification
- [ ] Transparency features for players

### **🚀 PHASE 4: Advanced Features** (Next 8-12 weeks)
- [ ] Tournament system
- [ ] Leaderboards and statistics
- [ ] Mobile app (React Native)
- [ ] Advanced AI opponents

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Current Stack**
```
Frontend:     Pure HTML/CSS/JavaScript (Beautiful & Fast)
Backend:      Node.js + Express
Game Engine:  TypeScript (Sophisticated poker logic)
Database:     JSON files (Development) → Supabase (Production)
Real-time:    HTTP polling → WebSocket (Production)
```

### **Production Stack (Roadmap)**
```
Frontend:     Next.js 14 + TypeScript + Tailwind CSS
Backend:      Supabase (Database + Auth + Real-time)
Deployment:   Vercel (Global Edge Network)
State:        Zustand + React Query
Styling:      Tailwind CSS + Shadcn/ui
Testing:      Jest + Cypress
```

---

## 🎯 **HOW TO CONTRIBUTE**

### **🐛 Bug Reports**
1. Check existing issues first
2. Create detailed bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/Node.js version
   - Console logs/screenshots

### **✨ Feature Requests**
1. Check roadmap and existing issues
2. Create feature request with:
   - Clear use case description
   - Proposed implementation approach
   - Impact on existing features

### **🔧 Code Contributions**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Run test suite: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

---

## 🧪 **TESTING**

### **Run Tests**
```bash
# All tests
npm test

# Specific test suites
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

# Coverage report
npm run test:coverage
```

### **Manual Testing**
```bash
# Quick engine test
node test-engine.js

# Complete game flow test
node test-complete-functionality.js

# Betting actions test
node test-betting-actions.js
```

---

## 🔒 **SECURITY CONSIDERATIONS**

### **Current Security**
- ✅ Input validation on all API endpoints
- ✅ Secure game state management
- ✅ Protected against common poker exploits

### **Production Security (Planned)**
- 🔐 JWT authentication with Supabase
- 🛡️ Row Level Security (RLS) in database
- 🚫 Rate limiting on API endpoints
- 🔍 Real-time cheat detection
- 🎯 Provably fair shuffling

---

## 🌟 **UNIQUE FEATURES**

### **🎲 Entropy-Based Shuffling** (Coming Soon)
Our revolutionary shuffling system uses:
- 📹 **YouTube video frames** - Real-world entropy source
- 🎵 **Audio frequency analysis** - Additional randomness
- 🔐 **Cryptographic hashing** - SHA-256 based shuffle
- ✅ **Provable fairness** - Players can verify shuffle integrity

### **🏆 Professional Game Engine**
- **Hand evaluation**: Sophisticated algorithm with tie-breaking
- **Betting engine**: Complete poker betting rules
- **Side pots**: Proper all-in handling with multiple side pots
- **Position management**: Dealer, small blind, big blind rotation

---

## 📞 **SUPPORT & COMMUNITY**

### **Getting Help**
- 📚 **Documentation**: Check `/poker-engine-docs/` for detailed guides
- 🐛 **Issues**: GitHub Issues for bug reports
- 💬 **Discussions**: GitHub Discussions for questions
- 📧 **Contact**: [Your contact information]

### **Community Guidelines**
- Be respectful and constructive
- Follow code of conduct
- Help others learn and grow
- Share knowledge and improvements

---

## 📄 **LICENSE**

MIT License - see LICENSE file for details.

---

## 🙏 **ACKNOWLEDGMENTS**

- **Playing Cards**: Beautiful card designs from open-source contributors
- **Poker Logic**: Inspired by professional poker rule implementations
- **Community**: Thanks to all contributors and testers

---

## 🎯 **NEXT STEPS FOR DEVELOPERS**

### **New Contributors**
1. **Start here**: Run the quick start guide above
2. **Explore**: Play with the poker game in your browser
3. **Read docs**: Check `/poker-engine-docs/` for architecture
4. **Pick a task**: Look at GitHub Issues for good first issues
5. **Join community**: Discussions tab for questions

### **Production Deployment**
1. **Phase 1**: Set up Supabase account and database
2. **Phase 2**: Create Next.js frontend project
3. **Phase 3**: Implement authentication system
4. **Phase 4**: Deploy to Vercel with custom domain

---

**🚀 Ready to build the future of online poker? Let's make it happen!**

---

*Last updated: January 2025*
*Version: 1.0.0*
*Status: Development Phase - Core engine complete, moving to production*
