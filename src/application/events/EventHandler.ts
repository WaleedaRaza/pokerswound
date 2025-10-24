/**
 * Event Handler Base Class
 * 
 * Abstract base class for domain event handlers.
 * Provides structure and helper methods for handling events.
 * 
 * Usage:
 * 
 * class GameEventHandler extends EventHandler {
 *   canHandle(eventType: string): boolean {
 *     return eventType.startsWith('game.');
 *   }
 *   
 *   async handle(event: DomainEvent): Promise<void> {
 *     switch(event.eventType) {
 *       case 'game.created':
 *         await this.handleGameCreated(event);
 *         break;
 *       case 'game.action_processed':
 *         await this.handleActionProcessed(event);
 *         break;
 *     }
 *   }
 * }
 */

import type { DomainEvent } from '../../common/interfaces/IEventStore';
import type { EventHandlerFunction } from '../../common/interfaces/IEventBus';

/**
 * Abstract EventHandler base class
 */
export abstract class EventHandler {
  /**
   * Handler name (for logging/debugging)
   */
  protected name: string;
  
  constructor(name?: string) {
    this.name = name || this.constructor.name;
  }
  
  /**
   * Handle an event
   * Must be implemented by subclasses
   * 
   * @param event - The domain event to handle
   */
  abstract handle(event: DomainEvent): Promise<void> | void;
  
  /**
   * Check if this handler can handle a specific event type
   * Optional: Can be used for filtering before routing to handle()
   * 
   * @param eventType - The event type to check
   * @returns True if this handler can handle the event type
   */
  canHandle(eventType: string): boolean {
    // Default: can handle all events
    // Override in subclasses to be more specific
    return true;
  }
  
  /**
   * Get the handler function compatible with EventBus
   * This wraps the handle() method in error handling and logging
   * 
   * @returns EventHandlerFunction that can be passed to eventBus.subscribe()
   */
  getHandlerFunction(): EventHandlerFunction {
    return async (event: DomainEvent) => {
      if (!this.canHandle(event.eventType)) {
        return; // Skip events this handler doesn't care about
      }
      
      try {
        await this.handle(event);
      } catch (error) {
        this.onError(event, error as Error);
        throw error; // Re-throw for EventBus to handle
      }
    };
  }
  
  /**
   * Called when handler encounters an error
   * Can be overridden for custom error handling
   * 
   * @param event - The event that caused the error
   * @param error - The error that occurred
   */
  protected onError(event: DomainEvent, error: Error): void {
    console.error(
      `[${this.name}] Error handling event ${event.eventType}:`,
      error
    );
  }
  
  /**
   * Log a message (can be overridden to use custom logger)
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
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

/**
 * Simple event handler that logs events to console
 * Useful for debugging
 */
export class LoggingEventHandler extends EventHandler {
  constructor() {
    super('LoggingEventHandler');
  }
  
  handle(event: DomainEvent): void {
    this.log('info', `Event: ${event.eventType}`, {
      aggregateId: event.aggregateId,
      version: event.version,
      timestamp: event.timestamp,
    });
  }
}

/**
 * Event handler that filters by event type pattern
 */
export class PatternEventHandler extends EventHandler {
  private pattern: RegExp;
  private handleFn: (event: DomainEvent) => Promise<void> | void;
  
  constructor(
    pattern: string | RegExp,
    handleFn: (event: DomainEvent) => Promise<void> | void,
    name?: string
  ) {
    super(name || 'PatternEventHandler');
    this.pattern = typeof pattern === 'string' 
      ? new RegExp(pattern.replace('*', '.*'))
      : pattern;
    this.handleFn = handleFn;
  }
  
  canHandle(eventType: string): boolean {
    return this.pattern.test(eventType);
  }
  
  async handle(event: DomainEvent): Promise<void> {
    await this.handleFn(event);
  }
}

/**
 * Event handler that handles multiple event types with different handlers
 */
export class MultiEventHandler extends EventHandler {
  private handlers: Map<string, (event: DomainEvent) => Promise<void> | void>;
  
  constructor(name?: string) {
    super(name || 'MultiEventHandler');
    this.handlers = new Map();
  }
  
  /**
   * Register a handler for a specific event type
   * 
   * @param eventType - The event type to handle
   * @param handler - The handler function
   */
  on(eventType: string, handler: (event: DomainEvent) => Promise<void> | void): this {
    this.handlers.set(eventType, handler);
    return this;
  }
  
  canHandle(eventType: string): boolean {
    return this.handlers.has(eventType);
  }
  
  async handle(event: DomainEvent): Promise<void> {
    const handler = this.handlers.get(event.eventType);
    if (handler) {
      await handler(event);
    }
  }
}

/**
 * Event handler that executes a list of sub-handlers in sequence
 */
export class CompositeEventHandler extends EventHandler {
  private subHandlers: EventHandler[];
  
  constructor(subHandlers: EventHandler[], name?: string) {
    super(name || 'CompositeEventHandler');
    this.subHandlers = subHandlers;
  }
  
  canHandle(eventType: string): boolean {
    return this.subHandlers.some(h => h.canHandle(eventType));
  }
  
  async handle(event: DomainEvent): Promise<void> {
    for (const handler of this.subHandlers) {
      if (handler.canHandle(event.eventType)) {
        await handler.handle(event);
      }
    }
  }
}

