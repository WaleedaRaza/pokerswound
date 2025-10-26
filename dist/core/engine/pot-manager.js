"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PotManager = void 0;
class PotManager {
    constructor() {
        this.pots = [];
        this.nextPotId = 1;
        this.reset();
    }
    reset() {
        this.pots = [];
        this.nextPotId = 1;
        this.pots.push({
            id: 'main',
            amount: 0,
            eligiblePlayers: new Set(),
            contributions: new Map(),
            isMainPot: true,
        });
    }
    addContribution(playerUuid, amount, isAllIn = false) {
        if (amount <= 0) {
            throw new Error('Contribution amount must be positive');
        }
        const contribution = {
            playerUuid,
            amount,
            isAllIn,
        };
        if (isAllIn) {
            this.handleAllInContribution(contribution);
        }
        else {
            this.addToMainPot(contribution);
        }
    }
    getPotBreakdown() {
        const mainPot = this.pots.find(p => p.isMainPot);
        const sidePots = this.pots.filter(p => !p.isMainPot);
        return {
            main: mainPot?.amount || 0,
            sidePots: sidePots.map(p => p.amount),
        };
    }
    getTotalPot() {
        return this.pots.reduce((total, pot) => (total + pot.amount), 0);
    }
    distributePots(winnersByPot) {
        const distributions = [];
        for (const pot of this.pots) {
            const winners = winnersByPot.get(pot.id) || [];
            if (winners.length === 0) {
                continue;
            }
            const potAmount = pot.amount;
            const shareAmount = Math.floor(potAmount / winners.length);
            const remainder = potAmount % winners.length;
            winners.forEach((winner, index) => {
                const amount = shareAmount + (index < remainder ? 1 : 0);
                if (amount > 0) {
                    distributions.push({
                        playerUuid: winner.playerUuid,
                        amount: amount,
                        potId: pot.id,
                        description: this.getPotDescription(pot, winners.length),
                    });
                }
            });
        }
        return distributions;
    }
    getPots() {
        return [...this.pots];
    }
    handleAllInContribution(contribution) {
        const allInAmount = contribution.amount;
        let targetPot = this.pots.find(p => !p.isMainPot && p.capAmount && p.capAmount === allInAmount);
        if (!targetPot) {
            targetPot = this.createSidePot(contribution.amount);
        }
        this.addToPot(targetPot, contribution);
        this.redistributeExcess(contribution);
    }
    createSidePot(capAmount) {
        const sidePot = {
            id: `side-${this.nextPotId++}`,
            amount: 0,
            eligiblePlayers: new Set(),
            contributions: new Map(),
            isMainPot: false,
            capAmount,
        };
        const insertIndex = this.pots.findIndex(p => !p.isMainPot && p.capAmount && p.capAmount > capAmount);
        if (insertIndex === -1) {
            this.pots.push(sidePot);
        }
        else {
            this.pots.splice(insertIndex, 0, sidePot);
        }
        return sidePot;
    }
    addToMainPot(contribution) {
        const mainPot = this.pots.find(p => p.isMainPot);
        if (!mainPot) {
            throw new Error('Main pot not found');
        }
        this.addToPot(mainPot, contribution);
    }
    addToPot(pot, contribution) {
        const currentAmount = pot.amount;
        const contributionAmount = contribution.amount;
        pot.amount = (currentAmount + contributionAmount);
        pot.eligiblePlayers.add(contribution.playerUuid);
        const existingContribution = pot.contributions.get(contribution.playerUuid) || 0;
        const newContribution = (existingContribution + contributionAmount);
        pot.contributions.set(contribution.playerUuid, newContribution);
    }
    redistributeExcess(contribution) {
    }
    getPotDescription(pot, winnerCount) {
        if (pot.isMainPot) {
            return winnerCount > 1 ? `Main pot (split ${winnerCount} ways)` : 'Main pot';
        }
        else {
            const potNum = pot.id.replace('side-', '');
            return winnerCount > 1
                ? `Side pot ${potNum} (split ${winnerCount} ways)`
                : `Side pot ${potNum}`;
        }
    }
    static calculateSidePots(contributions) {
        if (contributions.length === 0) {
            return [];
        }
        const sortedContributions = [...contributions].sort((a, b) => a.amount - b.amount);
        const pots = [];
        let potId = 1;
        let previousAmount = 0;
        const mainPot = {
            id: 'main',
            amount: 0,
            eligiblePlayers: new Set(),
            contributions: new Map(),
            isMainPot: true,
        };
        for (let i = 0; i < sortedContributions.length; i++) {
            const currentAmount = sortedContributions[i].amount;
            const levelAmount = currentAmount - previousAmount;
            if (levelAmount <= 0)
                continue;
            const eligiblePlayers = sortedContributions
                .slice(i)
                .map(c => c.playerUuid);
            const potAmount = levelAmount * eligiblePlayers.length;
            if (i === 0) {
                mainPot.amount = potAmount;
                eligiblePlayers.forEach(uuid => mainPot.eligiblePlayers.add(uuid));
                eligiblePlayers.forEach(uuid => {
                    mainPot.contributions.set(uuid, levelAmount);
                });
            }
            else {
                const sidePot = {
                    id: `side-${potId++}`,
                    amount: potAmount,
                    eligiblePlayers: new Set(eligiblePlayers),
                    contributions: new Map(),
                    isMainPot: false,
                    capAmount: currentAmount,
                };
                eligiblePlayers.forEach(uuid => {
                    sidePot.contributions.set(uuid, levelAmount);
                });
                pots.push(sidePot);
            }
            previousAmount = currentAmount;
        }
        return [mainPot, ...pots];
    }
}
exports.PotManager = PotManager;
