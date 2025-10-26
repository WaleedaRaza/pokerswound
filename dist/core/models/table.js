"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableModel = void 0;
const card_1 = require("../card");
class TableModel {
    get dealerPosition() {
        return this.dealerButton;
    }
    set dealerPosition(value) {
        this.dealerButton = value;
    }
    constructor(deck) {
        this.dealerButton = 0;
        this.smallBlindPosition = 0;
        this.bigBlindPosition = 0;
        this.community = [];
        this.seats = [];
        this.deck = deck ?? new card_1.Deck();
        this.seats = [];
    }
    reset() {
        this.community = [];
        this.deck.restore();
    }
    initSeats(size) {
        if (size <= 0)
            throw new Error('Seat size must be > 0');
        this.seats = new Array(size).fill(null);
    }
    seatPlayer(player) {
        if (!this.seats.length)
            this.initSeats(10);
        const index = player.seatIndex;
        if (index < 0 || index >= this.seats.length)
            throw new Error('Invalid seat index');
        if (this.seats[index])
            throw new Error('Seat already occupied');
        if (this.seats.includes(player.uuid))
            throw new Error('Player already seated');
        this.seats[index] = player.uuid;
    }
    unseatPlayer(player) {
        const idx = this.seats.findIndex((s) => s === player.uuid);
        if (idx >= 0)
            this.seats[idx] = null;
    }
    rotateDealer() {
        if (!this.seats.length)
            throw new Error('Seats not initialized');
        const n = this.seats.length;
        const current = this.dealerButton;
        this.dealerButton = ((current + 1) % n);
    }
    setBlinds(sbIndex, bbIndex) {
        this.smallBlindPosition = sbIndex;
        this.bigBlindPosition = bbIndex;
    }
    addCommunity(card) {
        if (this.community.length >= 5)
            throw new Error('Community already full');
        this.community.push(card);
    }
}
exports.TableModel = TableModel;
