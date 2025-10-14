/**
 * DisplayStateManager
 * 
 * SOLVES THE ALL-IN DISPLAY BUG
 * 
 * Problem: Engine distributes pot and resets flags BEFORE UI can animate.
 * Solution: Calculate display state from pre-change snapshot (before cleanup).
 * 
 * This manager separates LOGICAL STATE (what happened) from DISPLAY STATE (what to show users).
 */

import {
  DisplayState,
  DisplayPlayer,
  AnimationPhase,
  GameStateSnapshot,
  DomainOutcomes
} from '../types/DisplayState.types';

export class DisplayStateManager {
  /**
   * Calculate display state from domain state
   * 
   * @param preChangeSnapshot - State BEFORE pot distribution and cleanup (has correct isAllIn flags)
   * @param outcomes - What happened (winners, pot amount, all-in status)
   * @param postChangeState - State AFTER mutations (for final values)
   * @returns DisplayState with correct animations
   */
  calculateDisplayState(
    preChangeSnapshot: GameStateSnapshot,
    outcomes: DomainOutcomes,
    postChangeState: any
  ): DisplayState {
    
    // If hand just completed with all-in runout
    if (outcomes.type === 'HAND_COMPLETED' && outcomes.wasAllIn) {
      return this.createAllInDisplayState(preChangeSnapshot, outcomes, postChangeState);
    }
    
    // If hand completed normally (fold or showdown without all-in)
    if (outcomes.type === 'HAND_COMPLETED' && !outcomes.wasAllIn) {
      return this.createShowdownDisplayState(preChangeSnapshot, outcomes, postChangeState);
    }
    
    // Normal betting action
    return this.createBettingDisplayState(preChangeSnapshot, outcomes, postChangeState);
  }
  
  /**
   * Create display state for all-in scenarios
   * THIS IS THE KEY FIX FOR THE BUG
   */
  private createAllInDisplayState(
    preChangeSnapshot: GameStateSnapshot,
    outcomes: DomainOutcomes,
    postChangeState: any
  ): DisplayState {
    
    // Use preChangeSnapshot for player data (has correct isAllIn flags)
    const displayPlayers: DisplayPlayer[] = preChangeSnapshot.players
      .filter(p => !p.hasFolded)  // Only active players
      .map(p => ({
        id: p.id,
        name: p.name,
        stack: p.isAllIn ? 0 : p.stack,  // ✅ All-in players show 0 (chips in pot)
        betThisStreet: 0,  // Bets already collected to pot
        isAllIn: p.isAllIn,  // ✅ Use PRE-CLEANUP flag (still true!)
        hasFolded: p.hasFolded,
        seatIndex: p.seatIndex
      }));
    
    // Create animation phases for progressive card reveals
    const animationPhases: AnimationPhase[] = [];
    
    // Determine which streets need to be revealed
    const currentStreet = preChangeSnapshot.currentStreet;
    const streetsToReveal = this.getStreetsToReveal(currentStreet);
    
    // Phase 1: Update pot and player stacks (show all-in players with 0)
    animationPhases.push({
      type: 'POT_UPDATE',
      delay: 0,
      data: {
        pot: outcomes.potAmount || preChangeSnapshot.pot,
        players: displayPlayers
      }
    });
    
    // Phase 2-N: Reveal streets progressively
    streetsToReveal.forEach((street, index) => {
      animationPhases.push({
        type: 'STREET_REVEAL',
        delay: (index + 1) * 1000,  // 1 second between each street
        data: {
          street,
          communityCards: this.getCommunityCardsForStreet(postChangeState, street),
          message: `Dealing ${street}...`
        }
      });
    });
    
    // Phase N+1: Announce winner
    const winnerDelay = (streetsToReveal.length + 1) * 1000;
    animationPhases.push({
      type: 'WINNER_ANNOUNCED',
      delay: winnerDelay,
      data: {
        winners: outcomes.winners || []
      }
    });
    
    // Phase N+2: Animate pot transfer to winner
    animationPhases.push({
      type: 'POT_TRANSFER',
      delay: winnerDelay + 1000,
      data: {
        from: 'pot',
        to: outcomes.winners?.[0]?.playerId,
        amount: outcomes.potAmount || preChangeSnapshot.pot
      }
    });
    
    // Phase N+3: Update final stacks
    const finalPlayers = this.mapPostChangePlayersToDisplay(postChangeState);
    animationPhases.push({
      type: 'STACKS_UPDATED',
      delay: winnerDelay + 2000,
      data: {
        players: finalPlayers
      }
    });
    
    return {
      visibleState: {
        pot: outcomes.potAmount || preChangeSnapshot.pot,
        players: displayPlayers,  // Show all-in players with stack=0
        communityCards: preChangeSnapshot.communityCards,
        currentStreet: preChangeSnapshot.currentStreet
      },
      animationPhases,
      phase: 'REVEALING',
      metadata: {
        isAllInRunout: true,
        hasWinner: true,
        potBeforeDistribution: outcomes.potAmount || preChangeSnapshot.pot
      }
    };
  }
  
  /**
   * Create display state for normal showdown (no all-in runout)
   */
  private createShowdownDisplayState(
    preChangeSnapshot: GameStateSnapshot,
    outcomes: DomainOutcomes,
    postChangeState: any
  ): DisplayState {
    
    const animationPhases: AnimationPhase[] = [];
    
    // Announce winner immediately
    animationPhases.push({
      type: 'WINNER_ANNOUNCED',
      delay: 0,
      data: {
        winners: outcomes.winners || []
      }
    });
    
    // Transfer pot to winner
    animationPhases.push({
      type: 'POT_TRANSFER',
      delay: 1000,
      data: {
        from: 'pot',
        to: outcomes.winners?.[0]?.playerId,
        amount: outcomes.potAmount || preChangeSnapshot.pot
      }
    });
    
    // Update stacks
    const finalPlayers = this.mapPostChangePlayersToDisplay(postChangeState);
    animationPhases.push({
      type: 'STACKS_UPDATED',
      delay: 2000,
      data: {
        players: finalPlayers
      }
    });
    
    return {
      visibleState: {
        pot: outcomes.potAmount || preChangeSnapshot.pot,
        players: this.mapSnapshotPlayersToDisplay(preChangeSnapshot),
        communityCards: preChangeSnapshot.communityCards,
        currentStreet: preChangeSnapshot.currentStreet
      },
      animationPhases,
      phase: 'DISTRIBUTING',
      metadata: {
        isAllInRunout: false,
        hasWinner: true,
        potBeforeDistribution: outcomes.potAmount || preChangeSnapshot.pot
      }
    };
  }
  
  /**
   * Create display state for normal betting actions
   */
  private createBettingDisplayState(
    preChangeSnapshot: GameStateSnapshot,
    outcomes: DomainOutcomes,
    postChangeState: any
  ): DisplayState {
    
    return {
      visibleState: {
        pot: postChangeState.pot?.totalPot || 0,
        players: this.mapPostChangePlayersToDisplay(postChangeState),
        communityCards: postChangeState.handState?.communityCards?.map((c: any) => c.toString()) || [],
        currentStreet: postChangeState.currentStreet || 'PREFLOP'
      },
      animationPhases: [],
      phase: 'BETTING',
      metadata: {
        isAllInRunout: false,
        hasWinner: false
      }
    };
  }
  
  /**
   * Helper: Determine which streets need to be revealed
   */
  private getStreetsToReveal(currentStreet: string): string[] {
    const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
    const currentIndex = streetOrder.indexOf(currentStreet.toUpperCase());
    
    if (currentIndex === -1) return [];
    
    // Return streets after current (e.g., if PREFLOP, return [FLOP, TURN, RIVER])
    return streetOrder.slice(currentIndex + 1);
  }
  
  /**
   * Helper: Get community cards for a specific street
   */
  private getCommunityCardsForStreet(postChangeState: any, street: string): string[] {
    const allCards = postChangeState.handState?.communityCards?.map((c: any) => c.toString()) || [];
    
    switch (street.toUpperCase()) {
      case 'FLOP':
        return allCards.slice(0, 3);
      case 'TURN':
        return allCards.slice(0, 4);
      case 'RIVER':
        return allCards.slice(0, 5);
      default:
        return allCards;
    }
  }
  
  /**
   * Helper: Map snapshot players to display format
   */
  private mapSnapshotPlayersToDisplay(snapshot: GameStateSnapshot): DisplayPlayer[] {
    return snapshot.players.map(p => ({
      id: p.id,
      name: p.name,
      stack: p.stack,
      betThisStreet: p.betThisStreet,
      isAllIn: p.isAllIn,
      hasFolded: p.hasFolded,
      seatIndex: p.seatIndex
    }));
  }
  
  /**
   * Helper: Map post-change state players to display format
   */
  private mapPostChangePlayersToDisplay(postChangeState: any): DisplayPlayer[] {
    if (!postChangeState.players) return [];
    
    const players: DisplayPlayer[] = [];
    
    for (const [id, player] of postChangeState.players.entries()) {
      players.push({
        id: player.uuid || id,
        name: player.name || 'Unknown',
        stack: player.stack || 0,
        betThisStreet: player.betThisStreet || 0,
        isAllIn: player.isAllIn || false,
        hasFolded: player.hasFolded || false,
        seatIndex: player.seatIndex || 0
      });
    }
    
    return players;
  }
}

