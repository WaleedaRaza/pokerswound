# PRESTIGE SYSTEM IMPLEMENTATION PLAN
## Rank Colors, Badges, and Analytics Expansion

**Date:** 2025-11-06  
**Status:** In Progress  
**Launch Window:** Nov 8 - Dec 8, 2025 (30 days)

---

## 🎯 CORE VISION

**Rank Colors = Karate Belts**: Bold, visible, toggleable. Everywhere a username appears, it's in that rank color.

**Badges = Social Proof**: Visible in poker table, friends list, everywhere. Launch badges become rare collectibles.

**Analytics = Privacy-Safe**: Only YOUR data, never opponent playstyle. Simplified hand replays (data format, not full table).

---

## 📋 IMPLEMENTATION PHASES

### PHASE 1: Database & Backend Foundation ✅

#### 1.1 Expand Badge Definitions
- **Remove**: Playstyle badges (Tight Aggressive, Loose Aggressive, Rock, Maniac, Calling Station, Nit)
- **Add**: 
  - Launch badges (Nov 8 - Dec 8 window)
  - Expanded milestone badges (every major threshold)
  - Performance badges (win streaks, big pots, hand strength)
  - Social badges (friends, rooms created)
  - Event badges (holidays, special events)

#### 1.2 Update User Ranks Table
```sql
ALTER TABLE user_ranks
  ADD COLUMN rank_tier VARCHAR(50),        -- NOVICE, SKILLED, EXPERT, etc.
  ADD COLUMN hands_played BIGINT DEFAULT 0,
  ADD COLUMN username_style JSONB,          -- {color, icon, glow, animation}
  ADD COLUMN unlocked_perks JSONB;         -- Array of unlocked features
```

#### 1.3 Rank Calculation System
- Function: `calculate_rank_from_hands(hands BIGINT)` → Returns tier, color, icon
- Trigger: Auto-update rank when `user_profiles.total_hands_played` changes
- Rank Tiers:
  - NOVICE: 1-99 hands (gray #9CA3AF)
  - APPRENTICE: 100-999 (gray #6B7280)
  - COMPETENT: 1K-9.9K (gray #4B5563)
  - SKILLED: 10K-99.9K (green #10B981) ⭐
  - EXPERT: 100K-999.9K (blue #3B82F6) 💎
  - MASTER: 1M-9.9M (purple #8B5CF6) 👑
  - GRANDMASTER: 10M-99.9M (orange #F59E0B) 🔥
  - LEGEND: 100M-999.9M (red #EF4444) ⚡
  - IMMORTAL: 1B+ (pink #EC4899) ✨ (rainbow animation)

#### 1.4 Update Badges API
- Include rank tier, username style, hands played
- Include launch badge flag
- Sort badges by rarity and display priority

---

### PHASE 2: Username Styling System ✅

#### 2.1 Create Username Styling Utility
**File:** `public/js/username-styling.js`

```javascript
class UsernameStyler {
  // Get rank color from hands played
  static getRankStyle(handsPlayed) { ... }
  
  // Apply rank color to username element
  static applyRankColor(element, rankStyle) { ... }
  
  // Get badge icon HTML (for display next to name)
  static getBadgeIcon(badge) { ... }
  
  // Format username with rank and badges
  static formatUsername(username, rankStyle, badges) { ... }
}
```

#### 2.2 Update All Username Display Locations
- `public/minimal-table.html` - Table seats (line 2685)
- `public/js/poker-table-v2.js` - Table seats (line 450)
- `public/js/friends-page.js` - Friends list (line 201)
- `public/js/navbar-template.js` - Navbar username
- `public/pages/play.html` - Room player lists
- Any other username displays

**Pattern:**
```javascript
// Before:
player.textContent = `@${displayName}`;

// After:
const rankStyle = await UsernameStyler.getRankStyle(userId);
const badges = await fetchUserBadges(userId);
player.innerHTML = UsernameStyler.formatUsername(displayName, rankStyle, badges);
```

#### 2.3 CSS for Rank Colors
**File:** `public/css/rank-styling.css`

```css
.username-rank-novice { color: #9CA3AF; }
.username-rank-skilled { color: #10B981; font-weight: 600; }
.username-rank-expert { color: #3B82F6; font-weight: 700; }
.username-rank-master { 
  color: #8B5CF6; 
  font-weight: 700;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  animation: pulse-glow 2s ease-in-out infinite;
}
.username-rank-grandmaster { 
  color: #F59E0B; 
  font-weight: 800;
  text-shadow: 0 0 15px rgba(245, 158, 11, 0.6);
  animation: pulse-glow 1.5s ease-in-out infinite;
}
.username-rank-legend { 
  color: #EF4444; 
  font-weight: 800;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
  animation: shimmer 3s linear infinite;
  border: 2px solid #EF4444;
  padding: 2px 8px;
  border-radius: 4px;
}
.username-rank-immortal { 
  background: linear-gradient(90deg, #EC4899, #8B5CF6, #3B82F6, #10B981, #F59E0B, #EC4899);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbow 3s linear infinite;
  font-weight: 900;
  border: 3px solid;
  border-image: linear-gradient(90deg, #EC4899, #8B5CF6, #3B82F6) 1;
  padding: 3px 10px;
  border-radius: 6px;
}
```

---

### PHASE 3: Badge Display in Poker Table ✅

#### 3.1 Badge Icon Component
- Small icon next to username (only for rare/epic/legendary badges)
- Launch badges always shown
- Hover tooltip shows badge name and description

#### 3.2 Update Table Seat Rendering
- Add badge icon container next to player name
- Fetch badges when rendering seats
- Show top 1-2 badges (by rarity/priority)

---

### PHASE 4: Analysis Page Expansion ✅

#### 4.1 Tab Structure
**Tabs:**
1. **Overview** - Rank display, recent form, quick stats, progress bars
2. **Hands & Replays** - Filterable hand history, simplified replay viewer
3. **Badges & Achievements** - Badge gallery, launch badges section, rarity filters
4. **Ranks & Legacy** - Lifetime hand ladder, rank progression, legacy stats
5. **Game Analysis** - Positional performance, hand strength analysis, trends (YOUR data only)
6. **Chat w Poker LLM** - Mock for now, post-game popup integration

#### 4.2 Simplified Hand Replay
- Data format (not full table animation)
- Show: Your cards, board progression, your actions, pot size, outcome
- Privacy-safe: Only YOUR actions visible, not opponents'

#### 4.3 Post-Game LLM Popup
- After game ends, show popup: "Want to analyze this game?"
- Options: "Go to Analysis" or "Dismiss"
- Mock implementation for now (no actual LLM calls)

---

### PHASE 5: Settings & Toggle ✅

#### 5.1 Toggle for Rank Colors
- Settings option: "Show rank colors" (on/off)
- Stored in user preferences
- When off, usernames display in default color

#### 5.2 Toggle for Badge Display
- Settings option: "Show badges" (on/off)
- When off, badges hidden but still earned

---

## 🔧 TECHNICAL DETAILS

### Database Migrations Needed
1. `migrations/020_expand_badge_system.sql` - Remove playstyle badges, add launch/performance badges
2. `migrations/021_rank_system_expansion.sql` - Add rank_tier, hands_played, username_style columns
3. `migrations/022_rank_calculation_trigger.sql` - Auto-calculate ranks from hands played

### API Endpoints to Update
1. `GET /api/social/badges/:userId` - Include rank tier, username style
2. `GET /api/social/profile/:userId` - Include rank tier in profile response
3. `GET /api/social/rank/:userId` - New endpoint for rank details

### Frontend Files to Create
1. `public/js/username-styling.js` - Username styling utility
2. `public/css/rank-styling.css` - Rank color CSS
3. `public/js/hand-replay-viewer.js` - Simplified replay component
4. `public/js/llm-chat-popup.js` - Post-game popup (mock)

### Frontend Files to Update
1. `public/minimal-table.html` - Username display with rank colors
2. `public/js/poker-table-v2.js` - Username display with rank colors
3. `public/js/friends-page.js` - Username display with rank colors
4. `public/pages/analysis.html` - Tab structure expansion
5. `public/js/analytics-components.js` - Badge display components
6. All other username display locations

---

## 🎨 DESIGN PRINCIPLES

1. **Bold Rank Colors**: Like karate belts - immediately visible, status symbol
2. **Toggleable**: Users can turn off if they prefer subtlety
3. **Privacy-First**: Never show opponent analytics, only your own
4. **Simplified Replays**: Data format, not full table animation (competitors suck because they make you play through entire table)
5. **Launch Badges = Rare**: Only available Nov 8 - Dec 8, become collectibles

---

## 📊 RANK TIER BREAKDOWN

| Tier | Hands | Color | Icon | Style |
|------|-------|-------|------|-------|
| Novice | 1-99 | Gray #9CA3AF | 🌱 | Normal |
| Apprentice | 100-999 | Gray #6B7280 | 📚 | Normal |
| Competent | 1K-9.9K | Gray #4B5563 | 🎯 | Normal |
| Skilled | 10K-99.9K | Green #10B981 | ⭐ | Bold |
| Expert | 100K-999.9K | Blue #3B82F6 | 💎 | Bold + Shadow |
| Master | 1M-9.9M | Purple #8B5CF6 | 👑 | Bold + Glow + Pulse |
| Grandmaster | 10M-99.9M | Orange #F59E0B | 🔥 | Bold + Strong Glow + Pulse |
| Legend | 100M-999.9M | Red #EF4444 | ⚡ | Bold + Shimmer + Border |
| Immortal | 1B+ | Pink #EC4899 | ✨ | Rainbow Gradient + Border |

---

## 🚀 IMPLEMENTATION ORDER

1. ✅ Database migrations (badges, ranks)
2. ✅ Backend API updates
3. ✅ Username styling utility
4. ✅ CSS for rank colors
5. ✅ Update username displays (one by one, test each)
6. ✅ Badge display in table
7. ✅ Analysis page tabs
8. ✅ Hand replay viewer
9. ✅ LLM popup (mock)
10. ✅ Settings toggles

---

## ⚠️ CRITICAL NOTES

- **DO NOT BREAK ANYTHING**: Test each change incrementally
- **Privacy**: Never expose opponent playstyle data
- **Performance**: Cache rank/badge data, don't fetch on every render
- **Launch Window**: Hard deadline Dec 8 - badges must check `created_at` or `earned_at` date
- **Backward Compatibility**: Existing users get default rank (Novice) until they play hands

---

## 📝 TESTING CHECKLIST

- [ ] Rank colors appear correctly in table seats
- [ ] Rank colors appear correctly in friends list
- [ ] Rank colors appear correctly in navbar
- [ ] Badges display next to usernames in table
- [ ] Launch badges only awarded during Nov 8 - Dec 8 window
- [ ] Rank updates automatically when hands played increases
- [ ] Toggle works (can turn off rank colors)
- [ ] Hand replay shows simplified data format
- [ ] Analysis page tabs work correctly
- [ ] LLM popup appears after game (mock)
- [ ] No performance regressions
- [ ] No broken username displays

---

**Status:** Ready for implementation  
**Next Step:** Begin Phase 1 - Database migrations
