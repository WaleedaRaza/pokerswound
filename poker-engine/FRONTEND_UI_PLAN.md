# User Profile Editing UI Plan

## 1. Profile Edit Modal
- Triggered by clicking user profile in header
- Modal with form fields:
  - Username (with availability check)
  - Display Name
  - Bio (optional)
  - Avatar upload (future)

## 2. Real-time Username Validation
- Check availability as user types
- Show green checkmark if available
- Show red X if taken
- Debounced API calls (500ms delay)

## 3. Profile Display Updates
- Update header username immediately
- Update all game displays (lobby, table, etc.)
- Show "Guest" vs "Authenticated" status

## 4. Error Handling
- Username already taken
- Invalid characters
- Server errors
- Network failures

## 5. Success Feedback
- Profile saved confirmation
- Updated username display
- Smooth transitions

## 6. Guest User Limitations
- Can change username/display name
- Cannot change email (no email)
- Changes persist in localStorage
- Lost on page refresh (unless we implement guest persistence)

## 7. Authenticated User Features
- All profile fields editable
- Changes saved to database
- Persistent across sessions
- Can link to social profiles (future)
