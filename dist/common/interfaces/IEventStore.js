"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueryError = exports.EventAppendError = exports.VersionConflictError = exports.EventStoreError = void 0;
class EventStoreError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EventStoreError';
    }
}
exports.EventStoreError = EventStoreError;
class VersionConflictError extends EventStoreError {
    constructor(aggregateId, expectedVersion, actualVersion) {
        super(`Version conflict for aggregate ${aggregateId}: expected ${expectedVersion}, actual ${actualVersion}`);
        this.aggregateId = aggregateId;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
        this.name = 'VersionConflictError';
    }
}
exports.VersionConflictError = VersionConflictError;
class EventAppendError extends EventStoreError {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'EventAppendError';
    }
}
exports.EventAppendError = EventAppendError;
class EventQueryError extends EventStoreError {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'EventQueryError';
    }
}
exports.EventQueryError = EventQueryError;
