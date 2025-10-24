/**
 * Event Bus Implementation
 * 
 * In-memory pub/sub event bus with optional persistence to EventStore.
 * 
 * Features:
 * - Pattern-based subscription (wildcard support)
 * - Async handler execution
 * - Error isolation (one handler failure doesn't affect others)
 * - Priority-based handler ordering
 * - Event persistence (if EventStore provided)
 * - Graceful error handling
 */

import type { DomainEvent, IEventStore } from '../../common/interfaces/IEventStore';
import type {
  IEventBus,
  IPatternMatcher,
  EventHandlerFunction,
  EventHandlerOptions,
  RegisteredHandler,
  EventBusOptions,
} from '../../common/interfaces/IEventBus';
import {
  EventBusError,
  EventPublicationError,
  EventHandlerError,
  InvalidPatternError,
} from '../../common/interfaces/IEventBus';

/**
 * Simple pattern matcher supporting wildcards
 */
class PatternMatcher implements IPatternMatcher {
  matches(eventType: string, pattern: string): boolean {
    // Exact match
    if (eventType === pattern) {
      return true;
    }
    
    // Wildcard match (e.g., 'game.*' matches 'game.created')
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2); // Remove '.*'
      return eventType.startsWith(prefix + '.');
    }
    
    // Wildcard match (e.g., '*' matches everything)
    if (pattern === '*') {
      return true;
    }
    
    return false;
  }
}

/**
 * EventBus implementation
 */
export class EventBus implements IEventBus {
  private handlers: Map<string, RegisteredHandler[]> = new Map();
  private patternMatcher: IPatternMatcher = new PatternMatcher();
  private eventStore?: IEventStore;
  private options: Required<EventBusOptions>;
  private pendingHandlers: Set<Promise<void>> = new Set();
  
  // Default console logger
  private defaultLogger = {
    debug: (msg: string, ...args: any[]) => console.log(`[EventBus DEBUG] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.log(`[EventBus INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[EventBus WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[EventBus ERROR] ${msg}`, ...args),
  };
  
  constructor(options: EventBusOptions = {}) {
    this.eventStore = options.eventStore;
    
    // Set default options
    this.options = {
      eventStore: options.eventStore,
      persistEvents: options.persistEvents ?? (!!options.eventStore),
      asyncHandlers: options.asyncHandlers ?? true,
      swallowHandlerErrors: options.swallowHandlerErrors ?? true,
      logger: options.logger || this.defaultLogger,
      maxConcurrentHandlers: options.maxConcurrentHandlers ?? Infinity,
    };
  }
  
  // =====================================================
  // PUBLISH OPERATIONS
  // =====================================================
  
  /**
   * Publish a single event
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // 1. Persist to EventStore if configured
      if (this.options.persistEvents && this.eventStore) {
        this.options.logger.debug(`Persisting event: ${event.eventType}`);
        await this.eventStore.append(event);
      }
      
      // 2. Find matching handlers
      const matchingHandlers = this.findMatchingHandlers(event.eventType);
      
      if (matchingHandlers.length === 0) {
        this.options.logger.debug(`No handlers for event: ${event.eventType}`);
        return;
      }
      
      this.options.logger.info(`Publishing event: ${event.eventType} to ${matchingHandlers.length} handlers`);
      
      // 3. Execute handlers
      if (this.options.asyncHandlers) {
        // Fire and forget (non-blocking)
        this.executeHandlersAsync(event, matchingHandlers);
      } else {
        // Wait for handlers to complete
        await this.executeHandlers(event, matchingHandlers);
      }
      
    } catch (error) {
      throw new EventPublicationError(
        `Failed to publish event: ${event.eventType}`,
        event,
        error as Error
      );
    }
  }
  
  /**
   * Publish multiple events atomically
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    
    try {
      // 1. Persist all events atomically
      if (this.options.persistEvents && this.eventStore) {
        this.options.logger.debug(`Persisting ${events.length} events`);
        await this.eventStore.appendMany(events);
      }
      
      // 2. Publish each event to handlers
      for (const event of events) {
        const matchingHandlers = this.findMatchingHandlers(event.eventType);
        
        if (matchingHandlers.length > 0) {
          if (this.options.asyncHandlers) {
            this.executeHandlersAsync(event, matchingHandlers);
          } else {
            await this.executeHandlers(event, matchingHandlers);
          }
        }
      }
      
    } catch (error) {
      throw new EventPublicationError(
        `Failed to publish ${events.length} events`,
        events[0],
        error as Error
      );
    }
  }
  
  // =====================================================
  // SUBSCRIPTION OPERATIONS
  // =====================================================
  
  /**
   * Subscribe to event pattern(s)
   */
  subscribe(
    pattern: string | string[],
    handler: EventHandlerFunction,
    options: EventHandlerOptions = {}
  ): () => void {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    
    for (const p of patterns) {
      this.validatePattern(p);
      
      const registered: RegisteredHandler = {
        pattern: p,
        handler,
        options: {
          priority: options.priority ?? 100,
          throwOnError: options.throwOnError ?? false,
          maxRetries: options.maxRetries ?? 0,
          id: options.id || `handler_${Date.now()}`,
        },
      };
      
      // Get or create handler list for pattern
      if (!this.handlers.has(p)) {
        this.handlers.set(p, []);
      }
      
      const handlerList = this.handlers.get(p)!;
      handlerList.push(registered);
      
      // Sort by priority (lower number = higher priority)
      handlerList.sort((a, b) => a.options.priority! - b.options.priority!);
      
      this.options.logger.debug(`Subscribed handler to pattern: ${p}`);
    }
    
    // Return unsubscribe function
    return () => this.unsubscribe(patterns, handler);
  }
  
  /**
   * Unsubscribe a handler from pattern(s)
   */
  unsubscribe(pattern: string | string[], handler: EventHandlerFunction): void {
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
      
      // Clean up empty handler lists
      if (handlerList.length === 0) {
        this.handlers.delete(p);
      }
    }
  }
  
  /**
   * Unsubscribe all handlers from a pattern
   */
  unsubscribeAll(pattern: string): void {
    if (this.handlers.has(pattern)) {
      this.handlers.delete(pattern);
      this.options.logger.debug(`Unsubscribed all handlers from pattern: ${pattern}`);
    }
  }
  
  /**
   * Check if handler is subscribed
   */
  isSubscribed(pattern: string, handler: EventHandlerFunction): boolean {
    const handlerList = this.handlers.get(pattern);
    if (!handlerList) {
      return false;
    }
    
    return handlerList.some(h => h.handler === handler);
  }
  
  /**
   * Get all handlers for a pattern
   */
  getHandlers(pattern: string): RegisteredHandler[] {
    return this.handlers.get(pattern) || [];
  }
  
  /**
   * Get all registered patterns
   */
  getPatterns(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.options.logger.debug('Cleared all handlers');
  }
  
  /**
   * Wait for all pending handlers to complete
   */
  async waitForHandlers(timeout: number = 5000): Promise<void> {
    if (this.pendingHandlers.size === 0) {
      return;
    }
    
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Handler timeout')), timeout);
    });
    
    try {
      await Promise.race([
        Promise.all(Array.from(this.pendingHandlers)),
        timeoutPromise,
      ]);
    } catch (error) {
      this.options.logger.warn(`Handler timeout after ${timeout}ms`);
    }
  }
  
  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================
  
  /**
   * Find all handlers matching an event type
   */
  private findMatchingHandlers(eventType: string): RegisteredHandler[] {
    const matching: RegisteredHandler[] = [];
    
    for (const [pattern, handlerList] of this.handlers.entries()) {
      if (this.patternMatcher.matches(eventType, pattern)) {
        matching.push(...handlerList);
      }
    }
    
    // Sort by priority
    return matching.sort((a, b) => a.options.priority! - b.options.priority!);
  }
  
  /**
   * Execute handlers synchronously (blocking)
   */
  private async executeHandlers(
    event: DomainEvent,
    handlers: RegisteredHandler[]
  ): Promise<void> {
    for (const registered of handlers) {
      await this.executeHandler(event, registered);
    }
  }
  
  /**
   * Execute handlers asynchronously (non-blocking)
   */
  private executeHandlersAsync(
    event: DomainEvent,
    handlers: RegisteredHandler[]
  ): void {
    for (const registered of handlers) {
      const promise = this.executeHandler(event, registered);
      
      // Track pending handlers
      this.pendingHandlers.add(promise);
      promise.finally(() => this.pendingHandlers.delete(promise));
    }
  }
  
  /**
   * Execute a single handler with error handling and retries
   */
  private async executeHandler(
    event: DomainEvent,
    registered: RegisteredHandler
  ): Promise<void> {
    const { handler, options } = registered;
    const maxRetries = options.maxRetries || 0;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        await handler(event);
        
        if (attempt > 0) {
          this.options.logger.info(
            `Handler ${options.id} succeeded on retry ${attempt}`
          );
        }
        
        return; // Success
        
      } catch (error) {
        attempt++;
        
        const handlerError = new EventHandlerError(
          `Handler ${options.id} failed for event ${event.eventType}`,
          event,
          options.id || 'unknown',
          error as Error
        );
        
        if (attempt > maxRetries) {
          // Final attempt failed
          if (options.throwOnError) {
            throw handlerError;
          } else if (this.options.swallowHandlerErrors) {
            this.options.logger.error(
              `Handler ${options.id} failed after ${maxRetries + 1} attempts:`,
              error
            );
          } else {
            throw handlerError;
          }
        } else {
          // Retry
          this.options.logger.warn(
            `Handler ${options.id} failed, retrying (${attempt}/${maxRetries})`,
            error
          );
        }
      }
    }
  }
  
  /**
   * Validate event pattern
   */
  private validatePattern(pattern: string): void {
    if (!pattern || pattern.trim() === '') {
      throw new InvalidPatternError(pattern);
    }
    
    // Basic validation - pattern should be alphanumeric with dots and wildcards
    const validPattern = /^[\w\.\*]+$/;
    if (!validPattern.test(pattern)) {
      throw new InvalidPatternError(pattern);
    }
  }
}

