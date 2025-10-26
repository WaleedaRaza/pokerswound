"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = void 0;
exports.rankToCode = rankToCode;
const rank_1 = require("./rank");
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.code = `${suit}${rankToCode(rank)}`;
    }
    toString() {
        return this.code;
    }
}
exports.Card = Card;
function rankToCode(rank) {
    if (rank >= rank_1.Rank.Two && rank <= rank_1.Rank.Nine)
        return String(rank);
    switch (rank) {
        case rank_1.Rank.Ten:
            return 'T';
        case rank_1.Rank.Jack:
            return 'J';
        case rank_1.Rank.Queen:
            return 'Q';
        case rank_1.Rank.King:
            return 'K';
        case rank_1.Rank.Ace:
            return 'A';
        default:
            return String(rank);
    }
}
