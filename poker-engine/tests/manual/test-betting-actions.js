const axios = require('axios');

async function testBettingActions() {
  try {
    console.log('🎰 Testing BETTING ACTIONS (Raise, Call, Fold)...');
    console.log('=================================================');
    
    const baseURL = 'http://localhost:3000';
    
    // 1. Create game
    const createGame = await axios.post(`${baseURL}/api/games`, {
      small_blind: 1,
      big_blind: 2,
      max_players: 6
    });
    const gameId = createGame.data.gameId;
    console.log(`✅ Created game: ${gameId}`);
    
    // 2. Join two players
    const player1 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Alice',
      buy_in_amount: 100
    });
    const player1Id = player1.data.playerId;
    console.log(`✅ Alice joined (${player1Id})`);
    
    const player2 = await axios.post(`${baseURL}/api/games/${gameId}/join`, {
      player_name: 'Bob', 
      buy_in_amount: 100
    });
    const player2Id = player2.data.playerId;
    console.log(`✅ Bob joined (${player2Id})`);
    
    // 3. Start hand
    const startHand = await axios.post(`${baseURL}/api/games/${gameId}/start-hand`);
    console.log(`✅ Hand started`);
    console.log(`   Pot: $${startHand.data.pot}`);
    console.log(`   Current bet: $${startHand.data.currentBet}`);
    console.log(`   To act: ${startHand.data.toAct}`);
    
    let currentToAct = startHand.data.toAct;
    
    // 4. TEST RAISE
    console.log('\\n🔥 TESTING RAISE ACTION:');
    console.log(`   Player to act: ${currentToAct === player1Id ? 'Alice' : 'Bob'}`);
    console.log(`   Current bet: $${startHand.data.currentBet}`);
    
    try {
      const raiseAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
        player_id: currentToAct,
        action: 'RAISE',
        amount: 5
      });
      console.log(`✅ RAISE successful!`);
      console.log(`   New pot: $${raiseAction.data.pot}`);
      console.log(`   New current bet: $${raiseAction.data.currentBet}`);
      console.log(`   Next to act: ${raiseAction.data.toAct}`);
      
      currentToAct = raiseAction.data.toAct;
      
      // 5. TEST CALL
      console.log('\\n📞 TESTING CALL ACTION:');
      const callAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
        player_id: currentToAct,
        action: 'CALL'
      });
      console.log(`✅ CALL successful!`);
      console.log(`   Final pot: $${callAction.data.pot}`);
      console.log(`   Street: ${callAction.data.street}`);
      
    } catch (raiseError) {
      console.error(`❌ RAISE failed:`, raiseError.response?.data || raiseError.message);
      
      // Try BET instead
      console.log('\\n🎲 TESTING BET ACTION (since raise failed):');
      try {
        const betAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
          player_id: currentToAct,
          action: 'BET',
          amount: 5
        });
        console.log(`✅ BET successful!`);
        console.log(`   New pot: $${betAction.data.pot}`);
        console.log(`   New current bet: $${betAction.data.currentBet}`);
        
        currentToAct = betAction.data.toAct;
        
        // Test fold
        console.log('\\n🗂️ TESTING FOLD ACTION:');
        const foldAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
          player_id: currentToAct,
          action: 'FOLD'
        });
        console.log(`✅ FOLD successful!`);
        console.log(`   Hand complete: ${foldAction.data.isHandComplete}`);
        
      } catch (betError) {
        console.error(`❌ BET also failed:`, betError.response?.data || betError.message);
        
        // Try CALL to see current state
        console.log('\\n📞 TESTING CALL ACTION (fallback):');
        try {
          const callAction = await axios.post(`${baseURL}/api/games/${gameId}/actions`, {
            player_id: currentToAct,
            action: 'CALL'
          });
          console.log(`✅ CALL successful!`);
          console.log(`   Pot: $${callAction.data.pot}`);
        } catch (callError) {
          console.error(`❌ CALL also failed:`, callError.response?.data || callError.message);
        }
      }
    }
    
    // 6. Get legal actions for both players
    console.log('\\n⚖️ LEGAL ACTIONS TEST:');
    for (const [name, playerId] of [['Alice', player1Id], ['Bob', player2Id]]) {
      try {
        const legalActions = await axios.get(`${baseURL}/api/games/${gameId}/legal-actions?player_id=${playerId}`);
        console.log(`   ${name}: ${legalActions.data.legalActions.join(', ')}`);
        console.log(`   Current bet: $${legalActions.data.bettingInfo.currentBet}`);
        console.log(`   Min raise: $${legalActions.data.bettingInfo.minRaise}`);
      } catch (error) {
        console.log(`   ${name}: Error getting legal actions - ${error.response?.data?.error || error.message}`);
      }
    }
    
    // 7. Final game state
    const finalState = await axios.get(`${baseURL}/api/games/${gameId}`);
    console.log('\\n📊 FINAL GAME STATE:');
    console.log(`   Status: ${finalState.data.status}`);
    console.log(`   Street: ${finalState.data.street}`);
    console.log(`   Pot: $${finalState.data.pot}`);
    console.log(`   Current bet: $${finalState.data.currentBet}`);
    
    finalState.data.players.forEach(player => {
      console.log(`   ${player.name}: Stack $${player.stack}, Bet $${player.betThisStreet}, Status: ${player.hasFolded ? 'FOLDED' : 'ACTIVE'}`);
    });
    
    console.log('\\n🎉 ===============================================');
    console.log('🎉 BETTING ACTIONS TEST COMPLETE!');
    console.log('🎉 ===============================================');
    
  } catch (error) {
    console.error('\\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
  }
}

// Run the test
console.log('⏳ Waiting 1 second for server...');
setTimeout(testBettingActions, 1000);
