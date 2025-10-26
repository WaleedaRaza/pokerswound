"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = exports.ActionType = exports.Street = void 0;
var Street;
(function (Street) {
    Street["Preflop"] = "PREFLOP";
    Street["Flop"] = "FLOP";
    Street["Turn"] = "TURN";
    Street["River"] = "RIVER";
    Street["Showdown"] = "SHOWDOWN";
})(Street || (exports.Street = Street = {}));
var ActionType;
(function (ActionType) {
    ActionType["Fold"] = "FOLD";
    ActionType["Check"] = "CHECK";
    ActionType["Call"] = "CALL";
    ActionType["Bet"] = "BET";
    ActionType["Raise"] = "RAISE";
    ActionType["AllIn"] = "ALL_IN";
    ActionType["SmallBlind"] = "SMALL_BLIND";
    ActionType["BigBlind"] = "BIG_BLIND";
    ActionType["Ante"] = "ANTE";
})(ActionType || (exports.ActionType = ActionType = {}));
var Position;
(function (Position) {
    Position["SB"] = "SB";
    Position["BB"] = "BB";
    Position["UTG"] = "UTG";
    Position["UTG1"] = "UTG1";
    Position["MP"] = "MP";
    Position["HJ"] = "HJ";
    Position["CO"] = "CO";
    Position["BTN"] = "BTN";
})(Position || (exports.Position = Position = {}));
