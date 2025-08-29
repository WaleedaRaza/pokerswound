import type { SupabaseClient } from '@supabase/supabase-js';
import { TransactionManager, type TransactionResult } from './transaction-manager';

export interface OptimisticLockOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  maxRetryDelay?: number;
}

export interface LockableEntity {
  id: string;
  version: number;
  updated_at?: string;
}

export interface ConcurrencyResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  conflicts?: number;
  finalVersion?: number;
}

/**
 * Concurrency Manager for handling optimistic locking and version conflicts
 * Prevents race conditions in multi-user scenarios
 */
export class ConcurrencyManager {
  private readonly client: SupabaseClient;
  private readonly transactionManager: TransactionManager;
  private readonly defaultOptions: Required<OptimisticLockOptions> = {
    maxRetries: 5,
    retryDelay: 50,
    backoffMultiplier: 2,
    maxRetryDelay: 2000
  };

  constructor(client: SupabaseClient) {
    this.client = client;
    this.transactionManager = new TransactionManager(client);
  }

  /**
   * Update an entity with optimistic locking and automatic retry
   */
  async updateWithOptimisticLock<T extends LockableEntity>(
    table: string,
    entityId: string,
    updateFn: (current: T) => Partial<T> | Promise<Partial<T>>,
    options: OptimisticLockOptions = {}
  ): Promise<ConcurrencyResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let conflicts = 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Fetch current state with version
        const { data: current, error: fetchError } = await this.client
          .from(table)
          .select('*')
          .eq('id', entityId)
          .single();

        if (fetchError) {
          return {
            success: false,
            error: `Failed to fetch entity: ${fetchError.message}`,
            conflicts
          };
        }

        if (!current) {
          return {
            success: false,
            error: 'Entity not found',
            conflicts
          };
        }

        // Generate updates
        const updates = await updateFn(current as T);
        
        // Attempt optimistic update
        const result = await this.transactionManager.updateWithVersion<T>(
          table,
          entityId,
          updates,
          current.version,
          { maxRetries: 0 } // Don't retry at transaction level, we handle it here
        );

        if (result.success) {
          return {
            success: true,
            data: result.data,
            conflicts,
            finalVersion: result.data?.version
          };
        }

        // Check if it's a version conflict
        if (result.error?.includes('version_conflict')) {
          conflicts++;
          
          if (attempt < opts.maxRetries) {
            // Calculate delay with exponential backoff
            const delay = Math.min(
              opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt),
              opts.maxRetryDelay
            );
            
            await this.sleep(delay);
            continue;
          }
        }

        // Non-retryable error or max retries reached
        return {
          success: false,
          error: result.error,
          conflicts
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < opts.maxRetries) {
          const delay = Math.min(
            opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt),
            opts.maxRetryDelay
          );
          await this.sleep(delay);
          continue;
        }
      }
    }

    return {
      success: false,
      error: `Update failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`,
      conflicts
    };
  }

  /**
   * Update multiple entities with coordinated optimistic locking
   */
  async updateMultipleWithOptimisticLock<T extends LockableEntity>(
    updates: Array<{
      table: string;
      entityId: string;
      updateFn: (current: T) => Partial<T> | Promise<Partial<T>>;
    }>,
    options: OptimisticLockOptions = {}
  ): Promise<ConcurrencyResult<T[]>> {
    const opts = { ...this.defaultOptions, ...options };
    let conflicts = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await this.transactionManager.executeTransaction(async (client) => {
          const results: T[] = [];
          
          // Fetch all current states
          const currentStates = new Map<string, T>();
          
          for (const update of updates) {
            const { data: current, error: fetchError } = await client
              .from(update.table)
              .select('*')
              .eq('id', update.entityId)
              .single();

            if (fetchError || !current) {
              throw new Error(`Failed to fetch ${update.table}:${update.entityId}`);
            }

            currentStates.set(`${update.table}:${update.entityId}`, current as T);
          }

          // Generate all updates
          const preparedUpdates = new Map<string, Partial<T>>();
          
          for (const update of updates) {
            const key = `${update.table}:${update.entityId}`;
            const current = currentStates.get(key)!;
            const updateData = await update.updateFn(current);
            preparedUpdates.set(key, updateData);
          }

          // Execute all updates atomically
          for (const update of updates) {
            const key = `${update.table}:${update.entityId}`;
            const current = currentStates.get(key)!;
            const updateData = preparedUpdates.get(key)!;

            const { data, error } = await client
              .from(update.table)
              .update({
                ...updateData,
                version: current.version + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', update.entityId)
              .eq('version', current.version)
              .select()
              .single();

            if (error) {
              if (error.code === 'PGRST116') {
                throw new Error('version_conflict: One or more entities were modified');
              }
              throw new Error(`Update failed: ${error.message}`);
            }

            results.push(data as T);
          }

          return results;
        });

        if (result.success) {
          return {
            success: true,
            data: result.data,
            conflicts
          };
        }

        // Check for version conflicts
        if (result.error?.includes('version_conflict')) {
          conflicts++;
          
          if (attempt < opts.maxRetries) {
            const delay = Math.min(
              opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt),
              opts.maxRetryDelay
            );
            await this.sleep(delay);
            continue;
          }
        }

        return {
          success: false,
          error: result.error,
          conflicts
        };

      } catch (error) {
        if (attempt < opts.maxRetries) {
          const delay = Math.min(
            opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt),
            opts.maxRetryDelay
          );
          await this.sleep(delay);
          continue;
        }

        return {
          success: false,
          error: `Coordinated update failed: ${(error as Error).message}`,
          conflicts
        };
      }
    }

    return {
      success: false,
      error: 'Unexpected error in coordinated update',
      conflicts
    };
  }

  /**
   * Acquire a distributed lock for critical sections
   */
  async acquireDistributedLock(
    lockName: string,
    ttlSeconds: number = 30,
    options: OptimisticLockOptions = {}
  ): Promise<ConcurrencyResult<string>> {
    const lockId = this.generateLockId();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const opts = { ...this.defaultOptions, ...options };

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const { data, error } = await this.client
          .from('distributed_locks')
          .insert({
            lock_name: lockName,
            lock_id: lockId,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!error) {
          return {
            success: true,
            data: lockId
          };
        }

        // Check if lock already exists
        if (error.code === '23505') { // Unique constraint violation
          // Try to clean up expired locks and retry
          await this.cleanupExpiredLocks(lockName);
          
          if (attempt < opts.maxRetries) {
            const delay = opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt);
            await this.sleep(delay);
            continue;
          }
        }

        return {
          success: false,
          error: `Failed to acquire lock: ${error.message}`
        };

      } catch (error) {
        if (attempt < opts.maxRetries) {
          await this.sleep(opts.retryDelay);
          continue;
        }

        return {
          success: false,
          error: `Lock acquisition failed: ${(error as Error).message}`
        };
      }
    }

    return {
      success: false,
      error: 'Failed to acquire distributed lock'
    };
  }

  /**
   * Release a distributed lock
   */
  async releaseDistributedLock(lockName: string, lockId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('distributed_locks')
        .delete()
        .eq('lock_name', lockName)
        .eq('lock_id', lockId);

      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   */
  async executeWithLock<T>(
    lockName: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 30,
    options: OptimisticLockOptions = {}
  ): Promise<ConcurrencyResult<T>> {
    const lockResult = await this.acquireDistributedLock(lockName, ttlSeconds, options);
    
    if (!lockResult.success) {
      return {
        success: false,
        error: `Failed to acquire lock: ${lockResult.error}`
      };
    }

    const lockId = lockResult.data!;

    try {
      const result = await fn();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Execution failed: ${(error as Error).message}`
      };
    } finally {
      await this.releaseDistributedLock(lockName, lockId);
    }
  }

  private generateLockId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async cleanupExpiredLocks(lockName?: string): Promise<void> {
    try {
      let query = this.client
        .from('distributed_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (lockName) {
        query = query.eq('lock_name', lockName);
      }

      await query;
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Utility function to create a concurrency manager instance
 */
export function createConcurrencyManager(client: SupabaseClient): ConcurrencyManager {
  return new ConcurrencyManager(client);
}
