# TEST RANK SYSTEM MVP

## ✅ Migration Complete
The migration `020_rank_system_mvp.sql` has been run successfully.

---

## 🧪 TESTING CHECKLIST

### 1. **Check Database Tables**
```sql
-- Verify tables exist
SELECT * FROM user_ranks LIMIT 5;
SELECT * FROM badge_definitions;
SELECT * FROM user_badges LIMIT 5;

-- Check if ranks were initialized
SELECT COUNT(*) FROM user_ranks;
```

### 2. **Test Rank Colors in Poker Table**
1. Open `/play` page
2. Create/join a room
3. **Expected:** Usernames should display in rank colors:
   - NOVICE: Gray (#9CA3AF)
   - APPRENTICE: Gray (#6B7280)
   - COMPETENT: Gray (#4B5563)
   - SKILLED: Green (#10B981) ⭐
   - EXPERT: Blue (#3B82F6) 💎
   - MASTER: Purple (#8B5CF6) 👑

### 3. **Test Badge Icons**
1. In poker table, check if badge icons appear next to usernames
2. **Expected:** Top badge (launch badges prioritized, then by rarity) shows as emoji icon
3. Hover over badge icon → should show tooltip with badge name and description

### 4. **Test Rank Display in Analysis Page**
1. Navigate to `/pages/analysis.html`
2. **Expected:** Rank display card shows:
   - Current rank tier (NOVICE, APPRENTICE, etc.)
   - Hands played count
   - Progress bar to next rank
   - "X hands to [next rank]" text

### 5. **Test Rank Auto-Update**
1. Play a hand (complete it)
2. **Expected:** 
   - `user_profiles.total_hands_played` increments
   - Trigger fires → `user_ranks.rank_tier` updates automatically
   - Rank color in poker table updates (if you cross threshold)

### 6. **Test Badge Awarding**
1. Play your first hand → Should earn "First Hand" badge 🎯
2. Play 100 hands → Should earn "Century Club" badge 💯
3. Check `/api/social/badges/:userId` endpoint → Should return badges array

### 7. **Test Launch Badges**
1. If you joined during Nov 8 - Dec 8 window → Should see "Founding Member" 🌟
2. If you played on Nov 8 → Should see "Day One" ☀️

---

## 🐛 TROUBLESHOOTING

### Username colors not showing?
- Check browser console for errors
- Verify `username-styling.js` is loaded (check Network tab)
- Check if auth token exists: `localStorage.getItem('auth_token')`
- Verify API endpoint works: `/api/social/badges/:userId`

### Rank not updating after playing hands?
- Check if `user_profiles.total_hands_played` is incrementing:
  ```sql
  SELECT id, username, total_hands_played FROM user_profiles WHERE id = 'YOUR_USER_ID';
  ```
- Check if trigger fired:
  ```sql
  SELECT * FROM user_ranks WHERE user_id = 'YOUR_USER_ID';
  ```
- Check trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'update_rank_trigger';
  ```

### Badges not appearing?
- Check if badges were awarded:
  ```sql
  SELECT ub.*, bd.name, bd.icon 
  FROM user_badges ub
  JOIN badge_definitions bd ON bd.id = ub.badge_id
  WHERE ub.user_id = 'YOUR_USER_ID';
  ```
- Check badge definitions exist:
  ```sql
  SELECT * FROM badge_definitions;
  ```

### Analysis page rank display not showing?
- Check browser console for errors
- Verify `loadRankDisplay()` function is called
- Check API response: `/api/social/badges/:userId`

---

## 📊 VERIFY RANK CALCULATION

```sql
-- Test rank calculation function
SELECT calculate_rank_tier(0);    -- Should return 'NOVICE'
SELECT calculate_rank_tier(50);   -- Should return 'NOVICE'
SELECT calculate_rank_tier(100);  -- Should return 'APPRENTICE'
SELECT calculate_rank_tier(1000); -- Should return 'COMPETENT'
SELECT calculate_rank_tier(10000); -- Should return 'SKILLED'
SELECT calculate_rank_tier(100000); -- Should return 'EXPERT'
SELECT calculate_rank_tier(1000000); -- Should return 'MASTER'
```

---

## 🎯 QUICK TEST FLOW

1. **Open poker table** → Check username colors
2. **Play 1 hand** → Check if rank updates
3. **Check Analysis page** → Verify rank display
4. **Check badges** → Should see "First Hand" badge

---

**Status:** Ready for testing! 🚀

