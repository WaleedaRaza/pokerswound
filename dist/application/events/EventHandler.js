"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeEventHandler = exports.MultiEventHandler = exports.PatternEventHandler = exports.LoggingEventHandler = exports.EventHandler = void 0;
class EventHandler {
    constructor(name) {
        this.name = name || this.constructor.name;
    }
    canHandle(eventType) {
        return true;
    }
    getHandlerFunction() {
        return async (event) => {
            if (!this.canHandle(event.eventType)) {
                return;
            }
            try {
                await this.handle(event);
            }
            catch (error) {
                this.onError(event, error);
                throw error;
            }
        };
    }
    onError(event, error) {
        console.error(`[${this.name}] Error handling event ${event.eventType}:`, error);
    }
    log(level, message, data) {
        const prefix = `[${this.name}]`;
        switch (level) {
            case 'debug':
                console.log(`${prefix} ${message}`, data || '');
                break;
            case 'info':
                console.info(`${prefix} ${message}`, data || '');
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`, data || '');
                break;
            case 'error':
                console.error(`${prefix} ${message}`, data || '');
                break;
        }
    }
}
exports.EventHandler = EventHandler;
class LoggingEventHandler extends EventHandler {
    constructor() {
        super('LoggingEventHandler');
    }
    handle(event) {
        this.log('info', `Event: ${event.eventType}`, {
            aggregateId: event.aggregateId,
            version: event.version,
            timestamp: event.timestamp,
        });
    }
}
exports.LoggingEventHandler = LoggingEventHandler;
class PatternEventHandler extends EventHandler {
    constructor(pattern, handleFn, name) {
        super(name || 'PatternEventHandler');
        this.pattern = typeof pattern === 'string'
            ? new RegExp(pattern.replace('*', '.*'))
            : pattern;
        this.handleFn = handleFn;
    }
    canHandle(eventType) {
        return this.pattern.test(eventType);
    }
    async handle(event) {
        await this.handleFn(event);
    }
}
exports.PatternEventHandler = PatternEventHandler;
class MultiEventHandler extends EventHandler {
    constructor(name) {
        super(name || 'MultiEventHandler');
        this.handlers = new Map();
    }
    on(eventType, handler) {
        this.handlers.set(eventType, handler);
        return this;
    }
    canHandle(eventType) {
        return this.handlers.has(eventType);
    }
    async handle(event) {
        const handler = this.handlers.get(event.eventType);
        if (handler) {
            await handler(event);
        }
    }
}
exports.MultiEventHandler = MultiEventHandler;
class CompositeEventHandler extends EventHandler {
    constructor(subHandlers, name) {
        super(name || 'CompositeEventHandler');
        this.subHandlers = subHandlers;
    }
    canHandle(eventType) {
        return this.subHandlers.some(h => h.canHandle(eventType));
    }
    async handle(event) {
        for (const handler of this.subHandlers) {
            if (handler.canHandle(event.eventType)) {
                await handler.handle(event);
            }
        }
    }
}
exports.CompositeEventHandler = CompositeEventHandler;
