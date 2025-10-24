import { BettingEngine } from '../../src/core/engine/betting-engine';
import { ActionType, Street } from '../../src/types/common.types';
import { GameStateModel } from '../../src/core/models/game-state';
import { PlayerModel } from '../../src/core/models/player';
import { TableModel } from '../../src/core/models/table';
import type { UUID, Chips } from '../../src/types/common.types';

describe('BettingEngine', () => {
  let bettingEngine: BettingEngine;
  let gameState: GameStateModel;
  let player1: PlayerModel;
  let player2: PlayerModel;

  beforeEach(() => {
    bettingEngine = new BettingEngine();
    
    // Create test players
    player1 = new PlayerModel({
      uuid: 'player1' as UUID,
      name: 'Player 1',
      stack: 1000 as Chips
    });
    
    player2 = new PlayerModel({
      uuid: 'player2' as UUID,
      name: 'Player 2',
      stack: 1000 as Chips
    });

    // Create game state
    const table = new TableModel();
    gameState = new GameStateModel({ id: 'game1', table, street: Street.Preflop });
    gameState.players.push(player1);
    gameState.players.push(player2);
  });

  describe('Action Validation', () => {
    test('should validate fold action', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Fold
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate check when no bet', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Check
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject check when facing bet', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Check
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot check when facing a bet');
    });

    test('should validate call with correct amount', () => {
      // Player 2 has bet 100, player 1 needs to call 100
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Call,
        amount: 100 as Chips
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject call with wrong amount', () => {
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Call,
        amount: 50 as Chips // Should be 100
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Call amount must be 100');
    });

    test('should auto-convert call to all-in when insufficient stack', () => {
      // Set up scenario: Player 2 bets 100, Player 1 only has 50 chips left
      const shortStackPlayer = new PlayerModel({
        uuid: 'player1' as UUID,
        name: 'Player 1',
        stack: 50 as Chips
      });
      gameState.players[0] = shortStackPlayer;
      
      // Player 2 bets 100
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Call,
        amount: 100 as Chips
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
      expect(result.adjustedAmount).toBe(50 as Chips);
      expect(result.isAllIn).toBe(true);
    });

    test('should validate bet with minimum amount', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Bet,
        amount: 50 as Chips
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject bet below minimum', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Bet,
        amount: 25 as Chips
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Bet must be at least 50');
    });

    test('should validate raise with sufficient amount', () => {
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Raise,
        amount: 200 as Chips // Call 100 + raise 100
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 100 as Chips);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject raise below minimum', () => {
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Raise,
        amount: 150 as Chips // Call 100 + raise 50, but min raise is 100
      };

      const result = bettingEngine.validateAction(action, gameState, 100 as Chips, 100 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Raise must be at least 100');
    });

    test('should validate all-in', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.AllIn
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(true);
      expect(result.adjustedAmount).toBe(1000 as Chips);
    });

    test('should reject action from folded player', () => {
      player1.fold();
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Check
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Player has already folded');
    });

    test('should reject action from all-in player', () => {
      player1.allIn();
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Check
      };

      const result = bettingEngine.validateAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Player is already all-in');
    });
  });

  describe('Action Processing', () => {
    test('should process fold action', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Fold
      };

      const result = bettingEngine.processAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(player1.hasFolded).toBe(true);
      expect(result.potContribution).toBe(0 as Chips);
    });

    test('should process bet action', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Bet,
        amount: 100 as Chips
      };

      const result = bettingEngine.processAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(player1.stack).toBe(900 as Chips);
      expect(player1.betThisStreet).toBe(100 as Chips);
      expect(result.newCurrentBet).toBe(100 as Chips);
      expect(result.newMinRaise).toBe(100 as Chips);
      expect(result.lastAggressor).toBe('player1' as UUID);
      expect(result.potContribution).toBe(100 as Chips);
    });

    test('should process call action', () => {
      // Player 2 bets first
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Call,
        amount: 100 as Chips
      };

      const result = bettingEngine.processAction(action, gameState, 100 as Chips, 50 as Chips);
      
      expect(player1.stack).toBe(900 as Chips);
      expect(player1.betThisStreet).toBe(100 as Chips);
      expect(result.potContribution).toBe(100 as Chips);
    });

    test('should process raise action', () => {
      // Player 2 bets first
      player2.collectBet(100 as Chips);
      
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.Raise,
        amount: 200 as Chips
      };

      const result = bettingEngine.processAction(action, gameState, 100 as Chips, 100 as Chips);
      
      expect(player1.stack).toBe(800 as Chips);
      expect(player1.betThisStreet).toBe(200 as Chips);
      expect(result.newCurrentBet).toBe(200 as Chips);
      expect(result.newMinRaise).toBe(100 as Chips); // Size of the raise
      expect(result.lastAggressor).toBe('player1' as UUID);
      expect(result.potContribution).toBe(200 as Chips);
    });

    test('should process all-in action', () => {
      const action = {
        playerUuid: 'player1' as UUID,
        actionType: ActionType.AllIn
      };

      const result = bettingEngine.processAction(action, gameState, 0 as Chips, 50 as Chips);
      
      expect(player1.stack).toBe(0 as Chips);
      expect(player1.isAllIn).toBe(true);
      expect(result.newCurrentBet).toBe(1000 as Chips);
      expect(result.lastAggressor).toBe('player1' as UUID);
      expect(result.potContribution).toBe(1000 as Chips);
    });
  });

  describe('Blind Posting', () => {
    test('should post blinds correctly', () => {
      const result = bettingEngine.postBlinds(
        gameState,
        'player1' as UUID,
        'player2' as UUID,
        25 as Chips,
        50 as Chips
      );

      expect(player1.stack).toBe(975 as Chips);
      expect(player1.betThisStreet).toBe(25 as Chips);
      expect(player2.stack).toBe(950 as Chips);
      expect(player2.betThisStreet).toBe(50 as Chips);
      expect(result.sbContribution).toBe(25 as Chips);
      expect(result.bbContribution).toBe(50 as Chips);
    });

    test('should handle short stack blinds', () => {
      // Player 1 only has 10 chips
      const shortStackPlayer = new PlayerModel({
        uuid: 'player1' as UUID,
        name: 'Player 1',
        stack: 10 as Chips
      });
      
      // Replace player1 in the game state
      gameState.players[0] = shortStackPlayer;

      const result = bettingEngine.postBlinds(
        gameState,
        'player1' as UUID,
        'player2' as UUID,
        25 as Chips,
        50 as Chips
      );

      expect(shortStackPlayer.stack).toBe(0 as Chips);
      expect(shortStackPlayer.betThisStreet).toBe(10 as Chips);
      expect(result.sbContribution).toBe(10 as Chips);
    });
  });

  describe('Legal Actions', () => {
    test('should return correct legal actions when no bet', () => {
      const actions = bettingEngine.getLegalActions(
        'player1' as UUID,
        gameState,
        0 as Chips,
        50 as Chips
      );

      expect(actions).toContain(ActionType.Fold);
      expect(actions).toContain(ActionType.Check);
      expect(actions).toContain(ActionType.Bet);
      expect(actions).toContain(ActionType.AllIn);
      expect(actions).not.toContain(ActionType.Call);
      expect(actions).not.toContain(ActionType.Raise);
    });

    test('should return correct legal actions when facing bet', () => {
      player2.collectBet(100 as Chips);
      
      const actions = bettingEngine.getLegalActions(
        'player1' as UUID,
        gameState,
        100 as Chips,
        100 as Chips
      );

      expect(actions).toContain(ActionType.Fold);
      expect(actions).toContain(ActionType.Call);
      expect(actions).toContain(ActionType.Raise);
      expect(actions).toContain(ActionType.AllIn);
      expect(actions).not.toContain(ActionType.Check);
      expect(actions).not.toContain(ActionType.Bet);
    });

    test('should return no actions for folded player', () => {
      player1.fold();
      
      const actions = bettingEngine.getLegalActions(
        'player1' as UUID,
        gameState,
        0 as Chips,
        50 as Chips
      );

      expect(actions).toEqual([]);
    });

    test('should return no actions for all-in player', () => {
      player1.allIn();
      
      const actions = bettingEngine.getLegalActions(
        'player1' as UUID,
        gameState,
        0 as Chips,
        50 as Chips
      );

      expect(actions).toEqual([]);
    });
  });

  describe('Betting Round Completion', () => {
    test('should detect complete betting round', () => {
      // Both players check
      const isComplete = bettingEngine.isBettingRoundComplete(
        gameState,
        0 as Chips
      );

      expect(isComplete).toBe(true);
    });

    test('should detect incomplete betting round', () => {
      // Player 2 bets, player 1 hasn't acted
      player2.collectBet(100 as Chips);
      
      const isComplete = bettingEngine.isBettingRoundComplete(
        gameState,
        100 as Chips
      );

      expect(isComplete).toBe(false);
    });

    test('should detect complete round with only one player left', () => {
      player2.fold();
      
      const isComplete = bettingEngine.isBettingRoundComplete(
        gameState,
        0 as Chips
      );

      expect(isComplete).toBe(true);
    });
  });

  describe('Min Raise Calculation', () => {
    test('should calculate min raise as big blind when no previous raise', () => {
      const minRaise = bettingEngine.calculateMinRaise(
        gameState,
        50 as Chips, // Current bet (big blind)
        0 as Chips,  // No previous raise
        50 as Chips  // Big blind
      );

      expect(minRaise).toBe(50 as Chips);
    });

    test('should calculate min raise based on previous raise size', () => {
      const minRaise = bettingEngine.calculateMinRaise(
        gameState,
        200 as Chips, // Current bet
        150 as Chips, // Previous raise was 150
        50 as Chips   // Big blind
      );

      expect(minRaise).toBe(150 as Chips);
    });

    test('should use big blind as minimum when first bet', () => {
      const minRaise = bettingEngine.calculateMinRaise(
        gameState,
        0 as Chips,  // No current bet
        0 as Chips,  // No previous raise
        50 as Chips  // Big blind
      );

      expect(minRaise).toBe(50 as Chips);
    });
  });
});