import type { UUID, Chips } from '../../types/common.types';

export interface PlayerContribution {
  playerUuid: UUID;
  amount: Chips;
  isAllIn: boolean;
}

export interface Pot {
  id: string;
  amount: Chips;
  eligiblePlayers: Set<UUID>; // Players who can win this pot
  contributions: Map<UUID, Chips>; // How much each player contributed
  isMainPot: boolean;
  capAmount?: Chips; // For side pots - the all-in amount that created this pot
}

export interface PotDistribution {
  playerUuid: UUID;
  amount: Chips;
  potId: string;
  description: string;
}

export interface WinnerShare {
  playerUuid: UUID;
  handRank: any; // HandRank from hand-evaluator
}

export class PotManager {
  private pots: Pot[] = [];
  private nextPotId = 1;

  constructor() {
    this.reset();
  }

  /**
   * Resets pot manager for new hand
   */
  public reset(): void {
    this.pots = [];
    this.nextPotId = 1;
    
    // Create main pot
    this.pots.push({
      id: 'main',
      amount: 0 as Chips,
      eligiblePlayers: new Set(),
      contributions: new Map(),
      isMainPot: true,
    });
  }

  /**
   * Adds a player contribution to the appropriate pot(s)
   */
  public addContribution(playerUuid: UUID, amount: Chips, isAllIn: boolean = false): void {
    if ((amount as unknown as number) <= 0) {
      throw new Error('Contribution amount must be positive');
    }

    const contribution: PlayerContribution = {
      playerUuid,
      amount,
      isAllIn,
    };

    if (isAllIn) {
      this.handleAllInContribution(contribution);
    } else {
      this.addToMainPot(contribution);
    }
  }

  /**
   * Gets current pot breakdown
   */
  public getPotBreakdown(): { main: Chips; sidePots: Chips[] } {
    const mainPot = this.pots.find(p => p.isMainPot);
    const sidePots = this.pots.filter(p => !p.isMainPot);

    return {
      main: mainPot?.amount || (0 as Chips),
      sidePots: sidePots.map(p => p.amount),
    };
  }

  /**
   * Gets total pot amount across all pots
   */
  public getTotalPot(): Chips {
    return this.pots.reduce(
      (total, pot) => ((total as unknown as number) + (pot.amount as unknown as number)) as Chips,
      0 as Chips
    );
  }

  /**
   * Distributes pots to winners
   */
  public distributePots(winnersByPot: Map<string, WinnerShare[]>): PotDistribution[] {
    const distributions: PotDistribution[] = [];

    for (const pot of this.pots) {
      const winners = winnersByPot.get(pot.id) || [];
      
      if (winners.length === 0) {
        // No winners for this pot (shouldn't happen in normal play)
        continue;
      }

      const potAmount = pot.amount as unknown as number;
      const shareAmount = Math.floor(potAmount / winners.length);
      const remainder = potAmount % winners.length;

      // Distribute equal shares
      winners.forEach((winner, index) => {
        const amount = shareAmount + (index < remainder ? 1 : 0); // Distribute remainder
        
        if (amount > 0) {
          distributions.push({
            playerUuid: winner.playerUuid,
            amount: amount as Chips,
            potId: pot.id,
            description: this.getPotDescription(pot, winners.length),
          });
        }
      });
    }

    return distributions;
  }

  /**
   * Gets all pots (for inspection/debugging)
   */
  public getPots(): readonly Pot[] {
    return [...this.pots];
  }

  /**
   * Handles all-in contribution, potentially creating side pots
   */
  private handleAllInContribution(contribution: PlayerContribution): void {
    const allInAmount = contribution.amount as unknown as number;
    
    // Find if there's already a side pot for this all-in amount
    let targetPot = this.pots.find(p => 
      !p.isMainPot && p.capAmount && (p.capAmount as unknown as number) === allInAmount
    );

    if (!targetPot) {
      // Create new side pot for this all-in amount
      targetPot = this.createSidePot(contribution.amount);
    }

    // Add contribution to the appropriate pot
    this.addToPot(targetPot, contribution);

    // Handle any excess that goes to higher pots
    this.redistributeExcess(contribution);
  }

  /**
   * Creates a new side pot
   */
  private createSidePot(capAmount: Chips): Pot {
    const sidePot: Pot = {
      id: `side-${this.nextPotId++}`,
      amount: 0 as Chips,
      eligiblePlayers: new Set(),
      contributions: new Map(),
      isMainPot: false,
      capAmount,
    };

    // Insert side pot in correct order (by cap amount)
    const insertIndex = this.pots.findIndex(p => 
      !p.isMainPot && p.capAmount && (p.capAmount as unknown as number) > (capAmount as unknown as number)
    );

    if (insertIndex === -1) {
      this.pots.push(sidePot);
    } else {
      this.pots.splice(insertIndex, 0, sidePot);
    }

    return sidePot;
  }

  /**
   * Adds contribution to main pot
   */
  private addToMainPot(contribution: PlayerContribution): void {
    const mainPot = this.pots.find(p => p.isMainPot);
    if (!mainPot) {
      throw new Error('Main pot not found');
    }

    this.addToPot(mainPot, contribution);
  }

  /**
   * Adds contribution to specific pot
   */
  private addToPot(pot: Pot, contribution: PlayerContribution): void {
    const currentAmount = pot.amount as unknown as number;
    const contributionAmount = contribution.amount as unknown as number;
    
    pot.amount = (currentAmount + contributionAmount) as Chips;
    pot.eligiblePlayers.add(contribution.playerUuid);
    
    const existingContribution = pot.contributions.get(contribution.playerUuid) || (0 as Chips);
    const newContribution = ((existingContribution as unknown as number) + contributionAmount) as Chips;
    pot.contributions.set(contribution.playerUuid, newContribution);
  }

  /**
   * Redistributes excess contributions from all-in players to appropriate pots
   */
  private redistributeExcess(contribution: PlayerContribution): void {
    // This is a simplified version - in a full implementation, you'd need to handle
    // complex scenarios where multiple players are all-in at different amounts
    // For now, we assume the calling code handles the distribution logic correctly
  }

  /**
   * Gets description for pot distribution
   */
  private getPotDescription(pot: Pot, winnerCount: number): string {
    if (pot.isMainPot) {
      return winnerCount > 1 ? `Main pot (split ${winnerCount} ways)` : 'Main pot';
    } else {
      const potNum = pot.id.replace('side-', '');
      return winnerCount > 1 
        ? `Side pot ${potNum} (split ${winnerCount} ways)`
        : `Side pot ${potNum}`;
    }
  }

  /**
   * Calculates side pots from player contributions
   * This is the main algorithm for handling complex all-in scenarios
   */
  public static calculateSidePots(contributions: PlayerContribution[]): Pot[] {
    if (contributions.length === 0) {
      return [];
    }

    // Sort contributions by amount (ascending)
    const sortedContributions = [...contributions].sort((a, b) => 
      (a.amount as unknown as number) - (b.amount as unknown as number)
    );

    const pots: Pot[] = [];
    let potId = 1;
    let previousAmount = 0;

    // Create main pot
    const mainPot: Pot = {
      id: 'main',
      amount: 0 as Chips,
      eligiblePlayers: new Set(),
      contributions: new Map(),
      isMainPot: true,
    };

    // Process each contribution level
    for (let i = 0; i < sortedContributions.length; i++) {
      const currentAmount = sortedContributions[i].amount as unknown as number;
      const levelAmount = currentAmount - previousAmount;
      
      if (levelAmount <= 0) continue;

      // Determine which players are eligible for this level
      const eligiblePlayers = sortedContributions
        .slice(i)
        .map(c => c.playerUuid);

      // Calculate pot amount for this level
      const potAmount = levelAmount * eligiblePlayers.length;

      if (i === 0) {
        // Add to main pot
        mainPot.amount = potAmount as Chips;
        eligiblePlayers.forEach(uuid => mainPot.eligiblePlayers.add(uuid));
        eligiblePlayers.forEach(uuid => {
          mainPot.contributions.set(uuid, levelAmount as Chips);
        });
      } else {
        // Create side pot
        const sidePot: Pot = {
          id: `side-${potId++}`,
          amount: potAmount as Chips,
          eligiblePlayers: new Set(eligiblePlayers),
          contributions: new Map(),
          isMainPot: false,
          capAmount: currentAmount as Chips,
        };

        eligiblePlayers.forEach(uuid => {
          sidePot.contributions.set(uuid, levelAmount as Chips);
        });

        pots.push(sidePot);
      }

      previousAmount = currentAmount;
    }

    return [mainPot, ...pots];
  }
}