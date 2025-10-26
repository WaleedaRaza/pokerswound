"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayStateManager = void 0;
class DisplayStateManager {
    calculateDisplayState(preChangeSnapshot, outcomes, postChangeState) {
        if (outcomes.type === 'HAND_COMPLETED' && outcomes.wasAllIn) {
            return this.createAllInDisplayState(preChangeSnapshot, outcomes, postChangeState);
        }
        if (outcomes.type === 'HAND_COMPLETED' && !outcomes.wasAllIn) {
            return this.createShowdownDisplayState(preChangeSnapshot, outcomes, postChangeState);
        }
        return this.createBettingDisplayState(preChangeSnapshot, outcomes, postChangeState);
    }
    createAllInDisplayState(preChangeSnapshot, outcomes, postChangeState) {
        const displayPlayers = preChangeSnapshot.players
            .filter(p => !p.hasFolded)
            .map(p => ({
            id: p.id,
            name: p.name,
            stack: p.isAllIn ? 0 : p.stack,
            betThisStreet: 0,
            isAllIn: p.isAllIn,
            hasFolded: p.hasFolded,
            seatIndex: p.seatIndex
        }));
        const animationPhases = [];
        const currentStreet = preChangeSnapshot.currentStreet;
        const streetsToReveal = this.getStreetsToReveal(currentStreet);
        animationPhases.push({
            type: 'POT_UPDATE',
            delay: 0,
            data: {
                pot: outcomes.potAmount || preChangeSnapshot.pot,
                players: displayPlayers
            }
        });
        streetsToReveal.forEach((street, index) => {
            animationPhases.push({
                type: 'STREET_REVEAL',
                delay: (index + 1) * 1000,
                data: {
                    street,
                    communityCards: this.getCommunityCardsForStreet(postChangeState, street),
                    message: `Dealing ${street}...`
                }
            });
        });
        const winnerDelay = (streetsToReveal.length + 1) * 1000;
        animationPhases.push({
            type: 'WINNER_ANNOUNCED',
            delay: winnerDelay,
            data: {
                winners: outcomes.winners || []
            }
        });
        animationPhases.push({
            type: 'POT_TRANSFER',
            delay: winnerDelay + 1000,
            data: {
                from: 'pot',
                to: outcomes.winners?.[0]?.playerId,
                amount: outcomes.potAmount || preChangeSnapshot.pot
            }
        });
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
                players: displayPlayers,
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
    createShowdownDisplayState(preChangeSnapshot, outcomes, postChangeState) {
        const animationPhases = [];
        animationPhases.push({
            type: 'WINNER_ANNOUNCED',
            delay: 0,
            data: {
                winners: outcomes.winners || []
            }
        });
        animationPhases.push({
            type: 'POT_TRANSFER',
            delay: 1000,
            data: {
                from: 'pot',
                to: outcomes.winners?.[0]?.playerId,
                amount: outcomes.potAmount || preChangeSnapshot.pot
            }
        });
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
    createBettingDisplayState(preChangeSnapshot, outcomes, postChangeState) {
        return {
            visibleState: {
                pot: postChangeState.pot?.totalPot || 0,
                players: this.mapPostChangePlayersToDisplay(postChangeState),
                communityCards: postChangeState.handState?.communityCards?.map((c) => c.toString()) || [],
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
    getStreetsToReveal(currentStreet) {
        const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
        const currentIndex = streetOrder.indexOf(currentStreet.toUpperCase());
        if (currentIndex === -1)
            return [];
        return streetOrder.slice(currentIndex + 1);
    }
    getCommunityCardsForStreet(postChangeState, street) {
        const allCards = postChangeState.handState?.communityCards?.map((c) => c.toString()) || [];
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
    mapSnapshotPlayersToDisplay(snapshot) {
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
    mapPostChangePlayersToDisplay(postChangeState) {
        if (!postChangeState.players)
            return [];
        const players = [];
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
exports.DisplayStateManager = DisplayStateManager;
