"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlayerStatsHandler = void 0;
class GetPlayerStatsHandler {
    constructor(statsStore) {
        this.statsStore = statsStore;
    }
    async handle(query) {
        const stats = this.statsStore.get(query.playerId);
        if (!stats) {
            return {
                playerId: query.playerId,
                handsPlayed: 0,
                handsWon: 0,
                totalChipsWon: 0,
                totalChipsLost: 0,
                biggestPot: 0,
                currentStreak: 0
            };
        }
        return stats;
    }
}
exports.GetPlayerStatsHandler = GetPlayerStatsHandler;
