"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBus = void 0;
const IQueryBus_1 = require("../../common/interfaces/IQueryBus");
class QueryBus {
    constructor() {
        this.handlers = new Map();
    }
    register(queryName, handler) {
        if (this.handlers.has(queryName)) {
            throw new IQueryBus_1.QueryBusError(`Handler already registered for query: ${queryName}`);
        }
        this.handlers.set(queryName, handler);
    }
    async execute(query) {
        const handler = this.handlers.get(query.queryName);
        if (!handler) {
            throw new IQueryBus_1.QueryBusError(`No handler registered for query: ${query.queryName}`);
        }
        try {
            return await handler.handle(query);
        }
        catch (error) {
            throw new IQueryBus_1.QueryBusError(`Query execution failed: ${error.message}`);
        }
    }
}
exports.QueryBus = QueryBus;
