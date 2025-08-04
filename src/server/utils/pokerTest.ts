import { GameManager } from '../services/gameManager';
import { Card, Rank, Suit, Action } from '../services/pokerEngine';
import { HandEvaluator } from '../services/handEvaluator';

async function testPokerEngine() {
  console.log('🧪 TESTING POKER ENGINE');
  console.log('========================');

  // Test 1: Basic hand evaluation
  console.log('\n1. Testing Hand Evaluation...');
  testHandEvaluation();

  // Test 2: Game creation and basic flow
  console.log('\n2. Testing Game Creation...');
  await testGameCreation();

  // Test 3: Betting actions
  console.log('\n3. Testing Betting Actions...');
  await testBettingActions();

  // Test 4: Complete game flow
  console.log('\n4. Testing Complete Game Flow...');
  await testCompleteGameFlow();

  console.log('\n✅ All tests completed!');
}

function testHandEvaluation() {
  // Test straight flush
  const straightFlushCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.KING, Suit.HEARTS),
    new Card(Rank.QUEEN, Suit.HEARTS),
    new Card(Rank.JACK, Suit.HEARTS),
    new Card(Rank.TEN, Suit.HEARTS)
  ];
  const straightFlushResult = HandEvaluator.evaluateHand(straightFlushCards.slice(0, 2), straightFlushCards.slice(2));
  console.log(`Straight Flush: ${straightFlushResult.description}`);

  // Test four of a kind
  const fourOfAKindCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.ACE, Suit.DIAMONDS),
    new Card(Rank.ACE, Suit.CLUBS),
    new Card(Rank.ACE, Suit.SPADES),
    new Card(Rank.KING, Suit.HEARTS)
  ];
  const fourOfAKindResult = HandEvaluator.evaluateHand(fourOfAKindCards.slice(0, 2), fourOfAKindCards.slice(2));
  console.log(`Four of a Kind: ${fourOfAKindResult.description}`);

  // Test full house
  const fullHouseCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.ACE, Suit.DIAMONDS),
    new Card(Rank.KING, Suit.CLUBS),
    new Card(Rank.KING, Suit.SPADES),
    new Card(Rank.KING, Suit.HEARTS)
  ];
  const fullHouseResult = HandEvaluator.evaluateHand(fullHouseCards.slice(0, 2), fullHouseCards.slice(2));
  console.log(`Full House: ${fullHouseResult.description}`);

  // Test flush
  const flushCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.KING, Suit.HEARTS),
    new Card(Rank.QUEEN, Suit.HEARTS),
    new Card(Rank.JACK, Suit.HEARTS),
    new Card(Rank.NINE, Suit.HEARTS)
  ];
  const flushResult = HandEvaluator.evaluateHand(flushCards.slice(0, 2), flushCards.slice(2));
  console.log(`Flush: ${flushResult.description}`);

  // Test straight
  const straightCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.KING, Suit.DIAMONDS),
    new Card(Rank.QUEEN, Suit.CLUBS),
    new Card(Rank.JACK, Suit.SPADES),
    new Card(Rank.TEN, Suit.HEARTS)
  ];
  const straightResult = HandEvaluator.evaluateHand(straightCards.slice(0, 2), straightCards.slice(2));
  console.log(`Straight: ${straightResult.description}`);

  // Test three of a kind
  const threeOfAKindCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.ACE, Suit.DIAMONDS),
    new Card(Rank.ACE, Suit.CLUBS),
    new Card(Rank.KING, Suit.SPADES),
    new Card(Rank.QUEEN, Suit.HEARTS)
  ];
  const threeOfAKindResult = HandEvaluator.evaluateHand(threeOfAKindCards.slice(0, 2), threeOfAKindCards.slice(2));
  console.log(`Three of a Kind: ${threeOfAKindResult.description}`);

  // Test two pair
  const twoPairCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.ACE, Suit.DIAMONDS),
    new Card(Rank.KING, Suit.CLUBS),
    new Card(Rank.KING, Suit.SPADES),
    new Card(Rank.QUEEN, Suit.HEARTS)
  ];
  const twoPairResult = HandEvaluator.evaluateHand(twoPairCards.slice(0, 2), twoPairCards.slice(2));
  console.log(`Two Pair: ${twoPairResult.description}`);

  // Test one pair
  const onePairCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.ACE, Suit.DIAMONDS),
    new Card(Rank.KING, Suit.CLUBS),
    new Card(Rank.QUEEN, Suit.SPADES),
    new Card(Rank.JACK, Suit.HEARTS)
  ];
  const onePairResult = HandEvaluator.evaluateHand(onePairCards.slice(0, 2), onePairCards.slice(2));
  console.log(`One Pair: ${onePairResult.description}`);

  // Test high card
  const highCardCards = [
    new Card(Rank.ACE, Suit.HEARTS),
    new Card(Rank.KING, Suit.DIAMONDS),
    new Card(Rank.QUEEN, Suit.CLUBS),
    new Card(Rank.JACK, Suit.SPADES),
    new Card(Rank.NINE, Suit.HEARTS)
  ];
  const highCardResult = HandEvaluator.evaluateHand(highCardCards.slice(0, 2), highCardCards.slice(2));
  console.log(`High Card: ${highCardResult.description}`);
}

async function testGameCreation() {
  const gameManager = new GameManager();
  
  const players = [
    { id: 'player1', name: 'Alice', stack: 1000 },
    { id: 'player2', name: 'Bob', stack: 1000 },
    { id: 'player3', name: 'Charlie', stack: 1000 },
    { id: 'player4', name: 'David', stack: 1000 }
  ];

  const gameState = await gameManager.createGame('test-game-1', players, 10);
  
  console.log(`Game created with ID: ${gameState.id}`);
  console.log(`Players: ${gameState.players.map(p => p.name).join(', ')}`);
  console.log(`Pot: $${gameState.pot}`);
  console.log(`Current bet: $${gameState.currentBet}`);
  console.log(`Street: ${gameState.street}`);
  console.log(`Current player: ${gameState.players[gameState.currentPlayerIndex]?.name || 'Unknown'}`);
  
  // Verify blinds were posted
  const smallBlindPlayer = gameState.players.find(p => p.isSmallBlind);
  const bigBlindPlayer = gameState.players.find(p => p.isBigBlind);
  
  console.log(`Small blind: ${smallBlindPlayer?.name} paid $${smallBlindPlayer?.paidAmount}`);
  console.log(`Big blind: ${bigBlindPlayer?.name} paid $${bigBlindPlayer?.paidAmount}`);
  
  // Verify hole cards were dealt
  for (const player of gameState.players) {
    console.log(`${player.name} has ${player.holeCards.length} hole cards`);
  }
}

async function testBettingActions() {
  const gameManager = new GameManager();
  
  const players = [
    { id: 'player1', name: 'Alice', stack: 1000 },
    { id: 'player2', name: 'Bob', stack: 1000 },
    { id: 'player3', name: 'Charlie', stack: 1000 },
    { id: 'player4', name: 'David', stack: 1000 }
  ];

  const gameState = await gameManager.createGame('test-game-2', players, 10);
  
  console.log('Testing betting actions...');
  
  // Test call action
  const callResult = gameManager.processAction('test-game-2', {
    playerId: 'player4',
    action: Action.CALL
  });
  
  if (callResult) {
    console.log(`Player called, new pot: $${callResult.pot}`);
  }
  
  // Test raise action
  const raiseResult = gameManager.processAction('test-game-2', {
    playerId: 'player1',
    action: Action.RAISE,
    amount: 50
  });
  
  if (raiseResult) {
    console.log(`Player raised to $50, new pot: $${raiseResult.pot}`);
  }
  
  // Test fold action
  const foldResult = gameManager.processAction('test-game-2', {
    playerId: 'player2',
    action: Action.FOLD
  });
  
  if (foldResult) {
    const foldedPlayer = foldResult.players.find(p => p.id === 'player2');
    console.log(`Player folded, status: ${foldedPlayer?.status}`);
  }
}

async function testCompleteGameFlow() {
  const gameManager = new GameManager();
  
  const players = [
    { id: 'player1', name: 'Alice', stack: 1000 },
    { id: 'player2', name: 'Bob', stack: 1000 },
    { id: 'player3', name: 'Charlie', stack: 1000 },
    { id: 'player4', name: 'David', stack: 1000 }
  ];

  const gameState = await gameManager.createGame('test-game-3', players, 10);
  
  console.log('Testing complete game flow...');
  console.log(`Initial state: ${gameState.street}, pot: $${gameState.pot}`);
  
  // Simulate a complete betting round
  const actions = [
    { playerId: 'player4', action: Action.CALL },
    { playerId: 'player1', action: Action.RAISE, amount: 50 },
    { playerId: 'player2', action: Action.CALL },
    { playerId: 'player3', action: Action.CALL },
    { playerId: 'player4', action: Action.CALL }
  ];
  
  for (const action of actions) {
    const result = gameManager.processAction('test-game-3', action);
    if (result) {
      console.log(`${action.playerId} ${action.action}${action.amount ? ` $${action.amount}` : ''}, pot: $${result.pot}, street: ${result.street}`);
    }
  }
  
  // Check if we advanced to flop
  const finalState = gameManager.getGameState('test-game-3');
  if (finalState) {
    console.log(`Final state: ${finalState.street}, community cards: ${finalState.communityCards.length}`);
  }
}

// Run the tests
testPokerEngine().catch(console.error); 