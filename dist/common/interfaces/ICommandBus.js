"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBusError = void 0;
class CommandBusError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CommandBusError';
    }
}
exports.CommandBusError = CommandBusError;
