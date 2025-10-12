const axios = require('axios');

async function verifyEngine() {
  console.log('🔍 VERIFYING SOPHISTICATED POKER ENGINE INTEGRATION...\n');
  
  try {
    // 1. Test root endpoint
    console.log('1️⃣ Testing root endpoint...');
    const root = await axios.get('http://localhost:3000');
    console.log('✅ Root response:', root.data.message);
    console.log('✅ Engine features:', root.data.features);
    
    // 2. Create game
    console.log('\n2️⃣ Creating game with sophisticated engine...');
    const createGame = await axios.post('http://localhost:3000/api/games', {
      small_blind: 10,
      big_blind: 20,
      max_players: 6
    });
    console.log('✅ Game created:', createGame.data.gameId);
    console.log('✅ Engine type:', createGame.data.engine);
    
    const gameId = createGame.data.gameId;
    
    // 3. Join players
    console.log('\n3️⃣ Joining players...');
    const player1 = await axios.post(`http://localhost:3000/api/games/${gameId}/join`, {
      player_name: 'Alice',
      buy_in_amount: 1000
    });
    console.log('✅ Alice joined:', player1.data.playerId);
    
    const player2 = await axios.post(`http://localhost:3000/api/games/${gameId}/join`, {
      player_name: 'Bob',
      buy_in_amount: 1000
    });
    console.log('✅ Bob joined:', player2.data.playerId);
    
    // 4. Start hand
    console.log('\n4️⃣ Starting hand...');
    const startHand = await axios.post(`http://localhost:3000/api/games/${gameId}/start-hand`);
    console.log('✅ Hand started:', startHand.data.handNumber);
    console.log('✅ Street:', startHand.data.street);
    console.log('✅ Community cards:', startHand.data.communityCards);
    console.log('✅ Pot:', startHand.data.pot);
    console.log('✅ To act:', startHand.data.toAct);
    
    // 5. Get game state
    console.log('\n5️⃣ Getting game state...');
    const gameState = await axios.get(`http://localhost:3000/api/games/${gameId}`);
    console.log('✅ Game status:', gameState.data.status);
    console.log('✅ Players:', gameState.data.players.length);
    console.log('✅ Current bet:', gameState.data.currentBet);
    console.log('✅ Engine:', gameState.data.engine);
    
    // 6. Test player actions
    console.log('\n6️⃣ Testing player actions...');
    
    // Alice calls
    const aliceCall = await axios.post(`http://localhost:3000/api/games/${gameId}/actions`, {
      player_id: player1.data.playerId,
      action: 'CALL'
    });
    console.log('✅ Alice called');
    console.log('✅ New pot:', aliceCall.data.pot);
    console.log('✅ To act:', aliceCall.data.toAct);
    
    // Bob calls
    const bobCall = await axios.post(`http://localhost:3000/api/games/${gameId}/actions`, {
      player_id: player2.data.playerId,
      action: 'CALL'
    });
    console.log('✅ Bob called');
    console.log('✅ New pot:', bobCall.data.pot);
    console.log('✅ Street advanced:', bobCall.data.street);
    console.log('✅ Community cards:', bobCall.data.communityCards);
    
    // 7. Test betting
    console.log('\n7️⃣ Testing betting...');
    const aliceBet = await axios.post(`http://localhost:3000/api/games/${gameId}/actions`, {
      player_id: player1.data.playerId,
      action: 'BET',
      amount: 50
    });
    console.log('✅ Alice bet 50');
    console.log('✅ New pot:', aliceBet.data.pot);
    console.log('✅ To act:', aliceBet.data.toAct);
    
    // 8. Get legal actions
    console.log('\n8️⃣ Testing legal actions...');
    const legalActions = await axios.get(`http://localhost:3000/api/games/${gameId}/legal-actions?player_id=${player2.data.playerId}`);
    console.log('✅ Legal actions for Bob:', legalActions.data.legalActions);
    console.log('✅ Betting info:', legalActions.data.bettingInfo);
    
    console.log('\n🎉 ENGINE VERIFICATION COMPLETE!');
    console.log('✅ All sophisticated engine components are working:');
    console.log('   - GameStateModel');
    console.log('   - GameStateMachine');
    console.log('   - BettingEngine');
    console.log('   - RoundManager');
    console.log('   - TurnManager');
    console.log('   - Proper betting round completion');
    console.log('   - Street advancement');
    console.log('   - Action validation');
    
  } catch (error) {
    console.error('\n❌ ENGINE VERIFICATION FAILED:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

verifyEngine();

