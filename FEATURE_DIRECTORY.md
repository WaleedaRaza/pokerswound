# 🎯 POKERGEEK FEATURE DIRECTORY
**Complete Feature Specification for Production Poker App**

**Purpose:** Comprehensive feature list, design language, MVP scope, and final vision  
**Audience:** Consultant, developers, stakeholders  
**Status:** Complete specification for clean architecture rebuild

---

## TABLE OF CONTENTS

1. [Design Language & Principles](#1-design-language--principles)
2. [MVP Features (Production Minimum)](#2-mvp-features-production-minimum)
3. [Final Features (Complete Vision)](#3-final-features-complete-vision)
4. [Feature Breakdown by Category](#4-feature-breakdown-by-category)
5. [User Experience Flows](#5-user-experience-flows)
6. [Technical Requirements](#6-technical-requirements)

---

## 1. DESIGN LANGUAGE & PRINCIPLES

### 1.1 Core Design Philosophy

**"Simplicity with Sophistication"**

- **Clean, not cluttered** - Every pixel serves a purpose
- **Smooth, not choppy** - Seamless transitions, no glitches
- **Professional, not playful** - Serious tool for serious players
- **Data-driven, not decorative** - Information density with clarity
- **Elegant, not flashy** - Sophisticated animations, not distracting

### 1.2 Visual Identity

#### **Color Palette**

**Primary Colors:**
- **Orange Accent:** `#ff5100` - Primary CTA, highlights, titles
- **Teal Data:** `#00d4aa` - Metrics, values, positive indicators
- **Dark Background:** `#0a0816` - Main background
- **Card Background:** `#111018` - Card/panel backgrounds
- **Text Primary:** `#eef0f6` - Main text
- **Text Muted:** `#a8abb8` - Secondary text, labels

**Semantic Colors:**
- **Success:** `#00ff88` - Wins, positive trends
- **Warning:** `#ffaa00` - Cautions, pending actions
- **Error:** `#ff4444` - Losses, negative trends

**Felt Colors (Table Backgrounds):**
- Green: `#0d5f2f` (default)
- Red: `#6b1414`
- Black: `#1a1a1a`
- Blue: `#0f2942`
- Grey: `#2a2a2a`
- Tan: `#6b5642`
- Purple: `#3a1450`

#### **Typography**

**Fonts:**
- **Primary:** `Inter` - UI, body text, labels
- **Monospace:** `JetBrains Mono` - Data values, metrics, code

**Scale (Fluid, Responsive):**
- Hero Titles: `clamp(2.25rem, 4vw, 3rem)` - 800 weight, Orange
- Section Titles: `clamp(1.75rem, 3vw, 2.25rem)` - 700 weight, Orange with glow
- Data Values: `clamp(1.375rem, 2.5vw, 1.75rem)` - 800 weight, Teal
- Labels: `clamp(0.875rem, 1.6vw, 1rem)` - 600 weight, uppercase, muted
- Body: `clamp(1rem, 1.8vw, 1.125rem)` - 400 weight, readable

#### **Liquid Glass System**

**Core Effect:**
- Backdrop blur: `backdrop-filter: blur(12px)`
- Semi-transparent background: `rgba(20, 20, 40, 0.6)`
- Subtle border: `1px solid rgba(255, 255, 255, 0.1)`
- Soft shadow: `0 20px 60px rgba(0, 0, 0, 0.6)`
- Orange glow on hover: `0 0 30px rgba(255, 140, 66, 0.3)`

**Size Variants:**
- `liquid-glass--xl` - Hero sections, large cards
- `liquid-glass--lg` - Main content cards
- `liquid-glass--md` - Standard cards, panels
- `liquid-glass--sm` - Small widgets, badges

**Usage:**
- All cards, panels, modals use liquid glass
- Consistent across all pages (index, play, friends, analytics)
- Creates unified visual language

#### **Spacing System (Ma Scale)**

**Fluid Spacing (Responsive):**
- `--ma-xs: 8px` - Tight spacing
- `--ma-sm: 16px` - Small gaps
- `--ma-md: 32px` - Standard gaps
- `--ma-lg: 64px` - Large sections
- `--ma-xl: 120px` - Hero spacing

**Usage:**
- Consistent spacing across all pages
- Responsive scaling with viewport
- No magic numbers

#### **Animation Tempo**

**Timing:**
- **Fast:** `150ms` - Hover states, micro-interactions
- **Normal:** `300ms` - Transitions, state changes
- **Slow:** `500ms` - Page loads, major transitions

**Easing:**
- `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth, natural motion

**Principles:**
- Animations should feel **satisfying, not distracting**
- **Synchronized** animations (pot + chips move together)
- **Single-pass** animations (no double increments/decrements)
- **Clear transitions** between states (hand end → hand start)

### 1.3 Design Principles

#### **1. Pot as Dynamic Island**

**Concept:** The pot display acts as a central, intelligent hub

**Behavior:**
- **Pre-hand:** Shows nothing (or "Waiting for hand")
- **During hand:** Shows current pot amount, side pots
- **Hand end:** Expands to show winner(s), hand rank(s), winning hand(s)
- **Dispersion:** Visually decrements pot, increments winner stacks (synchronized)
- **Announcements:** All hand announcements come through pot, not separate popups

**Visual:**
- Smooth expand/contract animations
- Color transitions (neutral → winner highlight)
- Typography changes (data → announcement)
- No separate popups or banners

#### **2. Seamless Hand Transitions**

**Requirements:**
- **Clear hand end:** Winner announced via pot, chips distributed
- **Showdown window:** 2-3 seconds for show/muck controls
- **Countdown bar:** Non-intrusive timer under dock (2 colors, horizontal decrease)
- **Card transition:** Old cards fade out, new cards fade in + flip animation
- **No popups:** No trophy banners, no blocking overlays
- **Smooth flow:** Hand end → countdown → new hand starts seamlessly

**Visual Flow:**
1. Hand completes → Pot shows winner
2. Chips animate (pot down, stacks up) - synchronized, single-pass
3. Show/muck controls appear (if showdown)
4. After 2-3s: Countdown bar appears (if auto-start) OR Start button (if manual)
5. Countdown completes → Cards fade out
6. New cards fade in + flip → Hand starts

#### **3. Information Density**

**Analytics Page Inspiration:**
- **Bloomberg Terminal** - Dense, information-rich, professional
- **Mission Control** - Real-time monitoring, status indicators
- **Trading Dashboard** - Live data streams, trend indicators

**Principles:**
- Every pixel serves a purpose
- Hierarchical clarity (most important first)
- Progressive disclosure (drill-down available)
- Real-time awareness (live updates)
- Data power (even with little data, show what's possible)

#### **4. Responsive & Zoom-Locked**

**Table View:**
- **Zoom lock:** Maintains aspect ratio, scales proportionally
- **Circular layout:** Seats arranged around elliptical felt
- **YOU at bottom-center:** Your seat is wider, cards face-up
- **Opponents around you:** Relative positioning, card backs visible
- **Letterboxing:** Handles aspect ratio mismatches gracefully

**Mobile:**
- Responsive breakpoints
- Touch-friendly controls
- Simplified UI (essential features only)

### 1.4 User Experience Principles

#### **1. Always Know What's Happening**

- Clear "whose turn" indicator (pulsing glow, highlight)
- Clear "hand starting" moment (card animations)
- Clear "hand complete" moment (pot announcement)
- Clear "next hand" countdown (non-intrusive bar)

#### **2. Never Confuse Chip Accounting**

- **Chip Conservation:** At any point, sum of (player stacks + pots) = starting total
- **Single-pass animations:** Pot decrements once, stacks increment once (synchronized)
- **No double updates:** No multiple increments/decrements
- **Visual clarity:** Always clear where chips are

#### **3. Smooth, Not Choppy**

- **No glitches:** Pot doesn't break, cards don't duplicate
- **No race conditions:** State updates are deterministic
- **No conflicting animations:** Single animation path
- **Clear state transitions:** Phase-aware rendering

#### **4. Data-Driven Decisions**

- **Analytics are accurate:** 100% of hands tracked
- **Stats update in real-time:** No stale data
- **Progressive disclosure:** More data = more insights
- **Clean data flow:** JSONB → PHE → Analytics (no bloat loops)

---

## 2. MVP FEATURES (PRODUCTION MINIMUM)

### 2.1 Core Game Experience

#### **✅ Must Work Flawlessly:**

1. **Hand Play Flow**
   - Deal cards (hole cards + community cards)
   - Post blinds (SB/BB)
   - Betting rounds (PREFLOP → FLOP → TURN → RIVER)
   - Showdown (if needed)
   - Hand completion with winner announcement

2. **Player Actions**
   - FOLD - Give up hand
   - CHECK - Pass (if no bet)
   - CALL - Match current bet
   - RAISE - Increase bet
   - ALL_IN - Bet all chips

3. **Turn Management**
   - Clear "whose turn" indicator
   - Action buttons enabled/disabled correctly
   - Timer display (if enabled)
   - Auto-fold on timeout (if enabled)

4. **Hand Transitions**
   - Smooth hand end → hand start flow
   - Pot as dynamic island (announcements)
   - Card animations (fade + flip)
   - Countdown bar (non-intrusive)
   - Auto-start OR manual start button

5. **Chip Management**
   - Accurate chip accounting (conservation)
   - Single-pass animations (pot + stacks synchronized)
   - Side pot calculation (if all-ins)
   - Busted player handling

#### **✅ Must Feel Smooth:**

- No pot glitches
- No double chip increments/decrements
- No unclear state changes
- No blocking popups
- Clear visual feedback for all actions

### 2.2 Room & Seat Management

#### **✅ Must Work:**

1. **Room Creation**
   - Host creates room (5-room limit per user)
   - Sets blinds, buy-in limits, max players
   - Generates unique invite code
   - Room persists until deleted

2. **Seat Claiming**
   - Players claim seats (approval system for non-host)
   - Host auto-approves, others require approval
   - Max 1 seat per user per room
   - Spectator mode (if room full)

3. **Host Controls**
   - Update player stacks
   - Kick players
   - Update blinds
   - Adjust chips
   - Lock/unlock room
   - Force next hand
   - Toggle auto-start
   - Reset stacks
   - End game

### 2.3 Authentication & User Management

#### **✅ Must Work:**

1. **Authentication Methods**
   - Google OAuth (primary)
   - Guest login (temporary account)

2. **User Profiles**
   - Username (unique, required)
   - Display name
   - Avatar (upload + URL)
   - Email (if authenticated)

3. **Session Management**
   - Persistent sessions (Redis-backed)
   - Rejoin tokens (mid-game recovery)
   - Refresh-safe (hydrate from server)

### 2.4 Data & Analytics (MVP Scope)

#### **✅ Must Work:**

1. **Hand History**
   - All hands tracked (100% extraction)
   - PHE encoding (compact storage)
   - Basic stats (hands played, wins, biggest pot)

2. **Analytics Page**
   - Overview tab (basic stats)
   - Hand history table (paginated)
   - Decode PHE format for display

3. **Data Integrity**
   - No missing hands
   - No data bloat (pruned JSON)
   - Fast queries (indexed)

### 2.5 Social Features (MVP Scope)

#### **✅ Must Work:**

1. **Friend System**
   - Search users by username
   - Send friend request
   - Accept/reject requests
   - See friends list
   - Online status (basic)

2. **Game Invites**
   - Invite friend to current room
   - Friend receives notification
   - Friend can join room

### 2.6 Progression System (MVP Scope)

#### **✅ Must Work:**

1. **Karate Belt System**
   - Username colors based on hands played
   - Belt tiers (White → Yellow → Orange → Green → Blue → Purple → Brown → Black)
   - Display in navbar, seats, analytics

2. **Badges (Basic)**
   - Milestone badges (100 hands, 1000 hands, etc.)
   - Launch badges (Founding Member, Day One)
   - Display top badge next to username

---

## 3. FINAL FEATURES (COMPLETE VISION)

### 3.1 Enhanced Game Experience

#### **Advanced Features:**

1. **Hand Replay Viewer**
   - Replay any hand from history
   - Step through actions
   - Show hole cards (if you were in hand)
   - Show board progression

2. **Advanced Timer Options**
   - Custom timebanks per player
   - Timebank extensions
   - Warning sounds
   - Visual countdown animations

3. **Tournament Mode**
   - Multi-table support
   - Chip migration between tables
   - Tournament brackets
   - Payout structures

4. **Provably Fair RNG**
   - Committed shuffle seeds
   - Post-game verification
   - Audit trail

5. **Advanced Betting Options**
   - Straddles
   - Missed blinds
   - Dead blinds
   - Rebuys

### 3.2 Enhanced Analytics

#### **Complete Data Hub:**

1. **Live Performance Dashboard**
   - Real-time win rate
   - Current streak
   - Session stats (hands today, profit/loss, time played)
   - Trend indicators (7-day/30-day comparison)

2. **Positional Analysis**
   - Win rate by position (UTG, MP, CO, BTN, SB, BB)
   - VPIP/PFR by position
   - Profit/loss by position
   - Positional heatmap (visual grid)

3. **Advanced Charts**
   - VPIP/PFR over time (line chart)
   - Aggression factor (radar chart)
   - Hand strength distribution (bar chart)
   - Win rate trends (time series)

4. **Hand History Deep Dive**
   - Filter by date, room, position, result
   - Search by hand rank, pot size
   - Export to CSV/JSON
   - Detailed hand replay

5. **LLM Insights**
   - AI-powered hand analysis
   - Leak detection
   - Strategy recommendations
   - Rate-limited (5 queries/day)

### 3.3 Enhanced Social Features

#### **Complete Social Graph:**

1. **Friend System Enhancements**
   - Friend groups/clubs
   - Friend activity feed
   - Friend statistics comparison
   - Friend leaderboards

2. **Messaging System**
   - In-game chat
   - Private messages
   - Group conversations
   - Notifications

3. **Clubs System**
   - Create/join clubs
   - Club rooms
   - Club leaderboards
   - Club tournaments

4. **Moderation System**
   - Report players
   - Admin actions
   - Ban system
   - Appeal process

### 3.4 Enhanced Progression System

#### **Complete Progression:**

1. **Karate Belt System (Full)**
   - 8 belt tiers (White → Black)
   - Belt colors in all UI elements
   - Belt-specific animations (glow, pulse)
   - Belt progression tracking

2. **Badge System (Complete)**
   - **Milestone Badges:** Hands played thresholds (1, 100, 1K, 10K, 100K, 1M)
   - **Achievement Badges:** First win, biggest pot, royal flush, etc.
   - **Launch Badges:** Founding Member, Day One (time-limited)
   - **Event Badges:** Special events, tournaments
   - **Social Badges:** Friend milestones, club achievements
   - **Display:** Profile modal, analytics header, friends list, seat labels

3. **Rank System**
   - Rank calculation from hands played
   - Rank tiers (Novice → Master)
   - Rank colors (muted → vibrant)
   - Rank progression tracking

4. **Statistics Tracking**
   - Lifetime stats (hands, wins, profit/loss)
   - Session stats (today, this week, this month)
   - Positional stats (by position)
   - Hand strength stats (best hand, frequency)
   - Advanced metrics (VPIP, PFR, aggression factor)

### 3.5 Advanced Features

#### **Power User Features:**

1. **Sandbox Mode**
   - Custom game settings
   - Test scenarios
   - Practice mode
   - AI opponents (future)

2. **Learning Center**
   - Poker tutorials
   - Strategy guides
   - Hand examples
   - Quiz system

3. **AI Solver Integration**
   - Hand analysis
   - Range recommendations
   - Equity calculations
   - GTO strategies

4. **Customization**
   - Felt colors (7 options)
   - Card designs
   - Sound effects
   - Animation preferences

---

## 4. FEATURE BREAKDOWN BY CATEGORY

### 4.1 Core Gameplay

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Deal cards | ✅ | ✅ | ✅ Working |
| Betting rounds | ✅ | ✅ | ✅ Working |
| Showdown | ✅ | ✅ | ✅ Working |
| Side pots | ✅ | ✅ | ✅ Working |
| Hand transitions | ⚠️ | ✅ | ⚠️ Needs polish |
| Auto-start | ✅ | ✅ | ✅ Working |
| Timer system | ✅ | ✅ | ✅ Working |
| Hand replay | ❌ | ✅ | ❌ Not implemented |
| Tournament mode | ❌ | ✅ | ❌ Not implemented |
| Provably fair RNG | ❌ | ✅ | ❌ Not implemented |

### 4.2 User Interface

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Circular table layout | ✅ | ✅ | ✅ Working |
| Zoom lock | ✅ | ✅ | ✅ Working |
| Liquid glass effects | ✅ | ✅ | ✅ Working |
| Card animations | ⚠️ | ✅ | ⚠️ Needs polish |
| Pot as dynamic island | ⚠️ | ✅ | ⚠️ Needs polish |
| Countdown bar | ⚠️ | ✅ | ⚠️ Needs polish |
| Responsive design | ✅ | ✅ | ✅ Working |
| Mobile support | ⚠️ | ✅ | ⚠️ Basic support |

### 4.3 Social Features

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Friend system | ⚠️ | ✅ | ⚠️ Needs verification |
| Friend requests | ⚠️ | ✅ | ⚠️ Needs verification |
| Game invites | ❌ | ✅ | ❌ Not implemented |
| Online status | ⚠️ | ✅ | ⚠️ Basic |
| Messaging | ❌ | ✅ | ❌ Not implemented |
| Clubs | ❌ | ✅ | ❌ Not implemented |
| Moderation | ❌ | ✅ | ❌ Not implemented |

### 4.4 Progression System

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Karate belt system | ❌ | ✅ | ❌ Not implemented |
| Badge system | ❌ | ✅ | ❌ Not implemented |
| Rank system | ❌ | ✅ | ❌ Not implemented |
| Statistics tracking | ⚠️ | ✅ | ⚠️ Basic |
| Leaderboards | ❌ | ✅ | ❌ Not implemented |

### 4.5 Analytics

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Hand history | ✅ | ✅ | ✅ Working |
| Basic stats | ✅ | ✅ | ✅ Working |
| PHE encoding | ✅ | ✅ | ✅ Working |
| Analytics page | ⚠️ | ✅ | ⚠️ Basic UI |
| Positional analysis | ❌ | ✅ | ❌ Not implemented |
| Advanced charts | ❌ | ✅ | ❌ Not implemented |
| LLM insights | ❌ | ✅ | ❌ Not implemented |
| Export data | ❌ | ✅ | ❌ Not implemented |

### 4.6 Host Controls

| Feature | MVP | Final | Status |
|---------|-----|-------|--------|
| Update stacks | ✅ | ✅ | ✅ Working |
| Kick players | ✅ | ✅ | ✅ Working |
| Update blinds | ✅ | ✅ | ✅ Working |
| Adjust chips | ✅ | ✅ | ✅ Working |
| Lock room | ✅ | ✅ | ✅ Working |
| Force next hand | ✅ | ✅ | ✅ Working |
| Toggle auto-start | ✅ | ✅ | ✅ Working |
| Reset stacks | ✅ | ✅ | ✅ Working |
| End game | ✅ | ✅ | ✅ Working |
| Felt color picker | ✅ | ✅ | ✅ Working |

---

## 5. USER EXPERIENCE FLOWS

### 5.1 Complete Hand Flow

```
1. LOBBY STATE
   - Players claim seats
   - Host sets blinds
   - Host clicks "Start Game"
   
2. HAND DEALING
   - Cards dealt (hole cards + blinds posted)
   - Dealer button shown
   - SB/BB badges shown
   - Action buttons enabled for first actor
   
3. BETTING ROUNDS
   - PREFLOP: First actor acts (UTG or BB in heads-up)
   - Action rotates clockwise
   - Pot updates in real-time
   - Current bet displayed
   - Action buttons update (CHECK/CALL/RAISE)
   - Timer counts down (if enabled)
   
4. STREET TRANSITIONS
   - FLOP: 3 community cards dealt
   - TURN: 1 community card dealt
   - RIVER: 1 community card dealt
   - Betting resumes after each street
   
5. HAND COMPLETION
   - If all fold except one: Fold win (no showdown)
   - If multiple players remain: Showdown
   - Winners determined
   - Pot shows winner(s) + hand rank(s)
   - Chips distributed (pot down, stacks up) - synchronized
   - Show/muck controls (if showdown)
   
6. TRANSITION TO NEXT HAND
   - After 2-3s: Countdown bar appears (if auto-start) OR Start button (if manual)
   - Countdown completes: Cards fade out
   - New cards fade in + flip
   - Dealer button rotates
   - New hand begins
```

### 5.2 Friend Request Flow

```
1. USER A SEARCHES FOR USER B
   - Types username in search bar
   - Results show matching users
   
2. USER A SENDS FRIEND REQUEST
   - Clicks "Add Friend" button
   - Request created in database
   - Notification sent to User B
   
3. USER B RECEIVES NOTIFICATION
   - Notification appears in navbar
   - Shows "User A wants to be friends"
   - Accept/Reject buttons
   
4. USER B ACCEPTS REQUEST
   - Friendship created in database
   - Both users see each other in friends list
   - Online status updates
   
5. GAME INVITE (Future)
   - User A clicks "Invite Friend" on User B
   - User B receives notification
   - User B clicks notification → Joins room
```

### 5.3 Analytics Flow

```
1. USER PLAYS HANDS
   - Hands tracked in real-time
   - Stats update after each hand
   
2. HAND EXTRACTION
   - Hand completes → Snapshot captured
   - Encoded to PHE format (85 bytes)
   - Stored in hand_history table
   - Player statistics updated
   
3. ANALYTICS PAGE LOAD
   - Fetches hand history (paginated)
   - Decodes PHE format
   - Displays hands in table
   - Calculates stats (win rate, etc.)
   
4. PROGRESSIVE DISCLOSURE
   - 0-10 hands: Basic stats + encouragement
   - 10-50 hands: Positional analysis unlocked
   - 50-100 hands: Advanced charts unlocked
   - 100+ hands: Full analytics available
```

### 5.4 Progression Flow

```
1. USER PLAYS HANDS
   - total_hands_played increments
   - Stats tracked
   
2. BELT PROGRESSION
   - At thresholds (100, 500, 1000, etc.)
   - belt_level updates in user_profiles
   - Username color changes
   - Displayed in navbar, seats, analytics
   
3. BADGE AWARDS
   - Triggers checked after each hand
   - Badges awarded (first win, 100 hands, etc.)
   - Stored in badges table
   - Displayed in profile, analytics, seat labels
   
4. RANK CALCULATION
   - Rank calculated from hands played
   - Rank tier assigned (Novice → Master)
   - Rank color applied
   - Displayed across UI
```

---

## 6. TECHNICAL REQUIREMENTS

### 6.1 Architecture Requirements

#### **Backend:**
- **Modular routers** - Separate concerns (game, rooms, auth, social)
- **Adapter pattern** - Game logic in focused modules
- **Event-driven** - Socket.IO for real-time updates
- **Dual storage** - In-memory (fast) + PostgreSQL (persistent)
- **JSONB state** - Flexible game state storage

#### **Frontend:**
- **Vanilla JavaScript** - No framework dependencies
- **Modular JS** - Separate concerns (socket, render, transition)
- **State-driven rendering** - Server is source of truth
- **Hydration-first** - Always fetch from server on load

### 6.2 Data Requirements

#### **Storage:**
- **PHE encoding** - Compact hand history (85 bytes vs 800 bytes JSON)
- **Pruned JSON** - Remove actions_log after PHE verification
- **Indexed queries** - Fast analytics (GIN indexes)
- **Chip conservation** - Invariant: Σ(chips) + Σ(pots) = starting_total

#### **Extraction:**
- **100% coverage** - All hands tracked
- **Snapshot before cleanup** - Capture state before mutations
- **Edge case handling** - Fold wins, all-ins, disconnects
- **Reliable pipeline** - Game → Extraction → Encoding → Storage → Analytics

### 6.3 Performance Requirements

#### **Response Times:**
- Analytics page load: <500ms (with 1000+ hands)
- Action processing: <100ms
- Socket broadcast: <50ms
- Hydration: <200ms

#### **Scalability:**
- Horizontal scaling (Redis adapter)
- Database connection pooling
- Efficient queries (indexed, paginated)
- CDN for static assets

### 6.4 Security Requirements

#### **Authentication:**
- Supabase Auth (Google OAuth + Guest)
- Session management (Redis-backed)
- Rejoin tokens (mid-game recovery)

#### **Authorization:**
- Host controls (host-only)
- Seat claiming (approval system)
- Private rooms (invite-only)

#### **Data Privacy:**
- Hole cards never in public broadcasts
- Private data filtered server-side
- Secure token storage

### 6.5 Testing Requirements

#### **Test Scenarios:**
- 3-player game (normal hand)
- All-in runout (side pots)
- Manual start vs auto-start
- Refresh mid-hand (hydration)
- Friend request flow
- Badge awards
- Analytics data extraction

#### **Success Criteria:**
- No console errors
- No chip conservation violations
- 100% hand extraction
- Smooth transitions
- Accurate analytics

---

## 7. FEATURE PRIORITIZATION

### **Phase 1: Core Experience (MVP)**
1. ✅ Fix hand transitions (pot as dynamic island, card animations)
2. ✅ Verify chip conservation (no double increments)
3. ✅ Complete data extraction (100% coverage, PHE encoding)
4. ✅ Basic analytics page (hand history, stats)
5. ✅ Friend system (requests, accepts, list)
6. ✅ Game invites (invite friend to room)
7. ✅ Karate belt system (username colors)
8. ✅ Badge system (milestone badges)

### **Phase 2: Enhanced Experience**
1. Advanced analytics (positional, charts)
2. Hand replay viewer
3. Enhanced social (messaging, clubs)
4. Advanced progression (rank system, leaderboards)
5. Tournament mode
6. LLM insights

### **Phase 3: Power Features**
1. Provably fair RNG
2. Sandbox mode enhancements
3. Learning center
4. AI solver integration
5. Customization options

---

## 8. SUCCESS METRICS

### **User Experience:**
- ✅ Hand transitions feel smooth (no glitches)
- ✅ Players always know whose turn it is
- ✅ Chips/pot accounting is perfect
- ✅ Cards are dealt beautifully
- ✅ Timer is clear and non-intrusive

### **Data Integrity:**
- ✅ 100% of hands tracked (no missing data)
- ✅ Analytics page loads fast (<500ms)
- ✅ PHE encoding verified (all hands decode correctly)
- ✅ Data bloat pruned (actions_log NULL for encoded hands)

### **Social Features:**
- ✅ Friend system works end-to-end
- ✅ Game invites work
- ✅ Belt system displays correctly
- ✅ Badges awarded and displayed

### **Architecture:**
- ✅ No monolithic files >2K lines
- ✅ Dead code archived
- ✅ Logging is helpful, not overwhelming
- ✅ Can add features in hours, not days

---

## 9. DESIGN REFERENCES

### **Inspiration Sources:**

1. **Analytics Page:**
   - Bloomberg Terminal (information density)
   - Mission Control (real-time monitoring)
   - Trading Dashboard (live data streams)

2. **Table UI:**
   - Professional casino tables (circular layout)
   - Modern poker apps (smooth animations)
   - Apple Dynamic Island (pot as hub)

3. **Visual Identity:**
   - Dark mode design systems
   - Glass morphism (liquid glass)
   - Monospace data displays

---

## 10. COMPLETE FEATURE CHECKLIST

### **Core Gameplay:**
- [x] Deal cards
- [x] Betting rounds
- [x] Showdown
- [x] Side pots
- [ ] Hand transitions (polish needed)
- [x] Auto-start
- [x] Timer system
- [ ] Hand replay
- [ ] Tournament mode
- [ ] Provably fair RNG

### **User Interface:**
- [x] Circular table layout
- [x] Zoom lock
- [x] Liquid glass effects
- [ ] Card animations (polish needed)
- [ ] Pot as dynamic island (polish needed)
- [ ] Countdown bar (polish needed)
- [x] Responsive design
- [ ] Mobile support (basic)

### **Social Features:**
- [ ] Friend system (verify)
- [ ] Friend requests (verify)
- [ ] Game invites
- [ ] Online status (basic)
- [ ] Messaging
- [ ] Clubs
- [ ] Moderation

### **Progression System:**
- [ ] Karate belt system
- [ ] Badge system
- [ ] Rank system
- [x] Statistics tracking (basic)
- [ ] Leaderboards

### **Analytics:**
- [x] Hand history
- [x] Basic stats
- [x] PHE encoding
- [ ] Analytics page (polish needed)
- [ ] Positional analysis
- [ ] Advanced charts
- [ ] LLM insights
- [ ] Export data

---

**END OF FEATURE DIRECTORY**

This document represents the complete vision for PokerGeek - from MVP to final production app. Every feature, design principle, and technical requirement is documented here for the consultant to build a clean, scalable architecture.

