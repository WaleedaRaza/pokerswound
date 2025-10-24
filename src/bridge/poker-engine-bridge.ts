/**
 * Poker Engine Bridge (Stub/Placeholder)
 * 
 * This provides minimal stubs for the external poker library.
 * Replace with actual implementation when needed.
 */

export const pokerBridge = {
  evaluateHand: (hand: readonly any[] | string[], boardCards?: readonly any[] | any[]): any => {
    return {
      success: true,
      strength: 'HIGH_CARD',
      score: 0,
      hand_info: {
        hand: {
          high: 0,
          low: 0
        }
      },
      description: 'High Card'
    };
  },
  
  compareHands: (hand1: any, hand2: any, community: any): any => {
    return {
      success: true,
      winner: 0, // 0 = tie, 1 = hand1 wins, -1 = hand2 wins
      hand1: {
        strength: 'HIGH_CARD',
        score: 0,
        hand_info: {
          hand: {
            high: 0,
            low: 0
          }
        }
      },
      hand2: {
        strength: 'HIGH_CARD',
        score: 0,
        hand_info: {
          hand: {
            high: 0,
            low: 0
          }
        }
      }
    };
  },
  
  runTestGame: (options?: any): any => {
    return {
      success: true,
      result: {}
    };
  },
  
  parseHandRange: (range: string): any => {
    return [];
  }
};

