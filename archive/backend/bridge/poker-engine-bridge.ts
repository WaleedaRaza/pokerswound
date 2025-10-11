import { spawn } from 'child_process';
import path from 'path';
import type { Card } from '../core/card/card';
import type { Hole2 } from '../types/card.types';

export interface HandEvaluationResult {
  success: boolean;
  error?: string;
  hand_info?: {
    hand: {
      strength: string;
      high: number;
      low: number;
    };
    hole: {
      high: number;
      low: number;
    };
  };
  score?: number;
  strength?: string;
}

export interface HandComparisonResult {
  success: boolean;
  error?: string;
  winner?: number; // 0 = tie, 1 = hand1 wins, 2 = hand2 wins
  hand1?: HandEvaluationResult;
  hand2?: HandEvaluationResult;
}

export interface RangeParseResult {
  success: boolean;
  error?: string;
  range?: string;
  combos?: string[];
  count?: number;
}

export interface GameResult {
  success: boolean;
  error?: string;
  result?: any;
}

/**
 * Bridge to existing Python poker engines
 * Uses PyPokerEngine and poker-master for heavy lifting
 */
export class PokerEngineBridge {
  private bridgeScript: string;

  constructor() {
    this.bridgeScript = path.join(__dirname, 'poker_bridge.py');
  }

  /**
   * Convert our Card objects to Python bridge format
   */
  private cardToBridgeFormat(card: Card): { suit: number; rank: number } {
    // Convert suit enum to number (1-4)
    const suitMap: Record<string, number> = {
      'C': 1, 'D': 2, 'H': 3, 'S': 4
    };
    
    return {
      suit: suitMap[card.suit] || 1,
      rank: card.rank
    };
  }

  /**
   * Execute Python bridge command
   */
  private async executeBridgeCommand(command: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [this.bridgeScript, command];
      if (data) {
        args.push(JSON.stringify(data));
      }

      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python bridge failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse bridge response: ${stdout}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  /**
   * Evaluate hand strength using PyPokerEngine's fast evaluator
   */
  async evaluateHand(hole: Hole2, community: Card[]): Promise<HandEvaluationResult> {
    try {
      const holeCards = hole.map(card => this.cardToBridgeFormat(card));
      const communityCards = community.map(card => this.cardToBridgeFormat(card));

      const result = await this.executeBridgeCommand('evaluate_hand', {
        hole: holeCards,
        community: communityCards
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compare two hands and determine winner
   */
  async compareHands(
    hand1: Hole2, 
    hand2: Hole2, 
    community: Card[]
  ): Promise<HandComparisonResult> {
    try {
      const hand1Cards = hand1.map(card => this.cardToBridgeFormat(card));
      const hand2Cards = hand2.map(card => this.cardToBridgeFormat(card));
      const communityCards = community.map(card => this.cardToBridgeFormat(card));

      const result = await this.executeBridgeCommand('compare_hands', {
        hand1: hand1Cards,
        hand2: hand2Cards,
        community: communityCards
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse hand range using poker-master
   */
  async parseHandRange(rangeString: string): Promise<RangeParseResult> {
    try {
      const result = await this.executeBridgeCommand('parse_range', rangeString);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a test game using PyPokerEngine
   */
  async runTestGame(): Promise<GameResult> {
    try {
      const result = await this.executeBridgeCommand('test_game');
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick test to verify bridge is working
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.runTestGame();
      return result.success;
    } catch (error) {
      console.error('Bridge connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const pokerBridge = new PokerEngineBridge();