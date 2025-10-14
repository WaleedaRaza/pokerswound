import type { UUID, Chips } from '../../types/common.types';
import { ActionType, Street } from '../../types/common.types';
// import type { PlayerModel } from '../models/player';
import type { GameStateModel } from '../models/game-state';

export interface BettingAction {
  playerUuid: UUID;
  actionType: ActionType;
  amount?: Chips;
  isAllIn?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  adjustedAmount?: Chips; // For cases where we auto-adjust (e.g., all-in)
  isAllIn?: boolean;
}

export interface BettingRound {
  street: Street;
  actions: BettingAction[];
  isComplete: boolean;
  currentBet: Chips;
  minRaise: Chips;
  lastRaiseAmount: Chips;
  lastAggressor?: UUID;
}

export class BettingEngine {
  // private static readonly MIN_BET_MULTIPLIER = 2; // Min raise must be 2x the big blind
  
  /**
   * Validates if a player action is legal
   */
  public validateAction(
    action: BettingAction,
    gameState: GameStateModel,
    currentBet: Chips,
    minRaise: Chips
  ): ValidationResult {
    const player = gameState.getPlayer(action.playerUuid);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    if (player.hasFolded) {
      return { isValid: false, error: 'Player has already folded' };
    }

    if (player.isAllIn) {
      return { isValid: false, error: 'Player is already all-in' };
    }

    const playerStack = player.stack as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;
    const currentBetNum = currentBet as unknown as number;
    const actionAmount = (action.amount as unknown as number) || 0;

    switch (action.actionType) {
      case ActionType.Fold:
        return { isValid: true };

      case ActionType.Check:
        if (currentBetNum > playerBetThisStreet) {
          return { isValid: false, error: 'Cannot check when facing a bet' };
        }
        return { isValid: true };

      case ActionType.Call:
        const callAmount = currentBetNum - playerBetThisStreet;
        if (callAmount <= 0) {
          return { isValid: false, error: 'No bet to call' };
        }
        if (callAmount > playerStack) {
          // Auto-convert to all-in
          return { 
            isValid: true, 
            adjustedAmount: playerStack as Chips,
            isAllIn: true 
          };
        }
        if (actionAmount !== callAmount && actionAmount !== playerStack) {
          return { 
            isValid: false, 
            error: `Call amount must be ${callAmount}, got ${actionAmount}` 
          };
        }
        // If player is calling with their entire stack but it's less than the call amount
        if (actionAmount === playerStack && actionAmount < callAmount) {
          return {
            isValid: true,
            adjustedAmount: playerStack as Chips,
            isAllIn: true
          };
        }
        return { isValid: true };

      case ActionType.Bet:
        if (currentBetNum > 0) {
          return { isValid: false, error: 'Cannot bet when there is already a bet' };
        }
        return this.validateBetAmount(actionAmount, playerStack, minRaise);

      case ActionType.Raise:
        if (currentBetNum === 0) {
          return { isValid: false, error: 'Cannot raise when there is no bet' };
        }
        const totalRaiseAmount = actionAmount;
        const callPortion = currentBetNum - playerBetThisStreet;
        const raisePortion = totalRaiseAmount - callPortion;
        
        if (raisePortion < (minRaise as unknown as number)) {
          return { 
            isValid: false, 
            error: `Raise must be at least ${minRaise}, raise portion is ${raisePortion}` 
          };
        }
        
        return this.validateBetAmount(totalRaiseAmount, playerStack, minRaise);

      case ActionType.AllIn:
        if (playerStack <= 0) {
          return { isValid: false, error: 'Player has no chips to go all-in' };
        }
        return { 
          isValid: true, 
          adjustedAmount: playerStack as Chips,
          isAllIn: true 
        };

      case ActionType.SmallBlind:
      case ActionType.BigBlind:
        // Blinds are posted automatically, validation happens elsewhere
        return { isValid: true };

      default:
        return { isValid: false, error: `Unknown action type: ${action.actionType}` };
    }
  }

  /**
   * Calculates the minimum raise amount for current betting round
   */
  public calculateMinRaise(
    _gameState: GameStateModel,
    currentBet: Chips,
    lastRaiseAmount: Chips,
    bigBlind: Chips
  ): Chips {
    const currentBetNum = currentBet as unknown as number;
    const lastRaiseNum = lastRaiseAmount as unknown as number;
    const bigBlindNum = bigBlind as unknown as number;

    if (currentBetNum === 0) {
      // First bet of the round - minimum is big blind
      return bigBlind;
    }

    // ✅ FIX: Minimum raise is ALWAYS big blind (house rules)
    // Players can raise any amount above current bet, as long as it's >= big blind increment
    return bigBlind;
  }

  /**
   * Processes a validated action and updates game state
   */
  public processAction(
    action: BettingAction,
    gameState: GameStateModel,
    currentBet: Chips,
    minRaise: Chips
  ): {
    newCurrentBet: Chips;
    newMinRaise: Chips;
    lastAggressor?: UUID;
    potContribution: Chips;
  } {
    const validation = this.validateAction(action, gameState, currentBet, minRaise);
    if (!validation.isValid) {
      throw new Error(`Invalid action: ${validation.error}`);
    }

    const player = gameState.getPlayer(action.playerUuid);
    if (!player) {
      throw new Error('Player not found');
    }

    const actionAmount = validation.adjustedAmount || action.amount || (0 as Chips);
    const actionAmountNum = actionAmount as unknown as number;
    const currentBetNum = currentBet as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;

    let newCurrentBet = currentBet;
    let newMinRaise = minRaise;
    let lastAggressor: UUID | undefined;
    let potContribution = 0 as Chips;

    switch (action.actionType) {
      case ActionType.Fold:
        player.fold();
        break;

      case ActionType.Check:
        // No chips moved, no state change needed
        break;

      case ActionType.Call:
        const callAmount = Math.min(actionAmountNum, currentBetNum - playerBetThisStreet);
        player.collectBet(callAmount as Chips);
        potContribution = callAmount as Chips;
        
        if (validation.isAllIn) {
          player.allIn();
        }
        break;

      case ActionType.Bet:
        player.collectBet(actionAmount);
        newCurrentBet = (playerBetThisStreet + actionAmountNum) as Chips;
        newMinRaise = actionAmount; // Next raise must be at least this amount
        lastAggressor = action.playerUuid;
        potContribution = actionAmount;
        
        if (validation.isAllIn) {
          player.allIn();
        }
        break;

      case ActionType.Raise:
        player.collectBet(actionAmount);
        const newTotalBet = playerBetThisStreet + actionAmountNum;
        const raiseAmount = newTotalBet - currentBetNum;
        
        newCurrentBet = newTotalBet as Chips;
        newMinRaise = raiseAmount as Chips;
        lastAggressor = action.playerUuid;
        potContribution = actionAmount;
        
        if (validation.isAllIn) {
          player.allIn();
        }
        break;

      case ActionType.AllIn:
        player.allIn();
        const allInAmount = player.betThisStreet as unknown as number;
        
        if (allInAmount > currentBetNum) {
          // All-in is a raise
          newCurrentBet = allInAmount as Chips;
          newMinRaise = (allInAmount - currentBetNum) as Chips;
          lastAggressor = action.playerUuid;
        }
        
        potContribution = actionAmount;
        break;

      case ActionType.SmallBlind:
      case ActionType.BigBlind:
        player.collectBet(actionAmount);
        potContribution = actionAmount;
        
        if (action.actionType === ActionType.BigBlind) {
          newCurrentBet = actionAmount;
          newMinRaise = actionAmount; // Min raise is big blind amount
        }
        break;
    }

    return {
      newCurrentBet,
      newMinRaise,
      ...(lastAggressor && { lastAggressor }),
      potContribution,
    };
  }

  /**
   * Posts blinds automatically at the start of a hand
   */
  public postBlinds(
    gameState: GameStateModel,
    smallBlindPlayer: UUID,
    bigBlindPlayer: UUID,
    smallBlind: Chips,
    bigBlind: Chips
  ): { sbContribution: Chips; bbContribution: Chips } {
    const sbPlayer = gameState.getPlayer(smallBlindPlayer);
    const bbPlayer = gameState.getPlayer(bigBlindPlayer);

    if (!sbPlayer || !bbPlayer) {
      throw new Error('Blind players not found');
    }

    // Post small blind
    const sbAmount = Math.min(sbPlayer.stack as unknown as number, smallBlind as unknown as number);
    const sbAction: BettingAction = {
      playerUuid: smallBlindPlayer,
      actionType: ActionType.SmallBlind,
      amount: sbAmount as Chips,
    };

    const sbResult = this.processAction(sbAction, gameState, 0 as Chips, bigBlind);

    // Post big blind
    const bbAmount = Math.min(bbPlayer.stack as unknown as number, bigBlind as unknown as number);
    const bbAction: BettingAction = {
      playerUuid: bigBlindPlayer,
      actionType: ActionType.BigBlind,
      amount: bbAmount as Chips,
    };

    const bbResult = this.processAction(bbAction, gameState, sbResult.newCurrentBet, bigBlind);

    return {
      sbContribution: sbResult.potContribution,
      bbContribution: bbResult.potContribution,
    };
  }

  /**
   * Determines if betting round is complete
   */
  public isBettingRoundComplete(
    gameState: GameStateModel,
    currentBet: Chips,
    lastAggressor?: UUID
  ): boolean {
    const activePlayers = gameState.getActivePlayers();
    
    if (activePlayers.length <= 1) {
      return true; // Only one player left
    }

    const currentBetNum = currentBet as unknown as number;

    // Check if all active players have acted and matched the current bet
    for (const player of activePlayers) {
      if (player.isAllIn) {
        continue; // All-in players don't need to act
      }

      const playerBet = player.betThisStreet as unknown as number;
      
      if (playerBet < currentBetNum) {
        return false; // Player hasn't matched the current bet
      }
    }

    // If there was an aggressor, make sure everyone has had a chance to respond
    if (lastAggressor) {
      const aggressorPlayer = gameState.getPlayer(lastAggressor);
      if (!aggressorPlayer) {
        return true;
      }

      // Simple check: if aggressor is still active and hasn't been re-raised
      const aggressorBet = aggressorPlayer.betThisStreet as unknown as number;
      if (aggressorBet === currentBetNum) {
        return true;
      }
    }

    return true;
  }

  /**
   * Gets legal actions for a player
   */
  public getLegalActions(
    playerUuid: UUID,
    gameState: GameStateModel,
    currentBet: Chips,
    minRaise: Chips
  ): ActionType[] {
    const player = gameState.getPlayer(playerUuid);
    if (!player || player.hasFolded || player.isAllIn) {
      return [];
    }

    const actions: ActionType[] = [];
    const currentBetNum = currentBet as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;
    const playerStack = player.stack as unknown as number;

    // Can always fold
    actions.push(ActionType.Fold);

    // ✅ FIX: Can only check if NO BET to face (not just if you've matched it)
    if (currentBetNum === 0) {
      actions.push(ActionType.Check);
    }

    // Check if can call
    const callAmount = currentBetNum - playerBetThisStreet;
    if (callAmount > 0 && callAmount <= playerStack) {
      actions.push(ActionType.Call);
    }

    // Check if can bet (no current bet)
    if (currentBetNum === 0 && playerStack >= (minRaise as unknown as number)) {
      actions.push(ActionType.Bet);
    }

    // Check if can raise
    if (currentBetNum > 0) {
      const minRaiseTotal = currentBetNum + (minRaise as unknown as number);
      if (playerStack >= minRaiseTotal - playerBetThisStreet) {
        actions.push(ActionType.Raise);
      }
    }

    // Can always go all-in if have chips
    if (playerStack > 0) {
      actions.push(ActionType.AllIn);
    }

    return actions;
  }

  /**
   * Validates bet/raise amount
   */
  private validateBetAmount(amount: number, playerStack: number, minRaise: Chips): ValidationResult {
    if (amount <= 0) {
      return { isValid: false, error: 'Bet amount must be positive' };
    }

    if (amount > playerStack) {
      return { isValid: false, error: 'Bet amount exceeds player stack' };
    }

    const minRaiseNum = minRaise as unknown as number;
    if (amount < minRaiseNum && amount < playerStack) {
      return { 
        isValid: false, 
        error: `Bet must be at least ${minRaiseNum} or all-in` 
      };
    }

    // If betting less than minimum but it's all their chips, convert to all-in
    if (amount === playerStack && amount < minRaiseNum) {
      return { 
        isValid: true, 
        adjustedAmount: amount as Chips,
        isAllIn: true 
      };
    }

    return { isValid: true };
  }
}