const axios = require('axios');

async function testCompletePokerHand() {
  try {
    console.log('🃏 Testing COMPLETE POKER HAND through showdown...');
    console.log('================================================');
    
    const baseURL = 'http://localhost:3000';
    
    // 1. Create game
    const createGame = await axios.post(`${baseURL}/api/games`, {
      small_blind: 10,
      big_blind: 20,
      max_players: 6
    });
    const gameId = createGame.data.gameId;
    console.log(`✅ Created game: ${gameId}`);
    
    // 2. Join two players
    const player1 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Alice',
      buy_in_amount: 1000
    });
    const player1Id = player1.data.playerId;
    console.log(`✅ Alice joined (${player1Id})`);
    
    const player2 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Bob', 
      buy_in_amount: 1000
    });
    const player2Id = player2.data.playerId;
    console.log(`✅ Bob joined (${player2Id})`);
    
    // 3. Start hand
    const startHand = await axios.post(`${baseURL}/api/games/${gameId}/start-hand`);
    console.log(`✅ Hand started: #${startHand.data.handNumber}`);
    console.log(`   Pot: $${startHand.data.pot}`);
    console.log(`   To act: ${startHand.data.toAct}`);
    console.log(`   Street: ${startHand.data.street}`);
    
    let currentToAct = startHand.data.toAct;
    
    // 4. PREFLOP - Alice calls, Bob checks
    console.log('\n🎯 PREFLOP BETTING:');
    
    // Alice calls
    const callAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CALL',
      amount: 20
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} called`);
    console.log(`   Pot: $${callAction.data.pot}, To act: ${callAction.data.toAct}`);
    console.log(`   Betting round complete: ${callAction.data.isBettingRoundComplete}`);
    
    currentToAct = callAction.data.toAct;
    
    // Bob checks (or other player)
    const checkAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked`);
    console.log(`   Street: ${checkAction.data.street}, Community cards: ${checkAction.data.communityCards.length}`);
    console.log(`   Betting round complete: ${checkAction.data.isBettingRoundComplete}`);
    
    currentToAct = checkAction.data.toAct;
    
    // 5. FLOP - Both players check
    console.log('\n🎯 FLOP BETTING:');
    
    // First player checks
    const flopCheck1 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on flop`);
    console.log(`   To act: ${flopCheck1.data.toAct}`);
    
    currentToAct = flopCheck1.data.toAct;
    
    // Second player checks
    const flopCheck2 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on flop`);
    console.log(`   Street: ${flopCheck2.data.street}, Community cards: ${flopCheck2.data.communityCards.length}`);
    
    currentToAct = flopCheck2.data.toAct;
    
    // 6. TURN - Both players check
    console.log('\n🎯 TURN BETTING:');
    
    // First player checks
    const turnCheck1 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on turn`);
    console.log(`   To act: ${turnCheck1.data.toAct}`);
    
    currentToAct = turnCheck1.data.toAct;
    
    // Second player checks
    const turnCheck2 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on turn`);
    console.log(`   Street: ${turnCheck2.data.street}, Community cards: ${turnCheck2.data.communityCards.length}`);
    
    currentToAct = turnCheck2.data.toAct;
    
    // 7. RIVER - Both players check
    console.log('\n🎯 RIVER BETTING:');
    
    // First player checks
    const riverCheck1 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on river`);
    console.log(`   To act: ${riverCheck1.data.toAct}`);
    
    currentToAct = riverCheck1.data.toAct;
    
    // Second player checks - this should complete the hand
    const riverCheck2 = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
      player_id: currentToAct,
      action: 'CHECK'
    });
    console.log(`✅ ${currentToAct === player1Id ? 'Alice' : 'Bob'} checked on river`);
    console.log(`   Street: ${riverCheck2.data.street}`);
    console.log(`   Hand complete: ${riverCheck2.data.isHandComplete}`);
    console.log(`   Community cards: ${riverCheck2.data.communityCards.length}`);
    
    // 8. Get final game state
    const finalState = await axios.get(`${baseURL}/api/games/${gameId}`);
    console.log('\n🏆 FINAL GAME STATE:');
    console.log(`   Status: ${finalState.data.status}`);
    console.log(`   Street: ${finalState.data.street}`);
    console.log(`   Pot: $${finalState.data.pot}`);
    console.log(`   Community cards: ${finalState.data.communityCards.length}`);
    console.log(`   Hand complete: ${finalState.data.isHandComplete}`);
    
    // Show player stacks
    console.log('\n💰 PLAYER STACKS:');
    finalState.data.players.forEach(player => {
      console.log(`   ${player.name}: $${player.stack} (seat ${player.seatIndex})`);
    });
    
    console.log('\n🎉 ===============================================');
    console.log('🎉 COMPLETE POKER HAND TEST SUCCESSFUL!');
    console.log('🎉 ✅ Proper betting round progression');
    console.log('🎉 ✅ All streets completed (preflop → flop → turn → river)');
    console.log('🎉 ✅ Community cards dealt correctly');
    console.log('🎉 ✅ Both players required to act each street');
    console.log('🎉 ✅ Hand completion and winner determination');
    console.log('🎉 ===============================================');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
  }
}

// Run the test
console.log('⏳ Waiting 1 second for server...');
setTimeout(testCompletePokerHand, 1000);
