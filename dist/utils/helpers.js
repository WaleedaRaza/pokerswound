"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoNow = isoNow;
exports.clamp = clamp;
function isoNow() {
    return new Date().toISOString();
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
