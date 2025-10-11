import type { UUID, Chips } from '../../types/common.types';
import { ActionType, Street, Position } from '../../types/common.types';
import type { GameStateModel } from '../models/game-state';
import type { PlayerModel } from '../models/player';

export interface ActionValidationContext {
  gameState: GameStateModel;
  currentStreet: Street;
  currentBet: Chips;
  minRaise: Chips;
  playerToAct: UUID;
  isPreflop: boolean;
  blindsPosted: boolean;
}

export interface ActionValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  adjustedAmount?: Chips;
  isAllIn?: boolean;
  preventStringBetting?: boolean;
}

export interface PositionInfo {
  position: Position;
  isInPosition: boolean;
  isBlind: boolean;
  actingOrder: number;
}

export class ActionValidator {
  /**
   * Comprehensive action validation with position and street awareness
   */
  public validateAction(
    playerUuid: UUID,
    actionType: ActionType,
    amount: Chips | undefined,
    context: ActionValidationContext
  ): ActionValidationResult {
    // Basic validations first
    const basicValidation = this.validateBasicAction(playerUuid, actionType, amount, context);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Position-specific validations
    const positionValidation = this.validatePositionAction(playerUuid, actionType, context);
    if (!positionValidation.isValid) {
      return positionValidation;
    }

    // Street-specific validations
    const streetValidation = this.validateStreetAction(actionType, amount, context);
    if (!streetValidation.isValid) {
      return streetValidation;
    }

    // Stack constraint validations
    const stackValidation = this.validateStackConstraints(playerUuid, actionType, amount, context);
    if (!stackValidation.isValid) {
      return stackValidation;
    }

    // String betting prevention
    const stringBettingValidation = this.validateStringBetting(playerUuid, actionType, amount, context);
    if (!stringBettingValidation.isValid) {
      return stringBettingValidation;
    }

    // Timing and sequence validations
    const sequenceValidation = this.validateActionSequence(playerUuid, actionType, context);
    if (!sequenceValidation.isValid) {
      return sequenceValidation;
    }

    return { isValid: true };
  }

  /**
   * Gets legal actions for a player in current context
   */
  public getLegalActions(playerUuid: UUID, context: ActionValidationContext): ActionType[] {
    const player = context.gameState.getPlayer(playerUuid);
    if (!player) {
      return [];
    }

    if (player.hasFolded || player.isAllIn) {
      return [];
    }

    if (context.playerToAct !== playerUuid) {
      return []; // Not their turn
    }

    const legalActions: ActionType[] = [];
    const currentBetNum = context.currentBet as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;
    const playerStack = player.stack as unknown as number;

    // Always can fold (except when already folded)
    legalActions.push(ActionType.Fold);

    // Check conditions
    if (currentBetNum === playerBetThisStreet) {
      legalActions.push(ActionType.Check);
    }

    // Call conditions
    const callAmount = currentBetNum - playerBetThisStreet;
    if (callAmount > 0) {
      if (callAmount <= playerStack) {
        legalActions.push(ActionType.Call);
      }
      // If can't afford full call, all-in is the only option
    }

    // Bet conditions (no current bet)
    if (currentBetNum === 0) {
      const minBet = context.minRaise as unknown as number;
      if (playerStack >= minBet) {
        legalActions.push(ActionType.Bet);
      }
    }

    // Raise conditions
    if (currentBetNum > 0) {
      const minRaiseTotal = currentBetNum + (context.minRaise as unknown as number);
      const additionalNeeded = minRaiseTotal - playerBetThisStreet;
      
      if (playerStack >= additionalNeeded) {
        legalActions.push(ActionType.Raise);
      }
    }

    // All-in is always available if player has chips
    if (playerStack > 0) {
      legalActions.push(ActionType.AllIn);
    }

    return legalActions;
  }

  /**
   * Calculates position information for a player
   */
  public getPositionInfo(playerUuid: UUID, gameState: GameStateModel): PositionInfo | null {
    const player = gameState.getPlayer(playerUuid);
    if (!player) {
      return null;
    }

    const table = gameState.table;
    const activePlayers = gameState.getActivePlayers();
    const playerCount = activePlayers.length;

    // Find player's seat relative to dealer
    const dealerSeat = table.dealerPosition as unknown as number;
    const playerSeat = player.seatIndex as unknown as number;
    
    let seatDistance = (playerSeat - dealerSeat + 10) % 10; // Assuming max 10 seats
    
    // Adjust for actual number of players
    const seatOrder = activePlayers
      .map(p => ({
        uuid: p.uuid,
        seat: p.seatIndex as unknown as number,
        distance: (p.seatIndex as unknown as number - dealerSeat + 10) % 10
      }))
      .sort((a, b) => a.distance - b.distance);

    const playerIndex = seatOrder.findIndex(p => p.uuid === playerUuid);
    
    let position: Position;
    let isBlind = false;

    if (playerCount === 2) {
      // Heads-up
      position = playerIndex === 0 ? Position.BTN : Position.BB;
      isBlind = playerIndex === 1;
    } else {
      // Multi-way
      switch (playerIndex) {
        case 0:
          position = Position.BTN;
          break;
        case 1:
          position = Position.SB;
          isBlind = true;
          break;
        case 2:
          position = Position.BB;
          isBlind = true;
          break;
        case 3:
          position = playerCount <= 6 ? Position.UTG : Position.UTG;
          break;
        case 4:
          position = playerCount <= 6 ? Position.MP : Position.UTG1;
          break;
        case 5:
          position = playerCount <= 6 ? Position.CO : Position.MP;
          break;
        default:
          if (playerIndex === playerCount - 1) {
            position = Position.CO;
          } else if (playerIndex === playerCount - 2) {
            position = Position.HJ;
          } else {
            position = Position.MP;
          }
      }
    }

    return {
      position,
      isInPosition: playerIndex >= Math.floor(playerCount / 2),
      isBlind,
      actingOrder: playerIndex,
    };
  }

  /**
   * Basic action validation (player exists, not folded, etc.)
   */
  private validateBasicAction(
    playerUuid: UUID,
    actionType: ActionType,
    amount: Chips | undefined,
    context: ActionValidationContext
  ): ActionValidationResult {
    const player = context.gameState.getPlayer(playerUuid);
    
    if (!player) {
      return { isValid: false, error: 'Player not found in game' };
    }

    if (player.hasFolded) {
      return { isValid: false, error: 'Player has already folded' };
    }

    if (player.isAllIn && actionType !== ActionType.Fold) {
      return { isValid: false, error: 'Player is already all-in' };
    }

    if (context.playerToAct !== playerUuid) {
      return { isValid: false, error: 'Not player\'s turn to act' };
    }

    // Validate amount for actions that require it
    if ([ActionType.Bet, ActionType.Raise, ActionType.Call].includes(actionType)) {
      if (amount === undefined || (amount as unknown as number) <= 0) {
        return { isValid: false, error: `${actionType} requires a positive amount` };
      }
    }

    return { isValid: true };
  }

  /**
   * Position-specific validation
   */
  private validatePositionAction(
    playerUuid: UUID,
    actionType: ActionType,
    context: ActionValidationContext
  ): ActionValidationResult {
    const positionInfo = this.getPositionInfo(playerUuid, context.gameState);
    if (!positionInfo) {
      return { isValid: false, error: 'Could not determine player position' };
    }

    // Preflop blind posting validation
    if (context.isPreflop && !context.blindsPosted) {
      if (positionInfo.isBlind) {
        if (positionInfo.position === Position.SB && actionType !== ActionType.SmallBlind) {
          return { isValid: false, error: 'Small blind must post small blind' };
        }
        if (positionInfo.position === Position.BB && actionType !== ActionType.BigBlind) {
          return { isValid: false, error: 'Big blind must post big blind' };
        }
      } else {
        if ([ActionType.SmallBlind, ActionType.BigBlind].includes(actionType)) {
          return { isValid: false, error: 'Only blind positions can post blinds' };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Street-specific validation
   */
  private validateStreetAction(
    actionType: ActionType,
    amount: Chips | undefined,
    context: ActionValidationContext
  ): ActionValidationResult {
    // Blinds can only be posted preflop
    if ([ActionType.SmallBlind, ActionType.BigBlind].includes(actionType)) {
      if (context.currentStreet !== Street.Preflop) {
        return { isValid: false, error: 'Blinds can only be posted preflop' };
      }
    }

    // Antes (if implemented) would have similar restrictions
    if (actionType === ActionType.Ante) {
      if (context.currentStreet !== Street.Preflop) {
        return { isValid: false, error: 'Antes can only be posted preflop' };
      }
    }

    return { isValid: true };
  }

  /**
   * Stack constraint validation
   */
  private validateStackConstraints(
    playerUuid: UUID,
    actionType: ActionType,
    amount: Chips | undefined,
    context: ActionValidationContext
  ): ActionValidationResult {
    const player = context.gameState.getPlayer(playerUuid);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const playerStack = player.stack as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;
    const currentBetNum = context.currentBet as unknown as number;
    const amountNum = (amount as unknown as number) || 0;

    switch (actionType) {
      case ActionType.Call:
        const callAmount = currentBetNum - playerBetThisStreet;
        if (callAmount > playerStack) {
          // Auto-convert to all-in call
          return {
            isValid: true,
            adjustedAmount: playerStack as Chips,
            isAllIn: true,
            warnings: ['Call amount exceeds stack, converted to all-in']
          };
        }
        break;

      case ActionType.Bet:
      case ActionType.Raise:
        if (amountNum > playerStack) {
          return { isValid: false, error: 'Bet/raise amount exceeds player stack' };
        }
        
        // Check minimum bet/raise requirements
        const minAmount = context.minRaise as unknown as number;
        if (amountNum < minAmount && amountNum < playerStack) {
          return { 
            isValid: false, 
            error: `Minimum ${actionType.toLowerCase()} is ${minAmount} (or all-in)` 
          };
        }
        
        // If betting/raising less than minimum but it's all their chips
        if (amountNum === playerStack && amountNum < minAmount) {
          return {
            isValid: true,
            isAllIn: true,
            warnings: [`${actionType} amount below minimum, converted to all-in`]
          };
        }
        break;

      case ActionType.AllIn:
        if (playerStack <= 0) {
          return { isValid: false, error: 'Player has no chips to go all-in' };
        }
        return {
          isValid: true,
          adjustedAmount: playerStack as Chips,
          isAllIn: true
        };
    }

    return { isValid: true };
  }

  /**
   * String betting prevention
   */
  private validateStringBetting(
    playerUuid: UUID,
    actionType: ActionType,
    amount: Chips | undefined,
    context: ActionValidationContext
  ): ActionValidationResult {
    // String betting occurs when a player announces one action but then tries to do more
    // This is a simplified version - in a real implementation, you'd track player announcements
    
    if ([ActionType.Bet, ActionType.Raise].includes(actionType)) {
      const player = context.gameState.getPlayer(playerUuid);
      if (!player) {
        return { isValid: false, error: 'Player not found' };
      }

      // Prevent multiple betting actions in the same turn (simplified)
      // In a real implementation, you'd need to track the player's current action state
      
      return {
        isValid: true,
        preventStringBetting: true
      };
    }

    return { isValid: true };
  }

  /**
   * Action sequence validation
   */
  private validateActionSequence(
    playerUuid: UUID,
    actionType: ActionType,
    context: ActionValidationContext
  ): ActionValidationResult {
    // Validate that the action makes sense in the current sequence
    const currentBetNum = context.currentBet as unknown as number;
    const player = context.gameState.getPlayer(playerUuid);
    
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const playerBetThisStreet = player.betThisStreet as unknown as number;

    // Can't check when facing a bet
    if (actionType === ActionType.Check && currentBetNum > playerBetThisStreet) {
      return { isValid: false, error: 'Cannot check when facing a bet' };
    }

    // Can't call when there's no bet to call
    if (actionType === ActionType.Call && currentBetNum <= playerBetThisStreet) {
      return { isValid: false, error: 'No bet to call' };
    }

    // Can't bet when there's already a bet
    if (actionType === ActionType.Bet && currentBetNum > 0) {
      return { isValid: false, error: 'Cannot bet when there is already a bet (use raise)' };
    }

    // Can't raise when there's no bet
    if (actionType === ActionType.Raise && currentBetNum === 0) {
      return { isValid: false, error: 'Cannot raise when there is no bet (use bet)' };
    }

    return { isValid: true };
  }
}