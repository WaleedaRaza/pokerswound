# 🧪 TEST PHASE 1c NOW - REAL GAME STATE

## ⚡ WHAT'S NEW

**Mock behavior is gone.** The game now:
- ✅ Shuffles a real 52-card deck
- ✅ Deals real hole cards to players
- ✅ Posts blinds (SB/BB) automatically
- ✅ Saves full game state to database (JSONB)
- ✅ Broadcasts private cards via WebSocket
- ✅ Shows pot, current bet, whose turn

---

## 🚀 QUICK TEST (2 BROWSERS)

### **Step 1: Create Room**
```
Browser 1: http://localhost:3000/play
Click "Create Sandbox"
Copy room code (e.g., ZPAMC5)
```

### **Step 2: Join Room**
```
Browser 2: http://localhost:3000/play
Click "Join Sandbox"
Paste room code
```

### **Step 3: Claim Seats**
```
Both browsers: Click empty seat to claim
```

### **Step 4: Start Hand**
```
Browser 1 (Host): Click "🎮 START HAND"
```

---

## ✅ EXPECTED RESULTS

### **Both Browsers Should See:**
- 💰 **Pot: $15** (small blind $5 + big blind $10)
- 🎯 **Current Bet: $10** (big blind amount)
- 👉 **"(Seat X's turn)"** (first to act after BB)
- 💵 **Chips Updated:**
  - Small blind seat: $995 (posted $5)
  - Big blind seat: $990 (posted $10)

### **Each Browser Sees Different Cards:**
- 🃏 **Browser 1:** e.g., Ah Kd (Ace of hearts, King of diamonds)
- 🃏 **Browser 2:** e.g., Qc Js (Queen of clubs, Jack of spades)

**CRITICAL:** Each player sees **only their own** hole cards (private WebSocket emit).

---

## 🔍 VERIFY DB PERSISTENCE

1. **Browser 1:** Refresh page
2. **Expected:**
   - ✅ Seats still claimed
   - ✅ Game still in progress
   - ✅ Chips still show post-blind amounts

**Check DB (optional):**
```sql
SELECT id, hand_number, total_pot, status, current_state::jsonb->'pot' as pot
FROM game_states
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🎲 CARD FORMAT EXAMPLES

**Backend format:** `Ah`, `Kd`, `2c`, `Ts` (compact)  
**Frontend converts to:** `/cards/hearts_A.png`, `/cards/diamonds_K.png`

| Code | Suit | Rank | Image Path |
|------|------|------|------------|
| `Ah` | hearts | Ace | `/cards/hearts_A.png` |
| `Kd` | diamonds | King | `/cards/diamonds_K.png` |
| `Qc` | clubs | Queen | `/cards/clubs_Q.png` |
| `Js` | spades | Jack | `/cards/spades_J.png` |
| `Ts` | spades | 10 | `/cards/spades_10.png` |
| `2h` | hearts | 2 | `/cards/hearts_2.png` |

---

## 🐛 IF SOMETHING BREAKS

### **Cards don't show:**
- Open console (F12), check for errors
- Verify image paths: `/cards/hearts_A.png` exists

### **Same cards for both players:**
- Check console for `🔒 Hole cards received (private)` message
- Verify WebSocket connected (`🟢 Connected`)

### **Pot/bet not showing:**
- Check console for `✅ Game state updated` message
- Verify `communitySection` div is visible

### **Chips not updated:**
- Check console for `✅ Seats data received` after hand starts
- Verify DB query returned updated `chips_in_play`

---

## 📊 DEBUG CONSOLE

Both pages have a live debug log at the bottom. Look for:

```
[TIME] 🃏 Starting real hand
[TIME] 🎲 Starting hand with 2 players
[TIME] 🃏 Deck shuffled, total cards: 52
[TIME] 🎴 Dealt hole cards to all players
[TIME] 💰 Blinds posted: SB=5, BB=10, Pot=15
[TIME] 👉 First to act: Seat X
[TIME] 💾 Game state saved: minimal_...
[TIME] 📡 Broadcast hand_started to room:...
[TIME] 🔒 Sent private hole cards to 2 players
[TIME] 🔒 Hole cards received (private) { userId: "...", cards: ["Ah", "Kd"] }
[TIME] ✅ Game state updated { pot: 15, currentBet: 10, street: "PREFLOP" }
```

---

## 🎯 NEXT EVOLUTION: PHASE 2a

Once you confirm this works:
- ✅ Make action buttons (FOLD/CALL/RAISE) actually work
- ✅ Update game state after each action
- ✅ Rotate turn to next player
- ✅ Broadcast actions to all players

---

**🔥 READY TO TEST - SERVER IS RUNNING**

Open 2 browsers, create/join sandbox, claim seats, hit START HAND!

