"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const IEventBus_1 = require("../../common/interfaces/IEventBus");
class PatternMatcher {
    matches(eventType, pattern) {
        if (eventType === pattern) {
            return true;
        }
        if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -2);
            return eventType.startsWith(prefix + '.');
        }
        if (pattern === '*') {
            return true;
        }
        return false;
    }
}
class EventBus {
    constructor(options = {}) {
        this.handlers = new Map();
        this.patternMatcher = new PatternMatcher();
        this.pendingHandlers = new Set();
        this.defaultLogger = {
            debug: (msg, ...args) => console.log(`[EventBus DEBUG] ${msg}`, ...args),
            info: (msg, ...args) => console.log(`[EventBus INFO] ${msg}`, ...args),
            warn: (msg, ...args) => console.warn(`[EventBus WARN] ${msg}`, ...args),
            error: (msg, ...args) => console.error(`[EventBus ERROR] ${msg}`, ...args),
        };
        this.eventStore = options.eventStore;
        this.options = {
            eventStore: options.eventStore,
            persistEvents: options.persistEvents ?? (!!options.eventStore),
            asyncHandlers: options.asyncHandlers ?? true,
            swallowHandlerErrors: options.swallowHandlerErrors ?? true,
            logger: options.logger || this.defaultLogger,
            maxConcurrentHandlers: options.maxConcurrentHandlers ?? Infinity,
        };
    }
    async publish(event) {
        try {
            if (this.options.persistEvents && this.eventStore) {
                this.options.logger.debug(`Persisting event: ${event.eventType}`);
                await this.eventStore.append(event);
            }
            const matchingHandlers = this.findMatchingHandlers(event.eventType);
            if (matchingHandlers.length === 0) {
                this.options.logger.debug(`No handlers for event: ${event.eventType}`);
                return;
            }
            this.options.logger.info(`Publishing event: ${event.eventType} to ${matchingHandlers.length} handlers`);
            if (this.options.asyncHandlers) {
                this.executeHandlersAsync(event, matchingHandlers);
            }
            else {
                await this.executeHandlers(event, matchingHandlers);
            }
        }
        catch (error) {
            throw new IEventBus_1.EventPublicationError(`Failed to publish event: ${event.eventType}`, event, error);
        }
    }
    async publishMany(events) {
        if (events.length === 0) {
            return;
        }
        try {
            if (this.options.persistEvents && this.eventStore) {
                this.options.logger.debug(`Persisting ${events.length} events`);
                await this.eventStore.appendMany(events);
            }
            for (const event of events) {
                const matchingHandlers = this.findMatchingHandlers(event.eventType);
                if (matchingHandlers.length > 0) {
                    if (this.options.asyncHandlers) {
                        this.executeHandlersAsync(event, matchingHandlers);
                    }
                    else {
                        await this.executeHandlers(event, matchingHandlers);
                    }
                }
            }
        }
        catch (error) {
            throw new IEventBus_1.EventPublicationError(`Failed to publish ${events.length} events`, events[0], error);
        }
    }
    subscribe(pattern, handler, options = {}) {
        const patterns = Array.isArray(pattern) ? pattern : [pattern];
        for (const p of patterns) {
            this.validatePattern(p);
            const registered = {
                pattern: p,
                handler,
                options: {
                    priority: options.priority ?? 100,
                    throwOnError: options.throwOnError ?? false,
                    maxRetries: options.maxRetries ?? 0,
                    id: options.id || `handler_${Date.now()}`,
                },
            };
            if (!this.handlers.has(p)) {
                this.handlers.set(p, []);
            }
            const handlerList = this.handlers.get(p);
            handlerList.push(registered);
            handlerList.sort((a, b) => a.options.priority - b.options.priority);
            this.options.logger.debug(`Subscribed handler to pattern: ${p}`);
        }
        return () => this.unsubscribe(patterns, handler);
    }
    unsubscribe(pattern, handler) {
        const patterns = Array.isArray(pattern) ? pattern : [pattern];
        for (const p of patterns) {
            const handlerList = this.handlers.get(p);
            if (!handlerList) {
                continue;
            }
            const index = handlerList.findIndex(h => h.handler === handler);
            if (index !== -1) {
                handlerList.splice(index, 1);
                this.options.logger.debug(`Unsubscribed handler from pattern: ${p}`);
            }
            if (handlerList.length === 0) {
                this.handlers.delete(p);
            }
        }
    }
    unsubscribeAll(pattern) {
        if (this.handlers.has(pattern)) {
            this.handlers.delete(pattern);
            this.options.logger.debug(`Unsubscribed all handlers from pattern: ${pattern}`);
        }
    }
    isSubscribed(pattern, handler) {
        const handlerList = this.handlers.get(pattern);
        if (!handlerList) {
            return false;
        }
        return handlerList.some(h => h.handler === handler);
    }
    getHandlers(pattern) {
        return this.handlers.get(pattern) || [];
    }
    getPatterns() {
        return Array.from(this.handlers.keys());
    }
    clear() {
        this.handlers.clear();
        this.options.logger.debug('Cleared all handlers');
    }
    async waitForHandlers(timeout = 5000) {
        if (this.pendingHandlers.size === 0) {
            return;
        }
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Handler timeout')), timeout);
        });
        try {
            await Promise.race([
                Promise.all(Array.from(this.pendingHandlers)),
                timeoutPromise,
            ]);
        }
        catch (error) {
            this.options.logger.warn(`Handler timeout after ${timeout}ms`);
        }
    }
    findMatchingHandlers(eventType) {
        const matching = [];
        for (const [pattern, handlerList] of this.handlers.entries()) {
            if (this.patternMatcher.matches(eventType, pattern)) {
                matching.push(...handlerList);
            }
        }
        return matching.sort((a, b) => a.options.priority - b.options.priority);
    }
    async executeHandlers(event, handlers) {
        for (const registered of handlers) {
            await this.executeHandler(event, registered);
        }
    }
    executeHandlersAsync(event, handlers) {
        for (const registered of handlers) {
            const promise = this.executeHandler(event, registered);
            this.pendingHandlers.add(promise);
            promise.finally(() => this.pendingHandlers.delete(promise));
        }
    }
    async executeHandler(event, registered) {
        const { handler, options } = registered;
        const maxRetries = options.maxRetries || 0;
        let attempt = 0;
        while (attempt <= maxRetries) {
            try {
                await handler(event);
                if (attempt > 0) {
                    this.options.logger.info(`Handler ${options.id} succeeded on retry ${attempt}`);
                }
                return;
            }
            catch (error) {
                attempt++;
                const handlerError = new IEventBus_1.EventHandlerError(`Handler ${options.id} failed for event ${event.eventType}`, event, options.id || 'unknown', error);
                if (attempt > maxRetries) {
                    if (options.throwOnError) {
                        throw handlerError;
                    }
                    else if (this.options.swallowHandlerErrors) {
                        this.options.logger.error(`Handler ${options.id} failed after ${maxRetries + 1} attempts:`, error);
                    }
                    else {
                        throw handlerError;
                    }
                }
                else {
                    this.options.logger.warn(`Handler ${options.id} failed, retrying (${attempt}/${maxRetries})`, error);
                }
            }
        }
    }
    validatePattern(pattern) {
        if (!pattern || pattern.trim() === '') {
            throw new IEventBus_1.InvalidPatternError(pattern);
        }
        const validPattern = /^[\w\.\*]+$/;
        if (!validPattern.test(pattern)) {
            throw new IEventBus_1.InvalidPatternError(pattern);
        }
    }
}
exports.EventBus = EventBus;
