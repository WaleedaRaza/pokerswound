# RANK SYSTEM MVP
## Minimal Viable Prestige System

**Goal:** Get rank colors and badges visible in poker table ASAP. Everything else can wait.

---

## 🎯 MVP SCOPE

### MUST HAVE (MVP):
1. ✅ Rank calculation from hands played → simple color
2. ✅ Username colors in poker table seats
3. ✅ Basic milestone badges (hands played thresholds)
4. ✅ Launch badges (Nov 8 - Dec 8 window)
5. ✅ Badge icon next to username in table (1 icon max)
6. ✅ Rank display in Analysis page Overview tab

### CAN WAIT (Post-MVP):
- ❌ Complex animations (rainbow, shimmer, pulse)
- ❌ Toggle settings
- ❌ Hand replay viewer
- ❌ LLM chat
- ❌ Multiple analysis tabs (just Overview for now)
- ❌ Event badges, social badges
- ❌ Rank colors in friends list, navbar (can add later)
- ❌ Complex CSS animations

---

## 📋 MVP IMPLEMENTATION (3 Steps)

### STEP 1: Database & Backend (30 min)

**Migration:** `migrations/020_rank_system_mvp.sql`
```sql
-- 1. Add rank_tier to user_ranks
ALTER TABLE user_ranks
  ADD COLUMN IF NOT EXISTS rank_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hands_played BIGINT DEFAULT 0;

-- 2. Simple rank calculation function
CREATE OR REPLACE FUNCTION calculate_rank_tier(hands BIGINT)
RETURNS VARCHAR(50) AS $$
BEGIN
  CASE
    WHEN hands >= 1000000 THEN RETURN 'MASTER';
    WHEN hands >= 100000 THEN RETURN 'EXPERT';
    WHEN hands >= 10000 THEN RETURN 'SKILLED';
    WHEN hands >= 1000 THEN RETURN 'COMPETENT';
    WHEN hands >= 100 THEN RETURN 'APPRENTICE';
    ELSE RETURN 'NOVICE';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to auto-update rank
CREATE OR REPLACE FUNCTION update_rank_on_hands()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_ranks
  SET 
    rank_tier = calculate_rank_tier(NEW.total_hands_played),
    hands_played = NEW.total_hands_played,
    updated_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rank_trigger
  AFTER UPDATE OF total_hands_played ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_rank_on_hands();

-- 4. Remove playstyle badges, add MVP badges
DELETE FROM badge_definitions WHERE name IN (
  'Tight Aggressive', 'Loose Aggressive', 'Rock', 'Maniac', 'Calling Station', 'Nit'
);

-- 5. Add MVP milestone badges
INSERT INTO badge_definitions (name, description, icon, category, criteria, rarity, xp_reward) VALUES
  ('First Hand', 'Play your first hand', '🎯', 'milestone', '{"hands_played": 1}', 'common', 10),
  ('Century Club', 'Play 100 hands', '💯', 'milestone', '{"hands_played": 100}', 'common', 100),
  ('Thousand Hands', 'Play 1,000 hands', '🔥', 'milestone', '{"hands_played": 1000}', 'rare', 500),
  ('Ten Thousand', 'Play 10,000 hands', '💪', 'milestone', '{"hands_played": 10000}', 'rare', 2000),
  ('Hundred Thousand', 'Play 100,000 hands', '🏆', 'milestone', '{"hands_played": 100000}', 'epic', 10000),
  ('Million Hands', 'Play 1,000,000 hands', '👑', 'milestone', '{"hands_played": 1000000}', 'legendary', 50000)
ON CONFLICT (name) DO NOTHING;

-- 6. Add launch badges (Nov 8 - Dec 8)
INSERT INTO badge_definitions (name, description, icon, category, criteria, rarity, xp_reward, launch_exclusive, expires_at) VALUES
  ('Founding Member', 'Joined during launch week', '🌟', 'launch', '{"joined_before": "2025-12-08"}', 'legendary', 5000, true, '2025-12-08'),
  ('Day One', 'Played on launch day', '☀️', 'launch', '{"joined_date": "2025-11-08"}', 'legendary', 10000, true, '2025-11-09')
ON CONFLICT (name) DO NOTHING;
```

**API Update:** `routes/social.js` - Update `/badges/:userId` endpoint to include rank_tier

---

### STEP 2: Frontend - Username Colors (45 min)

**File:** `public/js/username-styling.js` (NEW)
```javascript
// Simple rank color mapping
const RANK_COLORS = {
  'NOVICE': '#9CA3AF',
  'APPRENTICE': '#6B7280',
  'COMPETENT': '#4B5563',
  'SKILLED': '#10B981',
  'EXPERT': '#3B82F6',
  'MASTER': '#8B5CF6'
};

// Simple function to get rank color
async function getRankColor(userId) {
  try {
    const response = await fetch(`/api/social/badges/${userId}`);
    const data = await response.json();
    const tier = data.rank?.tier || 'NOVICE';
    return RANK_COLORS[tier] || '#9CA3AF';
  } catch {
    return '#9CA3AF'; // Default gray
  }
}

// Format username with color
function formatUsernameWithRank(username, rankColor) {
  return `<span style="color: ${rankColor}">@${username}</span>`;
}
```

**File:** `public/css/rank-styling.css` (NEW)
```css
/* Simple rank colors - no animations for MVP */
.username-rank-novice { color: #9CA3AF; }
.username-rank-apprentice { color: #6B7280; }
.username-rank-competent { color: #4B5563; }
.username-rank-skilled { color: #10B981; font-weight: 600; }
.username-rank-expert { color: #3B82F6; font-weight: 700; }
.username-rank-master { color: #8B5CF6; font-weight: 700; }
```

**Update:** `public/minimal-table.html` (line 2685)
```javascript
// Before:
player.textContent = `@${displayName}`;

// After:
const rankColor = await getRankColor(seat.userId);
player.innerHTML = formatUsernameWithRank(displayName, rankColor);
```

---

### STEP 3: Badge Display in Table (30 min)

**Update:** `public/minimal-table.html` - Add badge icon next to username
```javascript
// Get top badge (launch badges first, then by rarity)
async function getTopBadge(userId) {
  try {
    const response = await fetch(`/api/social/badges/${userId}`);
    const data = await response.json();
    const badges = data.badges || [];
    
    // Prioritize launch badges
    const launchBadge = badges.find(b => b.category === 'launch');
    if (launchBadge) return launchBadge;
    
    // Then by rarity
    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
    return badges.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0))[0];
  } catch {
    return null;
  }
}

// In seat rendering:
const topBadge = await getTopBadge(seat.userId);
if (topBadge) {
  player.innerHTML += ` <span class="badge-icon" title="${topBadge.name}">${topBadge.icon}</span>`;
}
```

**CSS:** Add to `public/css/pokergeek.css`
```css
.badge-icon {
  font-size: 14px;
  margin-left: 4px;
  vertical-align: middle;
}
```

---

### STEP 4: Analysis Page - Rank Display (20 min)

**Update:** `public/pages/analysis.html` - Add rank display to Overview section
```html
<!-- Rank Display Card -->
<div class="rank-display-card liquid-glass">
  <h3>Your Rank</h3>
  <div class="rank-info">
    <div class="rank-tier" id="rank-tier">NOVICE</div>
    <div class="rank-hands" id="rank-hands">0 hands</div>
    <div class="rank-progress">
      <div class="progress-bar">
        <div class="progress-fill" id="rank-progress-fill"></div>
      </div>
      <div class="progress-text" id="rank-progress-text">0% to next rank</div>
    </div>
  </div>
</div>
```

**Update:** `loadStats()` function to fetch and display rank

---

## ✅ MVP CHECKLIST

- [ ] Database migration runs successfully
- [ ] Rank updates when hands played increases
- [ ] Username colors appear in poker table seats
- [ ] Badge icon appears next to username in table
- [ ] Rank displays in Analysis page
- [ ] Launch badges only awarded during Nov 8 - Dec 8 window
- [ ] No broken username displays
- [ ] No performance regressions

---

## 🚀 ESTIMATED TIME: 2 hours

**Breakdown:**
- Database & Backend: 30 min
- Username colors: 45 min
- Badge display: 30 min
- Analysis page: 20 min
- Testing: 15 min

---

## 📝 POST-MVP (Can Add Later)

1. Rank colors in friends list
2. Rank colors in navbar
3. Complex animations (glow, pulse, rainbow)
4. Toggle settings
5. Hand replay viewer
6. More analysis tabs
7. More badge categories

---

**Status:** Ready for implementation  
**Priority:** HIGH - This is the social proof that drives grinding

