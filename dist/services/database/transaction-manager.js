"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
exports.createTransactionManager = createTransactionManager;
exports.withTransaction = withTransaction;
class TransactionManager {
    constructor(client) {
        this.defaultOptions = {
            maxRetries: 3,
            retryDelay: 100,
            isolationLevel: 'READ_COMMITTED'
        };
        this.client = client;
    }
    async executeTransaction(transactionFn, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        let lastError = null;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const { data: txResult, error: txError } = await this.client.rpc('begin_transaction');
                if (txError) {
                    throw new Error(`Failed to start transaction: ${txError.message}`);
                }
                try {
                    const result = await transactionFn(this.client);
                    const { error: commitError } = await this.client.rpc('commit_transaction');
                    if (commitError) {
                        throw new Error(`Failed to commit transaction: ${commitError.message}`);
                    }
                    return {
                        success: true,
                        data: result,
                        retryCount: attempt
                    };
                }
                catch (error) {
                    try {
                        await this.client.rpc('rollback_transaction');
                    }
                    catch (rollbackError) {
                    }
                    throw error;
                }
            }
            catch (error) {
                lastError = error;
                if (!this.isRetryableError(error)) {
                    return {
                        success: false,
                        error: `Non-retryable error: ${lastError.message}`,
                        retryCount: attempt
                    };
                }
                if (attempt === opts.maxRetries) {
                    break;
                }
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
    async executeAtomicOperations(operations, options = {}) {
        return this.executeTransaction(async (client) => {
            const results = [];
            for (const operation of operations) {
                const result = await operation(client);
                results.push(result);
            }
            return results;
        }, options);
    }
    isRetryableError(error) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async updateWithVersion(table, id, updates, expectedVersion, options = {}) {
        return this.executeTransaction(async (client) => {
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
            const { data, error } = await client
                .from(table)
                .update({
                ...updates,
                version: expectedVersion + 1,
                updated_at: new Date().toISOString()
            })
                .eq('id', id)
                .eq('version', expectedVersion)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('version_conflict: Version changed during update');
                }
                throw new Error(`Update failed: ${error.message}`);
            }
            return data;
        }, options);
    }
    async batchInsertWithConflictResolution(table, records, conflictColumns, options = {}) {
        return this.executeTransaction(async (client) => {
            const results = [];
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
exports.TransactionManager = TransactionManager;
function createTransactionManager(client) {
    return new TransactionManager(client);
}
function withTransaction(transactionManager, options = {}) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const result = await transactionManager.executeTransaction(async () => method.apply(this, args), options);
            if (!result.success) {
                throw new Error(result.error || 'Transaction failed');
            }
            return result.data;
        };
        return descriptor;
    };
}
