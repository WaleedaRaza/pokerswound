/**
 * Event Store Interface - Contract for Event Sourcing
 * 
 * This interface defines the contract for storing and retrieving domain events.
 * Implementation can be PostgreSQL, MongoDB, EventStoreDB, etc.
 * 
 * Key Principles:
 * - Events are immutable (append-only)
 * - Events are ordered by version per aggregate
 * - Events can be queried by aggregate, type, or time
 */

import type { UUID } from '../../types/common.types';

// =====================================================
// DOMAIN EVENT
// =====================================================

/**
 * Core domain event structure
 * All events in the system follow this shape
 */
export interface DomainEvent {
  /** Unique event identifier */
  id: UUID;
  
  /** Event type (e.g., 'game.created', 'game.action_processed') */
  eventType: string;
  
  /** Type of aggregate this event belongs to (e.g., 'Game', 'Room') */
  aggregateType: string;
  
  /** ID of the aggregate (e.g., game UUID) */
  aggregateId: string;
  
  /** Event payload - complete event data */
  eventData: any;
  
  /** Event metadata (user_id, ip, client_version, etc.) */
  metadata?: EventMetadata;
  
  /** Version of the aggregate when this event occurred */
  version: number;
  
  /** When the event occurred */
  timestamp: Date;
  
  /** Global sequence number for ordering */
  sequenceNumber?: number;
  
  /** ID of the command that caused this event */
  causationId?: UUID;
  
  /** ID linking related events (e.g., all events in one session) */
  correlationId?: UUID;
  
  /** User who triggered this event */
  userId?: UUID;
}

// =====================================================
// EVENT METADATA
// =====================================================

/**
 * Optional metadata attached to events
 */
export interface EventMetadata {
  /** User who triggered the event */
  userId?: UUID;
  
  /** IP address of the client */
  ipAddress?: string;
  
  /** Client version (for debugging) */
  clientVersion?: string;
  
  /** Server version (for debugging) */
  serverVersion?: string;
  
  /** Additional context */
  [key: string]: any;
}

// =====================================================
// EVENT SNAPSHOT
// =====================================================

/**
 * Snapshot of aggregate state at a specific version
 * Used to optimize event replay (don't need to replay ALL events)
 */
export interface EventSnapshot {
  /** Unique snapshot identifier */
  id: UUID;
  
  /** Type of aggregate */
  aggregateType: string;
  
  /** ID of the aggregate */
  aggregateId: string;
  
  /** Complete state at this point in time */
  snapshotData: any;
  
  /** Version of the aggregate when snapshot was taken */
  version: number;
  
  /** When the snapshot was created */
  createdAt: Date;
  
  /** How many events were replayed to create this snapshot */
  eventCount?: number;
  
  /** Why this snapshot was created */
  snapshotReason?: 'manual' | 'scheduled' | 'threshold_reached';
}

// =====================================================
// QUERY FILTERS
// =====================================================

/**
 * Filters for querying events
 */
export interface EventQueryFilter {
  /** Filter by aggregate ID */
  aggregateId?: string;
  
  /** Filter by aggregate type */
  aggregateType?: string;
  
  /** Filter by event type(s) */
  eventType?: string | string[];
  
  /** Filter by user ID */
  userId?: UUID;
  
  /** Filter by correlation ID */
  correlationId?: UUID;
  
  /** Filter by timestamp range */
  fromTimestamp?: Date;
  toTimestamp?: Date;
  
  /** Filter by version range */
  fromVersion?: number;
  toVersion?: number;
  
  /** Pagination */
  limit?: number;
  offset?: number;
  
  /** Ordering */
  orderBy?: 'timestamp' | 'event_timestamp' | 'sequence' | 'version';
  orderDirection?: 'ASC' | 'DESC';
}

// =====================================================
// EVENT STORE INTERFACE
// =====================================================

/**
 * Event Store - Persistence layer for domain events
 */
export interface IEventStore {
  /**
   * Append a new event to the store
   * Events are immutable and append-only
   * 
   * @param event - The domain event to append
   * @returns The saved event with generated fields (id, sequenceNumber)
   * @throws If there's a version conflict (optimistic concurrency)
   */
  append(event: Omit<DomainEvent, 'id' | 'sequenceNumber' | 'timestamp'>): Promise<DomainEvent>;
  
  /**
   * Append multiple events atomically (all or nothing)
   * Useful for operations that produce multiple events
   * 
   * @param events - Array of events to append
   * @returns Array of saved events
   * @throws If any event fails to append
   */
  appendMany(events: Array<Omit<DomainEvent, 'id' | 'sequenceNumber' | 'timestamp'>>): Promise<DomainEvent[]>;
  
  /**
   * Get all events for a specific aggregate
   * Ordered by version ascending
   * 
   * @param aggregateId - The ID of the aggregate
   * @param fromVersion - Optional: start from this version (default: 0)
   * @returns Array of events
   */
  getByAggregate(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  
  /**
   * Get events by type
   * Useful for analytics or replaying specific event types
   * 
   * @param eventType - The event type to filter by
   * @param limit - Optional: max number of events to return
   * @returns Array of events
   */
  getByType(eventType: string, limit?: number): Promise<DomainEvent[]>;
  
  /**
   * Get events by multiple criteria
   * Most flexible query method
   * 
   * @param filter - Query filters
   * @returns Array of events matching the filter
   */
  query(filter: EventQueryFilter): Promise<DomainEvent[]>;
  
  /**
   * Get the event stream for an aggregate starting from a version
   * This is the primary method for event replay
   * 
   * @param aggregateId - The ID of the aggregate
   * @param fromVersion - Start from this version (default: 0)
   * @returns Stream of events ordered by version
   */
  getStream(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  
  /**
   * Get the latest version number for an aggregate
   * Useful for optimistic concurrency checks
   * 
   * @param aggregateId - The ID of the aggregate
   * @returns The latest version number (or 0 if no events exist)
   */
  getLatestVersion(aggregateId: string): Promise<number>;
  
  /**
   * Check if an aggregate exists (has any events)
   * 
   * @param aggregateId - The ID of the aggregate
   * @returns True if aggregate has events
   */
  exists(aggregateId: string): Promise<boolean>;
  
  /**
   * Get total event count for an aggregate
   * 
   * @param aggregateId - The ID of the aggregate
   * @returns Number of events
   */
  getEventCount(aggregateId: string): Promise<number>;
  
  // =====================================================
  // SNAPSHOT METHODS (Optional - for performance)
  // =====================================================
  
  /**
   * Save a snapshot of aggregate state
   * Allows faster rebuild by starting from snapshot instead of event 0
   * 
   * @param snapshot - The snapshot to save
   * @returns The saved snapshot
   */
  saveSnapshot?(snapshot: Omit<EventSnapshot, 'id' | 'createdAt'>): Promise<EventSnapshot>;
  
  /**
   * Get the latest snapshot for an aggregate
   * 
   * @param aggregateId - The ID of the aggregate
   * @returns The latest snapshot (or null if none exist)
   */
  getLatestSnapshot?(aggregateId: string): Promise<EventSnapshot | null>;
  
  /**
   * Get a snapshot at a specific version
   * 
   * @param aggregateId - The ID of the aggregate
   * @param version - The version to get snapshot for
   * @returns The snapshot (or null if not found)
   */
  getSnapshotAtVersion?(aggregateId: string, version: number): Promise<EventSnapshot | null>;
}

// =====================================================
// EVENT STORE ERRORS
// =====================================================

/**
 * Base error for event store operations
 */
export class EventStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventStoreError';
  }
}

/**
 * Thrown when there's a version conflict (optimistic concurrency)
 * This means another process modified the aggregate between read and write
 */
export class VersionConflictError extends EventStoreError {
  constructor(
    public aggregateId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Version conflict for aggregate ${aggregateId}: expected ${expectedVersion}, actual ${actualVersion}`
    );
    this.name = 'VersionConflictError';
  }
}

/**
 * Thrown when event cannot be appended
 */
export class EventAppendError extends EventStoreError {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'EventAppendError';
  }
}

/**
 * Thrown when event query fails
 */
export class EventQueryError extends EventStoreError {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'EventQueryError';
  }
}

