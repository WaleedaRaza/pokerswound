const axios = require('axios');

async function testEngine() {
  try {
    console.log('🧪 Testing Sophisticated Poker Engine...');
    
    // Test root endpoint
    const root = await axios.get('http://localhost:3000');
    console.log('✅ Root endpoint:', root.data);
    
    // Create a game
    const createGame = await axios.post('http://localhost:3000/api/games', {
      small_blind: 10,
      big_blind: 20,
      max_players: 6
    });
    console.log('✅ Created game:', createGame.data);
    
    const gameId = createGame.data.gameId;
    
    // Join players
    const player1 = await axios.post(`http://localhost:3000/api/games/${gameId}/join`, {
      player_name: 'Player 1',
      buy_in_amount: 1000
    });
    console.log('✅ Player 1 joined:', player1.data);
    
    const player2 = await axios.post(`http://localhost:3000/api/games/${gameId}/join`, {
      player_name: 'Player 2', 
      buy_in_amount: 1000
    });
    console.log('✅ Player 2 joined:', player2.data);
    
    // Start hand
    const startHand = await axios.post(`http://localhost:3000/api/games/${gameId}/start-hand`);
    console.log('✅ Started hand:', startHand.data);
    
    // Get game state
    const gameState = await axios.get(`http://localhost:3000/api/games/${gameId}`);
    console.log('✅ Game state:', gameState.data);
    
    console.log('🎉 ENGINE TEST COMPLETE - SOPHISTICATED ENGINE IS WORKING!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEngine();

