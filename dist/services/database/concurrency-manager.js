"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyManager = void 0;
exports.createConcurrencyManager = createConcurrencyManager;
const transaction_manager_1 = require("./transaction-manager");
class ConcurrencyManager {
    constructor(client) {
        this.defaultOptions = {
            maxRetries: 5,
            retryDelay: 50,
            backoffMultiplier: 2,
            maxRetryDelay: 2000
        };
        this.client = client;
        this.transactionManager = new transaction_manager_1.TransactionManager(client);
    }
    async updateWithOptimisticLock(table, entityId, updateFn, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        let conflicts = 0;
        let lastError = null;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
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
                const updates = await updateFn(current);
                const result = await this.transactionManager.updateWithVersion(table, entityId, updates, current.version, { maxRetries: 0 });
                if (result.success) {
                    return {
                        success: true,
                        data: result.data,
                        conflicts,
                        finalVersion: result.data?.version
                    };
                }
                if (result.error?.includes('version_conflict')) {
                    conflicts++;
                    if (attempt < opts.maxRetries) {
                        const delay = Math.min(opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt), opts.maxRetryDelay);
                        await this.sleep(delay);
                        continue;
                    }
                }
                return {
                    success: false,
                    error: result.error,
                    conflicts
                };
            }
            catch (error) {
                lastError = error;
                if (attempt < opts.maxRetries) {
                    const delay = Math.min(opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt), opts.maxRetryDelay);
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
    async updateMultipleWithOptimisticLock(updates, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        let conflicts = 0;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await this.transactionManager.executeTransaction(async (client) => {
                    const results = [];
                    const currentStates = new Map();
                    for (const update of updates) {
                        const { data: current, error: fetchError } = await client
                            .from(update.table)
                            .select('*')
                            .eq('id', update.entityId)
                            .single();
                        if (fetchError || !current) {
                            throw new Error(`Failed to fetch ${update.table}:${update.entityId}`);
                        }
                        currentStates.set(`${update.table}:${update.entityId}`, current);
                    }
                    const preparedUpdates = new Map();
                    for (const update of updates) {
                        const key = `${update.table}:${update.entityId}`;
                        const current = currentStates.get(key);
                        const updateData = await update.updateFn(current);
                        preparedUpdates.set(key, updateData);
                    }
                    for (const update of updates) {
                        const key = `${update.table}:${update.entityId}`;
                        const current = currentStates.get(key);
                        const updateData = preparedUpdates.get(key);
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
                        results.push(data);
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
                if (result.error?.includes('version_conflict')) {
                    conflicts++;
                    if (attempt < opts.maxRetries) {
                        const delay = Math.min(opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt), opts.maxRetryDelay);
                        await this.sleep(delay);
                        continue;
                    }
                }
                return {
                    success: false,
                    error: result.error,
                    conflicts
                };
            }
            catch (error) {
                if (attempt < opts.maxRetries) {
                    const delay = Math.min(opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt), opts.maxRetryDelay);
                    await this.sleep(delay);
                    continue;
                }
                return {
                    success: false,
                    error: `Coordinated update failed: ${error.message}`,
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
    async acquireDistributedLock(lockName, ttlSeconds = 30, options = {}) {
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
                if (error.code === '23505') {
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
            }
            catch (error) {
                if (attempt < opts.maxRetries) {
                    await this.sleep(opts.retryDelay);
                    continue;
                }
                return {
                    success: false,
                    error: `Lock acquisition failed: ${error.message}`
                };
            }
        }
        return {
            success: false,
            error: 'Failed to acquire distributed lock'
        };
    }
    async releaseDistributedLock(lockName, lockId) {
        try {
            const { error } = await this.client
                .from('distributed_locks')
                .delete()
                .eq('lock_name', lockName)
                .eq('lock_id', lockId);
            return !error;
        }
        catch (error) {
            return false;
        }
    }
    async executeWithLock(lockName, fn, ttlSeconds = 30, options = {}) {
        const lockResult = await this.acquireDistributedLock(lockName, ttlSeconds, options);
        if (!lockResult.success) {
            return {
                success: false,
                error: `Failed to acquire lock: ${lockResult.error}`
            };
        }
        const lockId = lockResult.data;
        try {
            const result = await fn();
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Execution failed: ${error.message}`
            };
        }
        finally {
            await this.releaseDistributedLock(lockName, lockId);
        }
    }
    generateLockId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async cleanupExpiredLocks(lockName) {
        try {
            let query = this.client
                .from('distributed_locks')
                .delete()
                .lt('expires_at', new Date().toISOString());
            if (lockName) {
                query = query.eq('lock_name', lockName);
            }
            await query;
        }
        catch (error) {
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ConcurrencyManager = ConcurrencyManager;
function createConcurrencyManager(client) {
    return new ConcurrencyManager(client);
}
