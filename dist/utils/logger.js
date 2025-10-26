"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogCategory = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["SUCCESS"] = 2] = "SUCCESS";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["CRITICAL"] = 5] = "CRITICAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogCategory;
(function (LogCategory) {
    LogCategory["STARTUP"] = "STARTUP";
    LogCategory["DATABASE"] = "DATABASE";
    LogCategory["MIGRATION"] = "MIGRATION";
    LogCategory["GAME"] = "GAME";
    LogCategory["SOCKET"] = "SOCKET";
    LogCategory["AUTH"] = "AUTH";
    LogCategory["API"] = "API";
    LogCategory["RECOVERY"] = "RECOVERY";
    LogCategory["PERSIST"] = "PERSIST";
    LogCategory["EVENT"] = "EVENT";
})(LogCategory || (exports.LogCategory = LogCategory = {}));
class StructuredLogger {
    constructor() {
        this.minLevel = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
        this.enableColors = process.env.NO_COLOR !== 'true';
    }
    formatTimestamp() {
        const now = new Date();
        return now.toISOString().split('T')[1].slice(0, -1);
    }
    colorize(text, level) {
        if (!this.enableColors)
            return text;
        const colors = {
            [LogLevel.DEBUG]: '\x1b[90m',
            [LogLevel.INFO]: '\x1b[36m',
            [LogLevel.SUCCESS]: '\x1b[32m',
            [LogLevel.WARN]: '\x1b[33m',
            [LogLevel.ERROR]: '\x1b[31m',
            [LogLevel.CRITICAL]: '\x1b[35m'
        };
        const reset = '\x1b[0m';
        return `${colors[level]}${text}${reset}`;
    }
    formatContext(context) {
        if (Object.keys(context).length === 0)
            return '';
        const formatted = Object.entries(context)
            .map(([key, value]) => {
            const val = typeof value === 'object' ? JSON.stringify(value) : value;
            return `${key}=${val}`;
        })
            .join(' ');
        return ` | ${formatted}`;
    }
    log(level, category, message, context = {}) {
        if (level < this.minLevel)
            return;
        const timestamp = this.formatTimestamp();
        const levelName = LogLevel[level].padEnd(8);
        const categoryName = category.padEnd(10);
        const contextStr = this.formatContext(context);
        const logLine = `[${timestamp}] ${levelName} [${categoryName}] ${message}${contextStr}`;
        const coloredLine = this.colorize(logLine, level);
        if (level >= LogLevel.ERROR) {
            console.error(coloredLine);
        }
        else {
            console.log(coloredLine);
        }
    }
    debug(category, message, context = {}) {
        this.log(LogLevel.DEBUG, category, message, context);
    }
    info(category, message, context = {}) {
        this.log(LogLevel.INFO, category, message, context);
    }
    success(category, message, context = {}) {
        this.log(LogLevel.SUCCESS, category, message, context);
    }
    warn(category, message, context = {}) {
        this.log(LogLevel.WARN, category, message, context);
    }
    error(category, message, context = {}) {
        this.log(LogLevel.ERROR, category, message, context);
    }
    critical(category, message, context = {}) {
        this.log(LogLevel.CRITICAL, category, message, context);
    }
}
exports.Logger = new StructuredLogger();
