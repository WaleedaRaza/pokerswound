"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateMachine = void 0;
const common_types_1 = require("../../types/common.types");
const game_state_1 = require("../models/game-state");
const player_1 = require("../models/player");
const deck_1 = require("../card/deck");
const hand_evaluator_1 = require("./hand-evaluator");
class GameStateMachine {
    constructor(randomFn = Math.random, eventBus) {
        this.eventVersion = new Map();
        this.randomFn = randomFn;
        this.eventBus = eventBus;
    }
    processAction(currentState, action) {
        try {
            const newState = this.cloneState(currentState);
            const events = [];
            let result;
            switch (action.type) {
                case 'START_GAME':
                    result = this.handleStartGame(newState, events);
                    break;
                case 'START_HAND':
                    result = this.handleStartHand(newState, events);
                    break;
                case 'PLAYER_ACTION':
                    if (!action.playerId || !action.actionType) {
                        throw new Error('Player action requires playerId and actionType');
                    }
                    result = this.handlePlayerAction(newState, action.playerId, action.actionType, action.amount, events);
                    break;
                case 'ADVANCE_STREET':
                    result = this.handleAdvanceStreet(newState, events);
                    break;
                case 'END_HAND':
                    result = this.handleEndHand(newState, events);
                    break;
                case 'PAUSE_GAME':
                    result = this.handlePauseGame(newState, events);
                    break;
                case 'RESUME_GAME':
                    result = this.handleResumeGame(newState, events);
                    break;
                case 'PLAYER_JOIN':
                    if (!action.playerId || !action.playerName || action.seatNumber === undefined || !action.buyIn) {
                        throw new Error('Player join requires playerId, playerName, seatNumber, and buyIn');
                    }
                    result = this.handlePlayerJoin(newState, action.playerId, action.playerName, action.seatNumber, action.buyIn, events);
                    break;
                case 'PLAYER_LEAVE':
                    if (!action.playerId) {
                        throw new Error('Player leave requires playerId');
                    }
                    result = this.handlePlayerLeave(newState, action.playerId, events);
                    break;
                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }
            if (this.eventBus && result.success) {
                for (const event of result.events) {
                    this.publishEvent(result.newState.id, event);
                }
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                newState: currentState,
                events: [],
                error: error.message
            };
        }
    }
    async publishEvent(gameId, gameEvent) {
        if (!this.eventBus) {
            return;
        }
        const currentVersion = this.eventVersion.get(gameId) || 0;
        const newVersion = currentVersion + 1;
        this.eventVersion.set(gameId, newVersion);
        const domainEvent = {
            eventType: `game.${gameEvent.type.toLowerCase()}`,
            aggregateType: 'Game',
            aggregateId: gameId,
            eventData: gameEvent.data,
            version: newVersion,
            userId: gameEvent.data.userId,
            metadata: {
                gameEventType: gameEvent.type,
                originalTimestamp: gameEvent.timestamp
            }
        };
        try {
            await this.eventBus.publish(domainEvent);
        }
        catch (error) {
            console.error(`Failed to publish event ${gameEvent.type}:`, error);
        }
    }
    handleStartGame(state, events) {
        if (state.status !== game_state_1.GameStatus.WAITING) {
            throw new Error('Game can only be started from WAITING status');
        }
        if (!state.canStartGame()) {
            throw new Error('Cannot start game: insufficient players');
        }
        state.status = game_state_1.GameStatus.DEALING;
        state.updateTimestamp();
        events.push({
            type: 'GAME_STARTED',
            data: {
                gameId: state.id,
                playerCount: state.getActivePlayers().length
            },
            timestamp: Date.now()
        });
        return this.handleStartHand(state, events);
    }
    handleStartHand(state, events) {
        if (!state.canStartHand()) {
            throw new Error('Cannot start hand: insufficient players or invalid state');
        }
        state.handState.handNumber++;
        this.setPositions(state);
        this.prepareDeck(state);
        this.dealHoleCards(state);
        this.postBlinds(state);
        this.initializeBettingRound(state);
        state.status = game_state_1.GameStatus.PREFLOP;
        state.currentStreet = common_types_1.Street.Preflop;
        state.toAct = this.getFirstPlayerToAct(state);
        state.timing.handStartTime = Date.now();
        state.timing.streetStartTime = Date.now();
        state.timing.actionStartTime = Date.now();
        state.updateTimestamp();
        events.push({
            type: 'HAND_STARTED',
            data: {
                gameId: state.id,
                handNumber: state.handState.handNumber,
                dealerPosition: state.handState.dealerPosition,
                smallBlind: state.configuration.smallBlind,
                bigBlind: state.configuration.bigBlind
            },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    handlePlayerAction(state, playerId, actionType, amount, events) {
        if (state.toAct !== playerId) {
            throw new Error('Not your turn to act');
        }
        const player = state.getPlayer(playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        this.processPlayerAction(state, player, actionType, amount);
        state.actionHistory.push({
            player: playerId,
            action: actionType,
            amount,
            timestamp: Date.now(),
            street: state.currentStreet,
            handNumber: state.handState.handNumber
        });
        state.bettingRound.actionsThisRound++;
        events.push({
            type: 'PLAYER_ACTION',
            playerId,
            data: {
                action: actionType,
                amount,
                street: state.currentStreet,
                handNumber: state.handState.handNumber
            },
            timestamp: Date.now()
        });
        const bettingComplete = state.isBettingRoundComplete();
        console.log(`🎯 Betting round complete check: ${bettingComplete}`);
        if (bettingComplete) {
            const activePlayers = state.getActivePlayers();
            console.log(`  Active players: ${activePlayers.length}`);
            if (activePlayers.length <= 1) {
                console.log(`🏆 Only ${activePlayers.length} active player(s), ending hand`);
                return this.handleEndHand(state, events);
            }
            const allInCount = activePlayers.filter(p => p.isAllIn).length;
            console.log(`  All-in players: ${allInCount}/${activePlayers.length}`);
            if (allInCount === activePlayers.length) {
                console.log(`🃏 ALL PLAYERS ALL-IN - Running out remaining streets to showdown`);
                return this.handleRunOutAllStreets(state, events);
            }
            console.log(`✅ Advancing to next street from ${state.currentStreet}`);
            return this.handleAdvanceStreet(state, events);
        }
        else {
            state.toAct = state.getNextPlayerToAct(playerId);
            state.timing.actionStartTime = Date.now();
            console.log(`  Next to act: ${state.toAct}`);
        }
        state.updateTimestamp();
        return {
            success: true,
            newState: state,
            events
        };
    }
    handleRunOutAllStreets(state, events) {
        console.log('🃏 RUNNING OUT ALL STREETS (all players all-in)');
        switch (state.currentStreet) {
            case common_types_1.Street.Preflop:
                console.log('  Dealing: Flop, Turn, River');
                this.resetBettingRound(state);
                this.dealFlop(state);
                state.currentStreet = common_types_1.Street.Flop;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.Flop, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                this.resetBettingRound(state);
                this.dealTurn(state);
                state.currentStreet = common_types_1.Street.Turn;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.Turn, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                this.resetBettingRound(state);
                this.dealRiver(state);
                state.currentStreet = common_types_1.Street.River;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.River, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                break;
            case common_types_1.Street.Flop:
                console.log('  Dealing: Turn, River');
                this.resetBettingRound(state);
                this.dealTurn(state);
                state.currentStreet = common_types_1.Street.Turn;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.Turn, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                this.resetBettingRound(state);
                this.dealRiver(state);
                state.currentStreet = common_types_1.Street.River;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.River, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                break;
            case common_types_1.Street.Turn:
                console.log('  Dealing: River');
                this.resetBettingRound(state);
                this.dealRiver(state);
                state.currentStreet = common_types_1.Street.River;
                events.push({
                    type: 'STREET_ADVANCED',
                    data: { street: common_types_1.Street.River, communityCards: state.handState.communityCards.map(c => c.toString()) },
                    timestamp: Date.now()
                });
                break;
            case common_types_1.Street.River:
                console.log('  Already on river, going to showdown');
                break;
            default:
                throw new Error(`Cannot run out streets from: ${state.currentStreet}`);
        }
        console.log(`  Final board: ${state.handState.communityCards.map(c => c.toString()).join(', ')}`);
        console.log(`  Total community cards: ${state.handState.communityCards.length}`);
        console.log(`  Total pot before showdown: ${state.pot.totalPot}`);
        console.log('  Player hole cards:');
        for (const player of state.players.values()) {
            if (!player.hasFolded) {
                console.log(`    ${player.name}: ${player.hole ? player.hole.map(c => c.toString()).join(', ') : 'NO CARDS'}`);
            }
        }
        state.currentStreet = common_types_1.Street.Showdown;
        state.status = game_state_1.GameStatus.SHOWDOWN;
        state.toAct = null;
        return this.handleEndHand(state, events);
    }
    handleAdvanceStreet(state, events) {
        console.log('🔄 ADVANCING STREET:');
        console.log(`  From: ${state.currentStreet}`);
        console.log(`  Current bet BEFORE reset: ${state.bettingRound.currentBet}`);
        console.log('  Player states BEFORE reset:');
        for (const player of state.players.values()) {
            console.log(`    ${player.name}: bet=${player.betThisStreet}, stack=${player.stack}, allIn=${player.isAllIn}`);
        }
        this.resetBettingRound(state);
        console.log('  ✅ Betting round reset complete');
        switch (state.currentStreet) {
            case common_types_1.Street.Preflop:
                this.dealFlop(state);
                state.currentStreet = common_types_1.Street.Flop;
                state.status = game_state_1.GameStatus.FLOP;
                break;
            case common_types_1.Street.Flop:
                this.dealTurn(state);
                state.currentStreet = common_types_1.Street.Turn;
                state.status = game_state_1.GameStatus.TURN;
                break;
            case common_types_1.Street.Turn:
                this.dealRiver(state);
                state.currentStreet = common_types_1.Street.River;
                state.status = game_state_1.GameStatus.RIVER;
                break;
            case common_types_1.Street.River:
                state.currentStreet = common_types_1.Street.Showdown;
                state.status = game_state_1.GameStatus.SHOWDOWN;
                return this.handleEndHand(state, events);
            default:
                throw new Error(`Cannot advance from street: ${state.currentStreet}`);
        }
        state.toAct = this.getFirstPlayerToActPostFlop(state);
        state.timing.streetStartTime = Date.now();
        state.timing.actionStartTime = Date.now();
        state.updateTimestamp();
        events.push({
            type: 'STREET_ADVANCED',
            data: {
                street: state.currentStreet,
                communityCards: state.handState.communityCards.map(c => c.toString()),
                handNumber: state.handState.handNumber
            },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    handleEndHand(state, events) {
        console.log('🏆 ENDING HAND:');
        console.log(`  Total pot: ${state.pot.totalPot}`);
        console.log('  Player states before showdown:');
        for (const player of state.players.values()) {
            console.log(`    ${player.name}: stack=${player.stack}, bet=${player.betThisStreet}, allIn=${player.isAllIn}, folded=${player.hasFolded}`);
        }
        const preDistributionSnapshot = {
            potAmount: state.pot.totalPot,
            players: Array.from(state.players.values()).map(p => ({
                id: p.uuid,
                name: p.name,
                stack: p.stack,
                isAllIn: p.isAllIn,
                betThisStreet: p.betThisStreet,
                hasFolded: p.hasFolded,
                seatIndex: p.seatIndex
            })),
            communityCards: state.handState.communityCards.map(c => c.toString()),
            currentStreet: state.currentStreet
        };
        const wasAllIn = Array.from(state.players.values()).some(p => p.isAllIn && !p.hasFolded);
        const results = this.determineWinners(state);
        console.log('  Winners determined:', results.length);
        for (const result of results) {
            console.log(`    Winner: playerId=${result.playerId}, amount=${result.amount}, rank=${result.handRank}`);
        }
        this.distributePot(state, results);
        console.log('  Player stacks AFTER distribution:');
        for (const player of state.players.values()) {
            console.log(`    ${player.name}: stack=${player.stack}`);
        }
        this.cleanupHand(state);
        state.status = game_state_1.GameStatus.COMPLETED;
        state.toAct = null;
        state.updateTimestamp();
        events.push({
            type: 'HAND_COMPLETED',
            data: {
                handNumber: state.handState.handNumber,
                winners: results.map(r => ({
                    playerId: r.playerId,
                    amount: r.amount,
                    handRank: r.handRank
                })),
                totalPot: state.pot.totalPot,
                preDistributionSnapshot,
                wasAllIn
            },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    handlePauseGame(state, events) {
        if (state.status === game_state_1.GameStatus.PAUSED) {
            throw new Error('Game is already paused');
        }
        state.status = game_state_1.GameStatus.PAUSED;
        state.updateTimestamp();
        events.push({
            type: 'GAME_PAUSED',
            data: { gameId: state.id },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    handleResumeGame(state, events) {
        if (state.status !== game_state_1.GameStatus.PAUSED) {
            throw new Error('Game is not paused');
        }
        switch (state.currentStreet) {
            case common_types_1.Street.Preflop:
                state.status = game_state_1.GameStatus.PREFLOP;
                break;
            case common_types_1.Street.Flop:
                state.status = game_state_1.GameStatus.FLOP;
                break;
            case common_types_1.Street.Turn:
                state.status = game_state_1.GameStatus.TURN;
                break;
            case common_types_1.Street.River:
                state.status = game_state_1.GameStatus.RIVER;
                break;
            case common_types_1.Street.Showdown:
                state.status = game_state_1.GameStatus.SHOWDOWN;
                break;
            default:
                state.status = game_state_1.GameStatus.WAITING;
        }
        state.updateTimestamp();
        events.push({
            type: 'GAME_RESUMED',
            data: { gameId: state.id },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    cloneState(state) {
        return game_state_1.GameStateModel.fromSnapshot(state.toSnapshot());
    }
    setPositions(state) {
        const activePlayers = state.getActivePlayers();
        console.log(`🎯 Setting positions for ${activePlayers.length} players`);
        if (state.handState.handNumber <= 1) {
            state.handState.dealerPosition = (activePlayers[0]?.seatIndex || 0);
        }
        else {
            state.handState.dealerPosition = this.getNextDealerPosition(state);
        }
        if (activePlayers.length === 2) {
            state.handState.smallBlindPosition = state.handState.dealerPosition;
            state.handState.bigBlindPosition = this.getNextSeatIndex(state.handState.dealerPosition, activePlayers);
        }
        else {
            state.handState.smallBlindPosition = this.getNextSeatIndex(state.handState.dealerPosition, activePlayers);
            state.handState.bigBlindPosition = this.getNextSeatIndex(state.handState.smallBlindPosition, activePlayers);
        }
        console.log(`🎯 Dealer: ${state.handState.dealerPosition}, SB: ${state.handState.smallBlindPosition}, BB: ${state.handState.bigBlindPosition}`);
    }
    prepareDeck(state) {
        const deck = new deck_1.Deck(this.randomFn);
        deck.shuffle();
        state.handState.deck = Array.from({ length: deck.size() }, () => deck.drawOne());
        state.handState.deckSeed = `${Date.now()}-${Math.random()}`;
    }
    dealHoleCards(state) {
        const activePlayers = state.getActivePlayers();
        console.log(`🃏 Dealing hole cards to ${activePlayers.length} players`);
        for (let round = 0; round < 2; round++) {
            for (const player of activePlayers) {
                if (state.handState.deck.length > 0) {
                    const card = state.handState.deck.pop();
                    player.addHoleCard(card);
                    console.log(`📤 Dealt ${card.toString()} to ${player.name} (round ${round + 1})`);
                }
            }
        }
        for (const player of activePlayers) {
            if (player.hole && player.hole.length === 2) {
                console.log(`🎴 ${player.name} has: ${player.hole.map(c => c.toString()).join(', ')}`);
            }
        }
    }
    postBlinds(state) {
        const activePlayers = state.getActivePlayers();
        const sbPosition = state.handState.smallBlindPosition;
        const bbPosition = state.handState.bigBlindPosition;
        const sbPlayer = activePlayers.find(p => p.seatIndex === sbPosition);
        const bbPlayer = activePlayers.find(p => p.seatIndex === bbPosition);
        if (sbPlayer) {
            const sbAmount = Math.min(state.configuration.smallBlind, sbPlayer.stack);
            sbPlayer.collectBet(sbAmount);
            state.pot.totalPot = (state.pot.totalPot + sbAmount);
            console.log(`✅ Small blind posted: ${sbPlayer.name} - $${sbAmount}`);
        }
        if (bbPlayer) {
            const bbAmount = Math.min(state.configuration.bigBlind, bbPlayer.stack);
            bbPlayer.collectBet(bbAmount);
            state.pot.totalPot = (state.pot.totalPot + bbAmount);
            console.log(`✅ Big blind posted: ${bbPlayer.name} - $${bbAmount}`);
        }
    }
    initializeBettingRound(state) {
        state.bettingRound = {
            currentBet: state.configuration.bigBlind,
            minRaise: state.configuration.bigBlind,
            lastRaiseAmount: state.configuration.bigBlind,
            isComplete: false,
            actionsThisRound: 0
        };
    }
    resetBettingRound(state) {
        state.bettingRound = {
            currentBet: 0,
            minRaise: state.configuration.bigBlind,
            lastRaiseAmount: 0,
            isComplete: false,
            actionsThisRound: 0
        };
        for (const player of state.players.values()) {
            player.resetForNewStreet();
        }
    }
    getFirstPlayerToAct(state) {
        const activePlayers = state.getActivePlayers();
        const bbPosition = state.handState.bigBlindPosition;
        return this.getNextPlayerUUID(bbPosition, activePlayers);
    }
    getFirstPlayerToActPostFlop(state) {
        const activePlayers = state.getActivePlayers();
        const sbPosition = state.handState.smallBlindPosition;
        const sbPlayer = activePlayers.find(p => p.seatIndex === sbPosition);
        if (sbPlayer && !sbPlayer.hasFolded && !sbPlayer.isAllIn) {
            return sbPlayer.uuid;
        }
        return this.getNextPlayerUUID(sbPosition, activePlayers);
    }
    dealFlop(state) {
        if (state.handState.deck.length >= 4) {
            state.handState.deck.pop();
            for (let i = 0; i < 3; i++) {
                state.handState.communityCards.push(state.handState.deck.pop());
            }
        }
    }
    dealTurn(state) {
        if (state.handState.deck.length >= 2) {
            state.handState.deck.pop();
            state.handState.communityCards.push(state.handState.deck.pop());
        }
    }
    dealRiver(state) {
        if (state.handState.deck.length >= 2) {
            state.handState.deck.pop();
            state.handState.communityCards.push(state.handState.deck.pop());
        }
    }
    processPlayerAction(state, player, actionType, amount) {
        const currentBet = state.bettingRound.currentBet;
        const playerBetThisStreet = player.betThisStreet;
        switch (actionType) {
            case common_types_1.ActionType.Fold:
                player.fold();
                console.log(`✅ ${player.name} folded`);
                break;
            case common_types_1.ActionType.Check:
                if (currentBet > playerBetThisStreet) {
                    throw new Error('Cannot check when facing a bet');
                }
                console.log(`✅ ${player.name} checked`);
                break;
            case common_types_1.ActionType.Call:
                const callAmount = currentBet - playerBetThisStreet;
                const actualCallAmount = Math.min(callAmount, player.stack);
                player.collectBet(actualCallAmount);
                state.pot.totalPot = (state.pot.totalPot + actualCallAmount);
                console.log(`✅ ${player.name} called $${actualCallAmount}`);
                if (actualCallAmount === player.stack) {
                    player.allIn();
                    console.log(`✅ ${player.name} is all-in`);
                }
                break;
            case common_types_1.ActionType.Bet:
            case common_types_1.ActionType.Raise:
                if (!amount) {
                    throw new Error('Bet/Raise requires an amount');
                }
                const betAmount = amount;
                const totalBetThisStreet = playerBetThisStreet + betAmount;
                if (totalBetThisStreet <= currentBet) {
                    throw new Error('Bet/Raise must be higher than current bet');
                }
                const actualBetAmount = Math.min(betAmount, player.stack);
                player.collectBet(actualBetAmount);
                state.pot.totalPot = (state.pot.totalPot + actualBetAmount);
                state.bettingRound.currentBet = (playerBetThisStreet + actualBetAmount);
                state.bettingRound.lastRaiseAmount = actualBetAmount;
                state.bettingRound.lastAggressor = player.uuid;
                console.log(`✅ ${player.name} ${actionType.toLowerCase()}ed $${actualBetAmount} (total bet: $${playerBetThisStreet + actualBetAmount})`);
                if (actualBetAmount === player.stack) {
                    player.allIn();
                    console.log(`✅ ${player.name} is all-in`);
                }
                break;
            case common_types_1.ActionType.AllIn:
                const allInAmount = player.stack;
                player.collectBet(allInAmount);
                player.allIn();
                state.pot.totalPot = (state.pot.totalPot + allInAmount);
                const newTotalBet = playerBetThisStreet + allInAmount;
                if (newTotalBet > currentBet) {
                    state.bettingRound.currentBet = newTotalBet;
                    state.bettingRound.lastRaiseAmount = (newTotalBet - currentBet);
                    state.bettingRound.lastAggressor = player.uuid;
                }
                console.log(`✅ ${player.name} went all-in for $${allInAmount}`);
                break;
        }
    }
    determineWinners(state) {
        const activePlayers = state.getActivePlayers();
        if (activePlayers.length === 1) {
            return [{
                    playerId: activePlayers[0].uuid,
                    amount: state.pot.totalPot,
                    handRank: 'Winner by default',
                    handDescription: 'Won by elimination'
                }];
        }
        if (state.handState.communityCards.length !== 5) {
            const potPerPlayer = state.pot.totalPot / activePlayers.length;
            return activePlayers.map(player => ({
                playerId: player.uuid,
                amount: potPerPlayer,
                handRank: 'Incomplete',
                handDescription: 'Hand incomplete - community cards not fully dealt'
            }));
        }
        const handEvaluator = new hand_evaluator_1.HandEvaluator();
        const playerHands = [];
        for (const player of activePlayers) {
            if (player.hole && player.hole.length === 2) {
                try {
                    const handRank = handEvaluator.evaluateHand(player.hole, state.handState.communityCards);
                    const description = this.getHandDescription(handRank);
                    playerHands.push({
                        playerId: player.uuid,
                        playerName: player.name,
                        handRank,
                        description
                    });
                    console.log(`🎯 ${player.name}: ${description} (strength: ${handRank.ranking})`);
                }
                catch (error) {
                    console.error(`❌ Error evaluating ${player.name}'s hand:`, error);
                    playerHands.push({
                        playerId: player.uuid,
                        playerName: player.name,
                        handRank: { ranking: hand_evaluator_1.HandRanking.HighCard, primaryRank: 2, cards: [] },
                        description: 'High Card (evaluation error)'
                    });
                }
            }
            else {
                console.error(`❌ ${player.name} has invalid hole cards:`, player.hole);
                playerHands.push({
                    playerId: player.uuid,
                    playerName: player.name,
                    handRank: { ranking: hand_evaluator_1.HandRanking.HighCard, primaryRank: 2, cards: [] },
                    description: 'High Card (no hole cards)'
                });
            }
        }
        playerHands.sort((a, b) => handEvaluator.compareHands(b.handRank, a.handRank));
        const bestHand = playerHands[0];
        const winners = playerHands.filter(hand => handEvaluator.compareHands(hand.handRank, bestHand.handRank) === 0);
        const totalPot = state.pot.totalPot;
        const winningsPerPlayer = totalPot / winners.length;
        console.log(`🏆 ${winners.length} winner(s) split $${totalPot}:`);
        return winners.map(winner => {
            console.log(`  🥇 ${winner.playerName}: ${winner.description} - wins $${winningsPerPlayer}`);
            return {
                playerId: winner.playerId,
                amount: winningsPerPlayer,
                handRank: winner.handRank.ranking,
                handDescription: winner.description
            };
        });
    }
    getHandDescription(handRank) {
        const handNames = {
            [hand_evaluator_1.HandRanking.HighCard]: 'High Card',
            [hand_evaluator_1.HandRanking.Pair]: 'Pair',
            [hand_evaluator_1.HandRanking.TwoPair]: 'Two Pair',
            [hand_evaluator_1.HandRanking.ThreeOfAKind]: 'Three of a Kind',
            [hand_evaluator_1.HandRanking.Straight]: 'Straight',
            [hand_evaluator_1.HandRanking.Flush]: 'Flush',
            [hand_evaluator_1.HandRanking.FullHouse]: 'Full House',
            [hand_evaluator_1.HandRanking.FourOfAKind]: 'Four of a Kind',
            [hand_evaluator_1.HandRanking.StraightFlush]: 'Straight Flush',
            [hand_evaluator_1.HandRanking.RoyalFlush]: 'Royal Flush'
        };
        const baseName = handNames[handRank.ranking] || 'Unknown';
        if (handRank.ranking === hand_evaluator_1.HandRanking.Pair && handRank.primaryRank) {
            return `${baseName} of ${this.getRankName(handRank.primaryRank)}s`;
        }
        if (handRank.ranking === hand_evaluator_1.HandRanking.ThreeOfAKind && handRank.primaryRank) {
            return `${baseName} - ${this.getRankName(handRank.primaryRank)}s`;
        }
        if (handRank.ranking === hand_evaluator_1.HandRanking.FourOfAKind && handRank.primaryRank) {
            return `${baseName} - ${this.getRankName(handRank.primaryRank)}s`;
        }
        if (handRank.ranking === hand_evaluator_1.HandRanking.HighCard && handRank.primaryRank) {
            return `${baseName} - ${this.getRankName(handRank.primaryRank)} high`;
        }
        return baseName;
    }
    getRankName(rankValue) {
        const names = {
            2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
            8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
        };
        return names[rankValue] || 'Unknown';
    }
    distributePot(state, results) {
        for (const result of results) {
            const player = state.getPlayer(result.playerId);
            if (player) {
                const currentStack = player.stack;
                const winnings = result.amount;
                player.setStack((currentStack + winnings));
                console.log(`✅ ${player.name} wins $${winnings} (new stack: $${currentStack + winnings})`);
            }
        }
        state.pot.totalPot = 0;
        state.pot.mainPot = 0;
        state.pot.sidePots = [];
    }
    cleanupHand(state) {
        for (const player of state.players.values()) {
            player.resetForNewHand();
        }
        state.handState.communityCards = [];
    }
    getNextDealerPosition(state) {
        const activePlayers = state.getActivePlayers();
        if (activePlayers.length === 0)
            return 0;
        const currentDealer = state.handState.dealerPosition;
        return this.getNextSeatIndex(currentDealer, activePlayers);
    }
    getNextSeatIndex(currentSeatIndex, activePlayers) {
        const sortedPlayers = activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
        const currentIndex = sortedPlayers.findIndex(p => p.seatIndex === currentSeatIndex);
        const nextIndex = (currentIndex + 1) % sortedPlayers.length;
        return sortedPlayers[nextIndex]?.seatIndex || 0;
    }
    getNextPlayerUUID(currentSeatIndex, activePlayers) {
        const sortedPlayers = activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
        const currentIndex = sortedPlayers.findIndex(p => p.seatIndex === currentSeatIndex);
        const nextIndex = (currentIndex + 1) % sortedPlayers.length;
        return sortedPlayers[nextIndex]?.uuid || null;
    }
    handlePlayerJoin(state, playerId, playerName, seatNumber, buyIn, events) {
        const existingPlayers = state.table.seats.filter(s => s !== null);
        if (existingPlayers.length >= state.configuration.maxPlayers) {
            return {
                success: false,
                newState: state,
                events,
                error: 'Table is full'
            };
        }
        if (state.table.seats[seatNumber] !== null) {
            return {
                success: false,
                newState: state,
                events,
                error: 'Seat is already taken'
            };
        }
        const player = new player_1.PlayerModel({
            uuid: playerId,
            name: playerName,
            stack: buyIn,
            seatIndex: seatNumber
        });
        state.table.seats[seatNumber] = playerId;
        state.players.set(playerId, player);
        state.updateTimestamp();
        events.push({
            type: 'PLAYER_JOINED',
            data: {
                gameId: state.id,
                playerId,
                playerName,
                seatNumber,
                buyIn
            },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
    handlePlayerLeave(state, playerId, events) {
        const player = state.players.get(playerId);
        if (!player) {
            return {
                success: false,
                newState: state,
                events,
                error: 'Player not found'
            };
        }
        if (player.seatIndex !== undefined) {
            state.table.seats[player.seatIndex] = null;
        }
        state.players.delete(playerId);
        state.updateTimestamp();
        events.push({
            type: 'PLAYER_LEFT',
            data: {
                gameId: state.id,
                playerId,
                stack: player.stack
            },
            timestamp: Date.now()
        });
        return {
            success: true,
            newState: state,
            events
        };
    }
}
exports.GameStateMachine = GameStateMachine;
