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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Twitch API** for real-time stream data
- **YouTube Data API** for video statistics
- **Web Crypto API** for cryptographic functions
- **Fisher-Yates algorithm** for unbiased shuffling

---

**EntroPoker** - Where cryptography meets poker for provably fair gameplay. 