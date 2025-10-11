import type { SupabaseClient } from '@supabase/supabase-js';
import { TransactionManager, type TransactionResult } from '../transaction-manager';
import { ConcurrencyManager, type ConcurrencyResult } from '../concurrency-manager';

/**
 * Base repository class with transaction and concurrency support
 * All repositories should extend this for consistency
 */
export abstract class BaseRepository {
  protected readonly client: SupabaseClient;
  protected readonly transactionManager: TransactionManager;
  protected readonly concurrencyManager: ConcurrencyManager;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.transactionManager = new TransactionManager(client);
    this.concurrencyManager = new ConcurrencyManager(client);
  }

  /**
   * Execute an operation within a transaction
   */
  protected async withTransaction<T>(
    operation: (client: SupabaseClient) => Promise<T>
  ): Promise<TransactionResult<T>> {
    return this.transactionManager.executeTransaction(operation);
  }

  /**
   * Execute an update with optimistic locking
   */
  protected async withOptimisticLock<T>(
    table: string,
    entityId: string,
    updateFn: (current: T) => Partial<T> | Promise<Partial<T>>
  ): Promise<ConcurrencyResult<T>> {
    return this.concurrencyManager.updateWithOptimisticLock(table, entityId, updateFn);
  }

  /**
   * Create a new entity with validation
   */
  protected async createEntity<T>(
    table: string,
    data: Record<string, any>,
    validate?: (data: Record<string, any>) => void | Promise<void>
  ): Promise<TransactionResult<T>> {
    return this.withTransaction(async (client) => {
      // Validate if validator provided
      if (validate) {
        await validate(data);
      }

      // Add timestamps
      const entityData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 0 // Start with version 0
      };

      const { data: result, error } = await client
        .from(table)
        .insert(entityData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create ${table}: ${error.message}`);
      }

      return result as T;
    });
  }

  /**
   * Get an entity by ID with optional version check
   */
  protected async getEntity<T>(
    table: string,
    id: string,
    expectedVersion?: number
  ): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Entity not found
      }
      throw new Error(`Failed to get ${table}: ${error.message}`);
    }

    // Check version if specified
    if (expectedVersion !== undefined && data.version !== expectedVersion) {
      throw new Error(`Version mismatch: expected ${expectedVersion}, got ${data.version}`);
    }

    return data as T;
  }

  /**
   * Update an entity with optimistic locking
   */
  protected async updateEntity<T>(
    table: string,
    id: string,
    updates: Record<string, any>,
    expectedVersion?: number
  ): Promise<ConcurrencyResult<T>> {
    if (expectedVersion !== undefined) {
      // Use optimistic locking
      return this.concurrencyManager.updateWithOptimisticLock<any>(
        table,
        id,
        async (current) => ({
          ...updates,
          updated_at: new Date().toISOString()
        })
      );
    } else {
      // Simple update without version check
      return this.withTransaction(async (client) => {
        const { data, error } = await client
          .from(table)
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update ${table}: ${error.message}`);
        }

        return data as T;
      });
    }
  }

  /**
   * Delete an entity
   */
  protected async deleteEntity(
    table: string,
    id: string,
    expectedVersion?: number
  ): Promise<TransactionResult<void>> {
    return this.withTransaction(async (client) => {
      let query = client.from(table).delete().eq('id', id);

      // Add version check if specified
      if (expectedVersion !== undefined) {
        query = query.eq('version', expectedVersion);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to delete ${table}: ${error.message}`);
      }
    });
  }

  /**
   * Count entities with optional filters
   */
  protected async countEntities(
    table: string,
    filters: Record<string, any> = {}
  ): Promise<number> {
    let query = this.client.from(table).select('*', { count: 'exact', head: true });

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count ${table}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * List entities with pagination and filters
   */
  protected async listEntities<T>(
    table: string,
    options: {
      filters?: Record<string, any>;
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    let query = this.client.from(table).select('*');

    // Apply filters
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 1000) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list ${table}: ${error.message}`);
    }

    return (data || []) as T[];
  }

  /**
   * Execute a raw query with parameters
   */
  protected async executeQuery<T>(
    query: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    const { data, error } = await this.client.rpc(query, params);

    if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }

    return (data || []) as T[];
  }

  /**
   * Log performance metrics
   */
  protected async logMetric(
    name: string,
    value: number,
    type: 'gauge' | 'counter' | 'histogram' = 'gauge',
    tags: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.client.from('performance_metrics').insert({
        metric_name: name,
        metric_value: value,
        metric_type: type,
        tags
      });
    } catch (error) {
      // Don't fail operations due to metrics logging
      console.warn('Failed to log metric:', error);
    }
  }

  /**
   * Log errors
   */
  protected async logError(
    type: string,
    message: string,
    stack?: string,
    context: Record<string, any> = {},
    severity: 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'error'
  ): Promise<void> {
    try {
      await this.client.from('error_logs').insert({
        error_type: type,
        error_message: message,
        error_stack: stack,
        context,
        severity
      });
    } catch (error) {
      // Don't fail operations due to error logging
      console.error('Failed to log error:', error);
    }
  }
}

/**
 * Utility function to handle repository errors consistently
 */
export function handleRepositoryError(error: any, operation: string, table: string): never {
  const message = `${operation} failed for ${table}: ${error.message || error}`;
  console.error(message, { error, operation, table });
  throw new Error(message);
}

/**
 * Decorator for automatic error handling and logging
 */
export function withErrorHandling(table: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (this: BaseRepository, ...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        
        // Log success metric
        await this.logMetric(
          `${table}.${propertyName}.duration`,
          Date.now() - startTime,
          'histogram',
          { table, operation: propertyName, success: true }
        );
        
        return result;
      } catch (error) {
        // Log error metric
        await this.logMetric(
          `${table}.${propertyName}.duration`,
          Date.now() - startTime,
          'histogram',
          { table, operation: propertyName, success: false }
        );
        
        // Log error details
        await this.logError(
          `${table}.${propertyName}`,
          (error as Error).message,
          (error as Error).stack,
          { table, operation: propertyName, args }
        );
        
        throw error;
      }
    };
    
    return descriptor;
  };
}
