export interface Pot {
  id: string;
  amount: number;
  eligiblePlayers: string[]; // Player IDs who can win this pot
  type: 'main' | 'side';
  allInPlayers: string[]; // Players who went all-in to create this pot
}

export interface PotCalculation {
  mainPot: Pot;
  sidePots: Pot[];
  totalAmount: number;
}

export interface PotDistribution {
  playerId: string;
  amount: number;
  potId: string;
  reason: 'winner' | 'split' | 'side_pot_winner';
}

export interface BettingRound {
  round: 'preflop' | 'flop' | 'turn' | 'river';
  currentBet: number;
  minRaise: number;
  playerBets: Record<string, number>; // playerId -> bet amount
  allInPlayers: string[];
} 