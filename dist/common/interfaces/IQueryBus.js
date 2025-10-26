"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBusError = void 0;
class QueryBusError extends Error {
    constructor(message) {
        super(message);
        this.name = 'QueryBusError';
    }
}
exports.QueryBusError = QueryBusError;
