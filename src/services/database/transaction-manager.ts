import type { SupabaseClient } from '@supabase/supabase-js';

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  isolationLevel?: 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
}

export type TransactionFunction<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Transaction Manager for Supabase operations
 * Provides atomic operations, retry logic, and error handling
 */
export class TransactionManager {
  private readonly client: SupabaseClient;
  private readonly defaultOptions: Required<TransactionOptions> = {
    maxRetries: 3,
    retryDelay: 100,
    isolationLevel: 'READ_COMMITTED'
  };

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Execute a function within a transaction with automatic retry on conflicts
   */
  async executeTransaction<T>(
    transactionFn: TransactionFunction<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Start transaction
        const { data: txResult, error: txError } = await this.client.rpc('begin_transaction');
        if (txError) {
          throw new Error(`Failed to start transaction: ${txError.message}`);
        }

        try {
          // Execute the transaction function
          const result = await transactionFn(this.client);
          
          // Commit transaction
          const { error: commitError } = await this.client.rpc('commit_transaction');
          if (commitError) {
            throw new Error(`Failed to commit transaction: ${commitError.message}`);
          }

          return {
            success: true,
            data: result,
            retryCount: attempt
          };

        } catch (error) {
          // Rollback on any error
          try {
            await this.client.rpc('rollback_transaction');
          } catch (rollbackError) {
            // Ignore rollback errors - transaction is already dead
          }
          throw error;
        }

      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a retryable error
        if (!this.isRetryableError(error as Error)) {
          return {
            success: false,
            error: `Non-retryable error: ${lastError.message}`,
            retryCount: attempt
          };
        }

        // If this was our last attempt, fail
        if (attempt === opts.maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = opts.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: `Transaction failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`,
      retryCount: opts.maxRetries + 1
    };
  }

  /**
   * Execute multiple operations atomically
   */
  async executeAtomicOperations<T>(
    operations: Array<(client: SupabaseClient) => Promise<any>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (client) => {
      const results: any[] = [];
      
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      return results;
    }, options);
  }

  /**
   * Check if an error is retryable (version conflicts, deadlocks, etc.)
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'version_conflict',
      'serialization_failure',
      'deadlock_detected',
      'connection_timeout',
      'temporary_failure'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a versioned update operation with optimistic locking
   */
  async updateWithVersion<T>(
    table: string,
    id: string,
    updates: Record<string, any>,
    expectedVersion: number,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    return this.executeTransaction(async (client) => {
      // First, check current version
      const { data: current, error: fetchError } = await client
        .from(table)
        .select('version')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current version: ${fetchError.message}`);
      }

      if (current.version !== expectedVersion) {
        throw new Error(`version_conflict: Expected version ${expectedVersion}, got ${current.version}`);
      }

      // Update with incremented version
      const { data, error } = await client
        .from(table)
        .update({
          ...updates,
          version: expectedVersion + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('version', expectedVersion) // Double-check version in WHERE clause
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows updated
          throw new Error('version_conflict: Version changed during update');
        }
        throw new Error(`Update failed: ${error.message}`);
      }

      return data;
    }, options);
  }

  /**
   * Batch insert with conflict resolution
   */
  async batchInsertWithConflictResolution<T>(
    table: string,
    records: Record<string, any>[],
    conflictColumns: string[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (client) => {
      const results: any[] = [];

      for (const record of records) {
        const { data, error } = await client
          .from(table)
          .upsert(record, {
            onConflict: conflictColumns.join(','),
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Batch insert failed for record: ${error.message}`);
        }

        results.push(data);
      }

      return results;
    }, options);
  }
}

/**
 * Utility function to create a transaction manager instance
 */
export function createTransactionManager(client: SupabaseClient): TransactionManager {
  return new TransactionManager(client);
}

/**
 * Decorator for automatic transaction wrapping
 */
export function withTransaction<T extends any[], R>(
  transactionManager: TransactionManager,
  options: TransactionOptions = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = async function (this: any, ...args: T): Promise<R> {
      const result = await transactionManager.executeTransaction(
        async () => method.apply(this, args),
        options
      );

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      return result.data!;
    };

    return descriptor;
  };
}
