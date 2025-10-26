"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidPatternError = exports.EventHandlerError = exports.EventPublicationError = exports.EventBusError = void 0;
class EventBusError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EventBusError';
    }
}
exports.EventBusError = EventBusError;
class EventPublicationError extends EventBusError {
    constructor(message, event, cause) {
        super(message);
        this.event = event;
        this.cause = cause;
        this.name = 'EventPublicationError';
    }
}
exports.EventPublicationError = EventPublicationError;
class EventHandlerError extends EventBusError {
    constructor(message, event, handlerName, cause) {
        super(message);
        this.event = event;
        this.handlerName = handlerName;
        this.cause = cause;
        this.name = 'EventHandlerError';
    }
}
exports.EventHandlerError = EventHandlerError;
class InvalidPatternError extends EventBusError {
    constructor(pattern) {
        super(`Invalid event pattern: ${pattern}`);
        this.pattern = pattern;
        this.name = 'InvalidPatternError';
    }
}
exports.InvalidPatternError = InvalidPatternError;
