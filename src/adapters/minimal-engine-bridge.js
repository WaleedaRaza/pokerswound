/**
 * MINIMAL ENGINE BRIDGE - PRODUCTION-GRADE (MODULARIZED)
 * 
 * Purpose: Thin adapter layer for production-grade poker game logic
 * Strategy: Delegates to modular game logic components
 * 
 * Architecture:
 * - betting-logic.js: Betting validation and application
 * - pot-logic.js: Pot calculation and chip conservation
 * - turn-logic.js: Turn rotation and betting round completion
 * - rules-ranks.js: Hand evaluation and poker rules
 * - game-logic.js: Main orchestrator
 * 
 * Status: Production-ready, modularized
 * Last Updated: Current session - Modularized into separate concerns
 */

// Import modular game logic components
const gameLogic = require('./game-logic');
const potLogic = require('./pot-logic');
const turnLogic = require('./turn-logic');
const bettingLogic = require('./betting-logic');
const rulesRanks = require('./rules-ranks');

/**
 * MINIMAL BETTING ADAPTER
 * Thin wrapper that delegates to modular components
 * Maintains backward compatibility with existing code
 */
class MinimalBettingAdapter {
  /**
   * PROCESS ACTION
   * Main entry point - delegates to game-logic module
   * FIX: Pass through expectedSeq for async safety
   */
  static processAction(gameState, userId, action, amount = 0, expectedSeq = null) {
    return gameLogic.processAction(gameState, userId, action, amount, expectedSeq);
    }

  /**
   * VALIDATE CHIP CONSERVATION
   * Delegates to pot-logic module
   */
  static validateChipConservation(gameState, startingTotalChips) {
    return potLogic.validateChipConservation(gameState, startingTotalChips);
  }

  /**
   * CALCULATE SIDE POTS
   * Delegates to pot-logic module
   */
  static calculateSidePots(gameState) {
    return potLogic.calculateSidePots(gameState);
  }

  /**
   * HANDLE UNCALLED BETS
   * Delegates to pot-logic module
   */
  static handleUncalledBets(gameState) {
    return potLogic.handleUncalledBets(gameState);
  }

  /**
   * VALIDATE ACTION
   * Delegates to betting-logic module
   */
  static validateAction(gameState, player, action, amount) {
    return bettingLogic.validateAction(gameState, player, action, amount);
  }

  /**
   * APPLY ACTION
   * Delegates to betting-logic module
   */
  static applyAction(gameState, player, action, amount, isAllInFromValidation = false) {
    return bettingLogic.applyAction(
      gameState, 
      player, 
      action,
      amount, 
      isAllInFromValidation,
      potLogic.validateChipConservation // Pass chip conservation validator
    );
  }

  /**
   * CHECK IF PLAYER CAN ACT
   * Delegates to turn-logic module
   */
  static canPlayerAct(gameState, player) {
    return turnLogic.canPlayerAct(gameState, player);
  }

  /**
   * GET LAST AGGRESSOR
   * Delegates to turn-logic module
   */
  static getLastAggressor(gameState) {
    return turnLogic.getLastAggressor(gameState);
  }

  /**
   * CHECK IF BETTING ROUND COMPLETE
   * Delegates to turn-logic module
   */
  static isBettingRoundComplete(gameState) {
    return turnLogic.isBettingRoundComplete(gameState);
  }

  /**
   * ROTATE TO NEXT PLAYER
   * Delegates to turn-logic module
   */
  static rotateToNextPlayer(gameState) {
    return turnLogic.rotateToNextPlayer(gameState);
  }

  /**
   * RESET TO FIRST ACTOR
   * Delegates to turn-logic module
   */
  static resetToFirstActor(gameState) {
    return turnLogic.resetToFirstActor(gameState);
  }

  /**
   * PROGRESS TO NEXT STREET
   * Delegates to turn-logic module
   */
  static progressToNextStreet(gameState) {
    return turnLogic.progressToNextStreet(gameState);
  }

  /**
   * HANDLE FOLD WIN
   * Delegates to game-logic module
   */
  static handleFoldWin(gameState, winner) {
    return gameLogic.handleFoldWin(gameState, winner);
  }

  /**
   * HANDLE ALL-IN RUNOUT
   * Delegates to game-logic module
   */
  static handleAllInRunout(gameState) {
    return gameLogic.handleAllInRunout(gameState);
  }

  /**
   * HANDLE SHOWDOWN
   * Delegates to game-logic module
   */
  static handleShowdown(gameState) {
    return gameLogic.handleShowdown(gameState);
  }

  /**
   * DISTRIBUTE POTS
   * Delegates to game-logic module
   */
  static distributePots(gameState, playerHands, dealerPosition) {
    return gameLogic.distributePots(gameState, playerHands, dealerPosition);
  }

  /**
   * EVALUATE HAND
   * Delegates to rules-ranks module
   */
  static evaluateHand(holeCards, communityCards) {
    return rulesRanks.evaluateHand(holeCards, communityCards);
  }
}

module.exports = MinimalBettingAdapter;
