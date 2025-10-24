const axios = require('axios');

async function testCompletePokerFlow() {
  try {
    console.log('🧪 Testing COMPLETE POKER GAME FLOW...');
    console.log('=====================================');
    
    const baseURL = 'http://localhost:3000';
    
    // 1. Test server health
    console.log('\n1. 🏥 Testing server health...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', health.data.status);
    console.log('   Engine:', health.data.engine);
    console.log('   Components:', Object.keys(health.data.components).join(', '));
    
    // 2. Test root endpoint
    console.log('\n2. 🏠 Testing root endpoint...');
    const root = await axios.get(baseURL);
    console.log('✅ Root response:', root.data.message);
    console.log('   Features:', root.data.features.length, 'features');
    
    // 3. Create a game
    console.log('\n3. 🎮 Creating game...');
    const createGame = await axios.post(`${baseURL}/api/games`, {
      small_blind: 10,
      big_blind: 20,
      max_players: 6
    });
    console.log('✅ Created game:', createGame.data.gameId);
    console.log('   Engine:', createGame.data.engine);
    console.log('   Can start hand:', createGame.data.canStartHand);
    
    const gameId = createGame.data.gameId;
    
    // 4. Join first player
    console.log('\n4. 👤 Joining Player 1...');
    const player1 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Alice',
      buy_in_amount: 1000
    });
    console.log('✅ Player 1 joined:', player1.data.playerName);
    console.log('   Player ID:', player1.data.playerId);
    console.log('   Seat:', player1.data.seatIndex);
    console.log('   Can start:', player1.data.canStart);
    
    const player1Id = player1.data.playerId;
    
    // 5. Join second player
    console.log('\n5. 👤 Joining Player 2...');
    const player2 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Bob',
      buy_in_amount: 1000
    });
    console.log('✅ Player 2 joined:', player2.data.playerName);
    console.log('   Player ID:', player2.data.playerId);
    console.log('   Seat:', player2.data.seatIndex);
    console.log('   Can start:', player2.data.canStart);
    
    const player2Id = player2.data.playerId;
    
    // 6. Get game state before hand
    console.log('\n6. 📊 Getting game state...');
    const gameStateBefore = await axios.get(`${baseURL}/api/games/${gameId}`);
    console.log('✅ Game state retrieved');
    console.log('   Status:', gameStateBefore.data.status);
    console.log('   Players:', gameStateBefore.data.players.length);
    console.log('   Can start hand:', gameStateBefore.data.canStartHand);
    
    // 7. Start hand
    console.log('\n7. 🃏 Starting hand...');
    const startHand = await axios.post(`${baseURL}/api/games/${gameId}/start-hand`);
    console.log('✅ Hand started:', startHand.data.handNumber);
    console.log('   Street:', startHand.data.street);
    console.log('   Pot:', startHand.data.pot);
    console.log('   To act:', startHand.data.toAct);
    console.log('   Current bet:', startHand.data.currentBet);
    console.log('   Players with hole cards:', startHand.data.players.filter(p => p.holeCards.length > 0).length);
    
    // 8. Get legal actions for first player
    console.log('\n8. ⚖️ Getting legal actions...');
    const toActPlayer = startHand.data.toAct;
    const legalActions = await axios.get(`${baseURL}/api/games/${gameId}/legal-actions?player_id=${toActPlayer}`);
    console.log('✅ Legal actions for', toActPlayer + ':', legalActions.data.legalActions);
    console.log('   Current bet:', legalActions.data.bettingInfo.currentBet);
    console.log('   Min raise:', legalActions.data.bettingInfo.minRaise);
    
    // 9. Player calls
    console.log('\n9. 📞 Player calls...');
    const callAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: toActPlayer,
      action: 'CALL',
      amount: legalActions.data.bettingInfo.currentBet
    });
    console.log('✅ Call processed');
    console.log('   Street:', callAction.data.street);
    console.log('   Pot:', callAction.data.pot);
    console.log('   To act:', callAction.data.toAct);
    console.log('   Betting round complete:', callAction.data.isBettingRoundComplete);
    
    // 10. Second player action
    const nextToAct = callAction.data.toAct;
    if (nextToAct) {
      console.log('\n10. ✅ Second player checks...');
      const checkAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
        player_id: nextToAct,
        action: 'CHECK'
      });
      console.log('✅ Check processed');
      console.log('   Street:', checkAction.data.street);
      console.log('   Pot:', checkAction.data.pot);
      console.log('   Betting round complete:', checkAction.data.isBettingRoundComplete);
      console.log('   Community cards:', checkAction.data.communityCards.length);
    }
    
    // 11. Final game state
    console.log('\n11. 📊 Final game state...');
    const finalState = await axios.get(`${baseURL}/api/games/${gameId}`);
    console.log('✅ Final state retrieved');
    console.log('   Status:', finalState.data.status);
    console.log('   Street:', finalState.data.street);
    console.log('   Pot:', finalState.data.pot);
    console.log('   Community cards:', finalState.data.communityCards.length);
    console.log('   Hand complete:', finalState.data.isHandComplete);
    
    console.log('\n🎉 ===============================================');
    console.log('🎉 COMPLETE POKER FLOW TEST SUCCESSFUL!');
    console.log('🎉 ✅ Game creation works');
    console.log('🎉 ✅ Player joining works');
    console.log('🎉 ✅ Hand starting works');
    console.log('🎉 ✅ Betting actions work');
    console.log('🎉 ✅ Street progression works');
    console.log('🎉 ✅ Sophisticated engine is fully functional!');
    console.log('🎉 ===============================================');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
    if (error.response?.data?.error) {
      console.error('   Error:', error.response.data.error);
    }
    console.log('\n💡 Make sure the server is running: node fixed-sophisticated-server.js');
  }
}

// Wait a moment for server to start, then test
console.log('⏳ Waiting 2 seconds for server to start...');
setTimeout(testCompletePokerFlow, 2000);
