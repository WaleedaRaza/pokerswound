# Phase 4 Integration Guide

## Components Created

### 1. **SeatComponent.js**
- Renders individual seat with player info, chips, cards, badges
- Updates from gameState (no guessing)
- Handles card visibility (my cards, shown cards, card backs, muck)

### 2. **PotDisplay.js**
- Renders main pot, side pots, total pot
- Pure rendering from gameState

### 3. **ActionButtons.js**
- Renders FOLD, CHECK/CALL, RAISE buttons
- Uses gameStateClient for state (no guessing)
- Calculates call amount from state

### 4. **CommunityCards.js**
- Renders community cards (flop, turn, river)
- Handles progressive reveals

### 5. **TableRenderer.js**
- Main orchestrator
- Coordinates all components
- Uses gameStateClient for state management
- Renders from server state only

## Integration Steps

### Step 1: Include Components in HTML

Add before closing `</body>` tag in `minimal-table.html`:

```html
<!-- Component Scripts -->
<script src="/js/game-state-client.js"></script>
<script src="/js/components/SeatComponent.js"></script>
<script src="/js/components/PotDisplay.js"></script>
<script src="/js/components/ActionButtons.js"></script>
<script src="/js/components/CommunityCards.js"></script>
<script src="/js/TableRenderer.js"></script>
```

### Step 2: Initialize TableRenderer

Replace existing state management with:

```javascript
// Initialize game state client
const gameStateClient = new GameStateClient();

// Initialize table renderer
const tableRenderer = new TableRenderer(userId, gameStateClient);
tableRenderer.initialize();

// Set seats from database
tableRenderer.setSeats(seats);

// Set hole cards when received
tableRenderer.setMyHoleCards(myHoleCards);

// Set spectator status
tableRenderer.setSpectatorStatus(isSpectator);
```

### Step 3: Update Socket Listeners

Replace existing socket listeners with:

```javascript
// Listen for action_processed events
socket.on('action_processed', (event) => {
  // Update state client (handles sequence tracking)
  gameStateClient.updateState(event);
  
  // Get updated state
  const gameState = gameStateClient.getState();
  
  // Render from state (no guessing)
  tableRenderer.renderFromState(gameState);
});

// Listen for hand_started events
socket.on('hand_started', (event) => {
  gameStateClient.updateState(event);
  const gameState = gameStateClient.getState();
  tableRenderer.renderFromState(gameState);
});

// Listen for street_reveal events (all-in runout)
socket.on('street_reveal', (event) => {
  gameStateClient.updateState(event);
  const gameState = gameStateClient.getState();
  tableRenderer.handleStreetReveal(event.payload.street, event.payload.cards);
});
```

### Step 4: Handle Actions

Replace existing `performAction` with:

```javascript
// Listen for action events from ActionButtons component
document.addEventListener('playerAction', (event) => {
  const { action, amount, actionSeq } = event.detail;
  
  performAction(action, amount, actionSeq);
});

async function performAction(action, amount, actionSeq) {
  // Get current sequence from state client
  const currentState = gameStateClient.getState();
  const expectedSeq = currentState?.actionSeq || 0;
  
  // Send action to server
  const response = await fetch(`/api/engine/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      userId,
      action,
      amount,
      actionSeq: expectedSeq
    })
  });
  
  // Server will broadcast update via socket
  // State client will update, renderer will re-render
}
```

### Step 5: Remove State Guessing Logic

Remove all code that:
- Calculates call amount from `currentBet - myBet` (use `gameStateClient.getCallAmount()`)
- Checks if it's my turn by comparing `currentActorSeat` (use `gameStateClient.isMyTurn()`)
- Guesses button states (use `gameStateClient.canCheck()`, `canCall()`, `canRaise()`)
- Manually updates chips (components handle this from gameState)

## Benefits

1. **Single Source of Truth**: Server state is the only source
2. **No State Guessing**: All calculations use gameStateClient
3. **Componentized**: Easy to test and maintain
4. **Sequence Tracking**: Handles out-of-order events
5. **Type Safety**: Clear interfaces between components

## Migration Checklist

- [ ] Include component scripts in HTML
- [ ] Initialize TableRenderer
- [ ] Update socket listeners to use gameStateClient
- [ ] Replace performAction with event-based approach
- [ ] Remove all state guessing logic
- [ ] Test: Verify buttons work correctly
- [ ] Test: Verify chips update correctly
- [ ] Test: Verify cards display correctly
- [ ] Test: Verify pot display works
- [ ] Test: Verify turn highlighting works

## Backward Compatibility

- Components are additive (don't break existing code)
- Can be integrated incrementally
- Old code can coexist during migration
- Full migration recommended for clean architecture

