"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deck = void 0;
const card_1 = require("./card");
const suit_1 = require("./suit");
const rank_1 = require("./rank");
class Deck {
    constructor(rng = Math.random) {
        this.rng = rng;
        this.original = buildOrderedDeck();
        this.cards = [...this.original];
    }
    shuffle() {
        fisherYates(this.cards, this.rng);
    }
    drawOne() {
        if (this.cards.length === 0)
            throw new Error('Deck is empty');
        return this.cards.pop();
    }
    drawMany(count) {
        if (count < 0)
            throw new Error('Count must be >= 0');
        if (this.cards.length < count)
            throw new Error('Not enough cards');
        const out = new Array(count);
        for (let i = 0; i < count; i += 1)
            out[i] = this.drawOne();
        return out;
    }
    size() {
        return this.cards.length;
    }
    restore() {
        this.cards = [...this.original];
    }
}
exports.Deck = Deck;
function buildOrderedDeck() {
    const deck = [];
    for (const suit of suit_1.ALL_SUITS) {
        for (const rank of rank_1.ALL_RANKS_ASC) {
            deck.push(new card_1.Card(suit, rank));
        }
    }
    return deck;
}
function fisherYates(arr, rng) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}
