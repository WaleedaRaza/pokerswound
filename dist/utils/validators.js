"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = assert;
exports.assertNonNull = assertNonNull;
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
function assertNonNull(value, message) {
    if (value === null || value === undefined)
        throw new Error(message);
}
