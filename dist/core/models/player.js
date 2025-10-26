"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerModel = void 0;
class PlayerModel {
    get holeCards() {
        return this.hole;
    }
    set holeCards(value) {
        this.hole = value;
    }
    constructor(params) {
        this.hasFolded = false;
        this.isAllIn = false;
        this.isActive = true;
        this.hasLeft = false;
        this.betThisStreet = 0;
        this.uuid = params.uuid;
        this.name = params.name;
        this.stack = params.stack;
        this.seatIndex = params.seatIndex ?? 0;
    }
    addHole(cards) {
        if (this.hole && this.hole.length > 0)
            throw new Error('Hole cards already set');
        if (cards.length !== 2)
            throw new Error('Hole must be exactly 2 cards');
        this.hole = cards;
    }
    collectBet(amount) {
        const n = amount;
        if (n < 0)
            throw new Error('Bet amount must be >= 0');
        const stackNum = this.stack;
        if (stackNum < n)
            throw new Error('Insufficient stack');
        this.stack = (stackNum - n);
        this.betThisStreet = (this.betThisStreet + n);
        if (this.stack === 0)
            this.isAllIn = true;
    }
    appendChips(amount) {
        const n = amount;
        if (n < 0)
            throw new Error('Append amount must be >= 0');
        this.stack = (this.stack + n);
    }
    fold() {
        this.hasFolded = true;
    }
    allIn() {
        const stackNum = this.stack;
        if (stackNum > 0) {
            this.betThisStreet = (this.betThisStreet + stackNum);
            this.stack = 0;
        }
        this.isAllIn = true;
    }
    resetForNewStreet() {
        this.betThisStreet = 0;
    }
    resetForNewHand() {
        this.hasFolded = false;
        this.isAllIn = false;
        this.betThisStreet = 0;
        this.hole = undefined;
    }
    addHoleCard(card) {
        if (!this.hole)
            this.hole = [];
        this.hole.push(card);
    }
    setStack(amount) {
        this.stack = amount;
    }
    toSnapshot() {
        return {
            uuid: this.uuid,
            name: this.name,
            stack: this.stack,
            seatIndex: this.seatIndex,
            hasFolded: this.hasFolded,
            isAllIn: this.isAllIn,
            isActive: this.isActive,
            hasLeft: this.hasLeft,
            betThisStreet: this.betThisStreet,
            hole: this.hole
        };
    }
    static fromSnapshot(data) {
        const player = new PlayerModel({
            uuid: data.uuid,
            name: data.name,
            stack: data.stack,
            seatIndex: data.seatIndex
        });
        player.hasFolded = data.hasFolded || false;
        player.isAllIn = data.isAllIn || false;
        player.isActive = data.isActive !== undefined ? data.isActive : true;
        player.hasLeft = data.hasLeft || false;
        player.betThisStreet = data.betThisStreet || 0;
        player.hole = data.hole;
        return player;
    }
}
exports.PlayerModel = PlayerModel;
