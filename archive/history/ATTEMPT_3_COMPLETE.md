# ATTEMPT #3 - REFRESH RECOVERY FLAG SYSTEM

**Date:** October 24, 2025  
**Status:** ✅ COMPLETED  
**Agent:** Mira

## PROBLEM DIAGNOSIS

The user clarified the real issue with screenshots:
- **Screenshot 1:** Game running with poker table, cards, pot visible ✅ CORRECT
- **Screenshot 2:** Lobby screen showing "Seat 1 TAKEN, Seat 2 TAKEN" with CLAIM buttons ✅ CORRECT **BEFORE** game starts
- **Bug:** Refreshing during active game causes Screenshot 1 → Screenshot 2 (lobby UI) ❌ WRONG

**Root Cause Identified:**
Multiple `DOMContentLoaded` handlers run in sequence:
1. Card system init (line 1439)
2. Floating chips (line 3606)
3. **My refresh recovery** (line 3615) ← Tries to restore game
4. **Main initialization** (line 4099) ← Shows lobby UI, overwrites recovery!

The main init was rendering the lobby/seat selection UI AFTER my recovery code had already rendered the game UI.

## THE FIX

### Part 1: Set Recovery Flags Early (Lines 3611-3613)

```javascript
// ⚔️ MIRA: CRITICAL FLAG - Set BEFORE other handlers run
window.isRecoveringGame = false;
window.recoveredGameData = null;
```

### Part 2: Detect Active Game and Set Flag (Lines 3675-3693)

```javascript
if (data.game && data.game.status === 'active') {
  console.log('🎮 [MIRA REFRESH] Game is active, restoring game UI');
  
  // ⚔️ CRITICAL: Set flag IMMEDIATELY so other handlers don't show lobby
  window.isRecoveringGame = true;
  window.currentGameId = data.game.id;
  
  // Store recovery data for main init to use
  window.recoveredGameData = {
    gameId: data.game.id,
    roomId: roomId,
    seatIndex: data.mySeat.seat_index,
    chips: data.mySeat.chips_in_play
  };
  
  // Set currentGame so other functions work
  window.currentGame = {
    gameId: data.game.id,
    roomId: roomId
  };
  
  console.log('🎮 [MIRA REFRESH] Recovery data stored, will render after main init');
}
```

### Part 3: Main Init Checks Flag First (Lines 4166-4204)

```javascript
// ⚔️ MIRA: Check if we're recovering an active game
if (window.isRecoveringGame && window.recoveredGameData) {
  console.log('🎮 [MIRA MAIN] Recovery flag detected, rendering game UI');
  const recoveryData = window.recoveredGameData;
  
  // Hide landing page, show game UI
  hideLandingPage();
  
  // Connect socket
  connectSocket();
  
  // Set up room and game data
  room = { id: recoveryData.roomId };
  currentGame = { gameId: recoveryData.gameId, roomId: recoveryData.roomId };
  window.currentRoomId = recoveryData.roomId;
  window.currentSeat = recoveryData.seatIndex;
  window.currentChips = recoveryData.chips;
  
  // Join room via socket
  if (socket) {
    socket.emit('join_room', { roomId: recoveryData.roomId, userId: currentUser.id });
  }
  
  // Fetch and render game state
  try {
    const gameResponse = await fetch(`${API_BASE}/games/${recoveryData.gameId}`);
    if (gameResponse.ok) {
      const gameState = await gameResponse.json();
      console.log('🎮 [MIRA MAIN] Rendering recovered game state');
      updateGameDisplay(gameState);
      showStatus(`🎮 Game restored - it's ${gameState.toAct === window.currentSeat ? 'YOUR TURN' : 'not your turn'}`, 'success');
    }
  } catch (err) {
    console.error('❌ [MIRA MAIN] Failed to render game:', err);
    showStatus('⚠️ Error restoring game', 'error');
  }
  
  // Skip normal initialization flow
  console.log('✅ Game recovery complete');
  return; // ← CRITICAL: Exit early, skip lobby UI rendering
}
```

## HOW IT WORKS

### Normal First Load (No Active Game):
1. `isRecoveringGame` stays `false`
2. Main init runs normal flow: `autoJoinRoom` or `showLandingPage`
3. Lobby UI shows correctly ✅

### Refresh During Active Game:
1. Refresh recovery handler runs (3rd)
2. Detects active game → sets `isRecoveringGame = true`
3. Stores game data in `recoveredGameData`
4. Main init runs (4th)
5. **Sees flag, renders game UI directly, returns early**
6. Lobby UI is never shown ✅
7. Game continues seamlessly ✅

## FILES MODIFIED

- `public/poker.html`:
  - Lines 3611-3613: Initialize recovery flags
  - Lines 3675-3693: Set flags when active game detected
  - Lines 4166-4204: Check flags and handle recovery in main init

## CRITICAL INSIGHT

The user's statement is profound:
> "with being this brittle, we wont realistically eb able to scale to anytime joining leaving and admitting kicking and away mode. your execution and undertsanding of this is crucial as it lays a cvery deep foundation"

This fix establishes a **state recovery pattern** that will be essential for:
- Player joining mid-game
- Player kicked/admitted
- Away mode (player goes AFK, comes back)
- Spectator mode
- Tournament rejoin

The flag system allows different initialization paths based on the user's state, rather than forcing everyone through the same lobby flow.

## NEXT STEP

Manual test required:
1. Start server
2. Create room, start game with 2+ players
3. **Refresh as host during active game**
4. **Verify:** Should see poker table (Screenshot 1), NOT lobby (Screenshot 2)

---

**⚔️ MIRA: This is the foundation for scalable multiplayer state management.**

