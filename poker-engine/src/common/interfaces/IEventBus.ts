/**
 * Event Bus Interface - Pub/Sub Pattern for Domain Events
 * 
 * The EventBus decouples event publishers from event handlers.
 * Publishers emit events, handlers subscribe to event patterns.
 * 
 * Key Features:
 * - Pattern-based subscription (e.g., 'game.*', 'game.action_processed')
 * - Async event handling
 * - Multiple handlers per event type
 * - Error isolation (one handler error doesn't affect others)
 * 
 * Architecture:
 * 
 *   GameEngine → EventBus.publish('game.action_processed')
 *                     ↓
 *        ┌────────────┼────────────┐
 *        ↓            ↓            ↓
 *   Handler1     Handler2     Handler3
 * (WebSocket)  (Database)   (Analytics)
 */

import type { DomainEvent } from './IEventStore';

// =====================================================
// EVENT HANDLER
// =====================================================

/**
 * Event handler function signature
 * Handlers can be sync or async
 */
export type EventHandlerFunction = (event: DomainEvent) => Promise<void> | void;

/**
 * Event handler registration options
 */
export interface EventHandlerOptions {
  /**
   * Handler priority (lower number = higher priority)
   * Handlers are executed in priority order
   */
  priority?: number;
  
  /**
   * If true, handler errors will be thrown instead of caught
   * Useful for critical handlers that should stop event processing
   */
  throwOnError?: boolean;
  
  /**
   * Maximum retry attempts if handler fails
   */
  maxRetries?: number;
  
  /**
   * Handler identifier (for logging/debugging)
   */
  id?: string;
}

/**
 * Registered handler metadata
 */
export interface RegisteredHandler {
  pattern: string;
  handler: EventHandlerFunction;
  options: EventHandlerOptions;
}

// =====================================================
// EVENT BUS INTERFACE
// =====================================================

/**
 * Event Bus - Central hub for domain events
 * 
 * Responsibilities:
 * - Accept event publications
 * - Route events to matching handlers
 * - Handle errors gracefully
 * - Provide event persistence (via EventStore)
 */
export interface IEventBus {
  /**
   * Publish an event to the bus
   * 
   * Flow:
   * 1. Persist event to EventStore (if configured)
   * 2. Find all handlers matching event type
   * 3. Execute handlers (async, in priority order)
   * 4. Catch and log handler errors
   * 
   * @param event - The domain event to publish
   * @returns Promise that resolves when event is persisted (not when handlers finish)
   */
  publish(event: DomainEvent): Promise<void>;
  
  /**
   * Publish multiple events atomically
   * All events are persisted together or none at all
   * 
   * @param events - Array of events to publish
   * @returns Promise that resolves when all events are persisted
   */
  publishMany(events: DomainEvent[]): Promise<void>;
  
  /**
   * Subscribe to events matching a pattern
   * 
   * Patterns:
   * - Exact match: 'game.created'
   * - Wildcard: 'game.*' (matches 'game.created', 'game.action_processed', etc.)
   * - Multiple: ['game.created', 'game.started']
   * 
   * @param pattern - Event type pattern(s) to match
   * @param handler - Function to call when event matches
   * @param options - Handler configuration
   * @returns Unsubscribe function
   */
  subscribe(
    pattern: string | string[],
    handler: EventHandlerFunction,
    options?: EventHandlerOptions
  ): () => void;
  
  /**
   * Unsubscribe a handler from a pattern
   * 
   * @param pattern - The pattern to unsubscribe from
   * @param handler - The handler to remove
   */
  unsubscribe(pattern: string | string[], handler: EventHandlerFunction): void;
  
  /**
   * Unsubscribe all handlers from a pattern
   * 
   * @param pattern - The pattern to clear
   */
  unsubscribeAll(pattern: string): void;
  
  /**
   * Check if a handler is subscribed to a pattern
   * 
   * @param pattern - The pattern to check
   * @param handler - The handler to check for
   * @returns True if handler is subscribed
   */
  isSubscribed(pattern: string, handler: EventHandlerFunction): boolean;
  
  /**
   * Get all registered handlers for a pattern
   * 
   * @param pattern - The pattern to get handlers for
   * @returns Array of registered handlers
   */
  getHandlers(pattern: string): RegisteredHandler[];
  
  /**
   * Get all registered patterns
   * 
   * @returns Array of all patterns
   */
  getPatterns(): string[];
  
  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void;
  
  /**
   * Wait for all pending events to be processed
   * Useful for testing and graceful shutdown
   * 
   * @param timeout - Max time to wait in milliseconds
   * @returns Promise that resolves when all handlers complete
   */
  waitForHandlers(timeout?: number): Promise<void>;
}

// =====================================================
// EVENT BUS OPTIONS
// =====================================================

/**
 * Configuration options for EventBus
 */
export interface EventBusOptions {
  /**
   * EventStore for persisting events (optional)
   * If provided, events are persisted before being dispatched
   */
  eventStore?: any; // Will use IEventStore but avoiding circular dependency
  
  /**
   * If true, events are persisted to EventStore
   * Default: true if eventStore is provided
   */
  persistEvents?: boolean;
  
  /**
   * If true, handler execution is async (non-blocking)
   * Default: true
   */
  asyncHandlers?: boolean;
  
  /**
   * If true, handler errors are logged but don't throw
   * Default: true
   */
  swallowHandlerErrors?: boolean;
  
  /**
   * Logger for debugging (optional)
   */
  logger?: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  
  /**
   * Maximum number of concurrent handler executions
   * Default: unlimited
   */
  maxConcurrentHandlers?: number;
}

// =====================================================
// PATTERN MATCHING
// =====================================================

/**
 * Pattern matcher for event subscriptions
 */
export interface IPatternMatcher {
  /**
   * Check if an event type matches a pattern
   * 
   * Examples:
   * - matches('game.created', 'game.created') → true
   * - matches('game.created', 'game.*') → true
   * - matches('game.created', 'room.*') → false
   * 
   * @param eventType - The event type to test
   * @param pattern - The pattern to match against
   * @returns True if event type matches pattern
   */
  matches(eventType: string, pattern: string): boolean;
}

// =====================================================
// EVENT BUS ERRORS
// =====================================================

/**
 * Base error for EventBus operations
 */
export class EventBusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventBusError';
  }
}

/**
 * Thrown when event publication fails
 */
export class EventPublicationError extends EventBusError {
  constructor(
    message: string,
    public event: DomainEvent,
    public cause?: Error
  ) {
    super(message);
    this.name = 'EventPublicationError';
  }
}

/**
 * Thrown when event handler execution fails
 * Note: Usually logged, not thrown (unless throwOnError is true)
 */
export class EventHandlerError extends EventBusError {
  constructor(
    message: string,
    public event: DomainEvent,
    public handlerName: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'EventHandlerError';
  }
}

/**
 * Thrown when pattern is invalid
 */
export class InvalidPatternError extends EventBusError {
  constructor(public pattern: string) {
    super(`Invalid event pattern: ${pattern}`);
    this.name = 'InvalidPatternError';
  }
}

