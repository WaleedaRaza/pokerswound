/**
 * SIMPLE WORKING HAND EVALUATOR
 * No TypeScript bullshit, just pure JavaScript that WORKS
 */

function evaluatePokerHand(holeCards, communityCards) {
  // Combine all 7 cards
  const allCards = [...holeCards, ...communityCards];
  
  // Parse cards: "Ah" -> { rank: 14, suit: 'h' }
  const cards = allCards.map(cardStr => {
    const rank = cardStr.charAt(0);
    const suit = cardStr.charAt(1);
    const rankValue = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    }[rank];
    return { rank: rankValue, suit, original: cardStr };
  });
  
  // Count ranks and suits
  const rankCounts = {};
  const suitCounts = {};
  
  cards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  
  // Get rank groups
  const quads = [];
  const trips = [];
  const pairs = [];
  
  Object.entries(rankCounts).forEach(([rank, count]) => {
    if (count === 4) quads.push(parseInt(rank));
    if (count === 3) trips.push(parseInt(rank));
    if (count === 2) pairs.push(parseInt(rank));
  });
  
  quads.sort((a, b) => b - a);
  trips.sort((a, b) => b - a);
  pairs.sort((a, b) => b - a);
  
  // Check for flush
  const flushSuit = Object.entries(suitCounts).find(([suit, count]) => count >= 5)?.[0];
  
  // Check for straight
  const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a, b) => b - a);
  let straightHigh = 0;
  
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
      straightHigh = uniqueRanks[i];
      break;
    }
  }
  
  // Check for A-2-3-4-5 straight (wheel)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && 
      uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    straightHigh = 5; // Ace-low straight
  }
  
  // Determine hand ranking (higher = better)
  let handRank = 0;
  let handName = '';
  const rankNames = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
  };
  
  // Royal Flush
  if (flushSuit && straightHigh === 14) {
    const flushCards = cards.filter(c => c.suit === flushSuit);
    const flushRanks = flushCards.map(c => c.rank);
    if ([10, 11, 12, 13, 14].every(r => flushRanks.includes(r))) {
      handRank = 9;
      handName = 'Royal Flush';
    }
  }
  
  // Straight Flush
  if (handRank === 0 && flushSuit && straightHigh > 0) {
    const flushCards = cards.filter(c => c.suit === flushSuit);
    const flushRanks = flushCards.map(c => c.rank).sort((a, b) => b - a);
    let sfHigh = 0;
    for (let i = 0; i <= flushRanks.length - 5; i++) {
      if (flushRanks[i] - flushRanks[i + 4] === 4) {
        sfHigh = flushRanks[i];
        break;
      }
    }
    if (sfHigh > 0) {
      handRank = 8;
      handName = `Straight Flush (${rankNames[sfHigh]}-high)`;
    }
  }
  
  // Four of a Kind
  if (handRank === 0 && quads.length > 0) {
    handRank = 7;
    handName = `Four of a Kind (${rankNames[quads[0]]}s)`;
  }
  
  // Full House
  if (handRank === 0 && trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const bestTrips = trips[0];
    const bestPair = trips.length > 1 ? trips[1] : pairs[0];
    handRank = 6;
    handName = `Full House (${rankNames[bestTrips]}s over ${rankNames[bestPair]}s)`;
  }
  
  // Flush
  let flushCards = [];
  if (handRank === 0 && flushSuit) {
    handRank = 5;
    flushCards = cards.filter(c => c.suit === flushSuit)
      .sort((a, b) => b.rank - a.rank).slice(0, 5);
    handName = `Flush (${rankNames[flushCards[0].rank]}-high)`;
  }
  
  // Straight
  if (handRank === 0 && straightHigh > 0) {
    handRank = 4;
    handName = `Straight (${rankNames[straightHigh]}-high)`;
  }
  
  // Calculate kickers (cards not part of the made hand)
  let kickers = [];
  
  // Three of a Kind
  if (handRank === 0 && trips.length > 0) {
    handRank = 3;
    handName = `Three of a Kind (${rankNames[trips[0]]}s)`;
    kickers = cards.filter(c => c.rank !== trips[0])
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 2)
      .map(c => c.rank);
  }
  
  // Two Pair
  if (handRank === 0 && pairs.length >= 2) {
    handRank = 2;
    handName = `Two Pair (${rankNames[pairs[0]]}s and ${rankNames[pairs[1]]}s)`;
    kickers = cards.filter(c => c.rank !== pairs[0] && c.rank !== pairs[1])
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 1)
      .map(c => c.rank);
  }
  
  // One Pair
  if (handRank === 0 && pairs.length === 1) {
    handRank = 1;
    handName = `Pair (${rankNames[pairs[0]]}s)`;
    kickers = cards.filter(c => c.rank !== pairs[0])
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3)
      .map(c => c.rank);
  }
  
  // High Card
  let highCards = [];
  if (handRank === 0) {
    highCards = cards.sort((a, b) => b.rank - a.rank).slice(0, 5);
    const highCard = highCards[0].rank;
    handRank = 0;
    handName = `High Card (${rankNames[highCard]})`;
  }
  
  return {
    rank: handRank,
    name: handName,
    quads,
    trips,
    pairs,
    straightHigh,
    flushSuit,
    flushCards: flushCards.map(c => c.rank), // Store ranks of best 5 flush cards
    highCards: highCards.map(c => c.rank), // Store ranks of best 5 high cards
    kickers // Kickers for pairs, two pairs, trips
  };
}

function compareHands(hand1, hand2) {
  // Compare primary rank
  if (hand1.rank !== hand2.rank) {
    return hand2.rank - hand1.rank; // Higher rank wins
  }
  
  // Same rank - compare kickers
  if (hand1.quads.length > 0 && hand2.quads.length > 0) {
    return hand2.quads[0] - hand1.quads[0];
  }
  
  // Full House: Compare trips, then pair
  if (hand1.trips.length > 0 && hand2.trips.length > 0) {
    const tripsDiff = hand2.trips[0] - hand1.trips[0];
    if (tripsDiff !== 0) return tripsDiff;
    if (hand1.pairs.length > 0 && hand2.pairs.length > 0) {
      return hand2.pairs[0] - hand1.pairs[0];
    }
  }
  
  // Pairs / Two Pairs / Trips: Compare primary cards, then kickers
  if (hand1.pairs.length > 0 && hand2.pairs.length > 0) {
    for (let i = 0; i < Math.max(hand1.pairs.length, hand2.pairs.length); i++) {
      const p1 = hand1.pairs[i] || 0;
      const p2 = hand2.pairs[i] || 0;
      if (p1 !== p2) return p2 - p1;
    }
    // If pairs are equal, compare kickers
    if (hand1.kickers && hand2.kickers) {
      for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
        const k1 = hand1.kickers[i] || 0;
        const k2 = hand2.kickers[i] || 0;
        if (k1 !== k2) return k2 - k1;
      }
    }
  }
  if (hand1.straightHigh && hand2.straightHigh) {
    return hand2.straightHigh - hand1.straightHigh;
  }
  
  // FLUSH COMPARISON: Compare all 5 cards in order (highest to lowest)
  if (hand1.flushCards && hand2.flushCards && hand1.flushCards.length > 0 && hand2.flushCards.length > 0) {
    for (let i = 0; i < 5; i++) {
      const c1 = hand1.flushCards[i] || 0;
      const c2 = hand2.flushCards[i] || 0;
      if (c1 !== c2) return c2 - c1; // Higher card wins
    }
  }
  
  // HIGH CARD COMPARISON: Compare all 5 cards in order (highest to lowest)
  if (hand1.highCards && hand2.highCards && hand1.highCards.length > 0 && hand2.highCards.length > 0) {
    for (let i = 0; i < 5; i++) {
      const c1 = hand1.highCards[i] || 0;
      const c2 = hand2.highCards[i] || 0;
      if (c1 !== c2) return c2 - c1; // Higher card wins
    }
  }
  
  return 0; // Tie
}

module.exports = {
  evaluatePokerHand,
  compareHands
};

