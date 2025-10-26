"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
exports.handleRepositoryError = handleRepositoryError;
exports.withErrorHandling = withErrorHandling;
const transaction_manager_1 = require("../transaction-manager");
const concurrency_manager_1 = require("../concurrency-manager");
class BaseRepository {
    constructor(client) {
        this.client = client;
        this.transactionManager = new transaction_manager_1.TransactionManager(client);
        this.concurrencyManager = new concurrency_manager_1.ConcurrencyManager(client);
    }
    async withTransaction(operation) {
        return this.transactionManager.executeTransaction(operation);
    }
    async withOptimisticLock(table, entityId, updateFn) {
        return this.concurrencyManager.updateWithOptimisticLock(table, entityId, updateFn);
    }
    async createEntity(table, data, validate) {
        return this.withTransaction(async (client) => {
            if (validate) {
                await validate(data);
            }
            const entityData = {
                ...data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 0
            };
            const { data: result, error } = await client
                .from(table)
                .insert(entityData)
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to create ${table}: ${error.message}`);
            }
            return result;
        });
    }
    async getEntity(table, id, expectedVersion) {
        const { data, error } = await this.client
            .from(table)
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get ${table}: ${error.message}`);
        }
        if (expectedVersion !== undefined && data.version !== expectedVersion) {
            throw new Error(`Version mismatch: expected ${expectedVersion}, got ${data.version}`);
        }
        return data;
    }
    async updateEntity(table, id, updates, expectedVersion) {
        if (expectedVersion !== undefined) {
            return this.concurrencyManager.updateWithOptimisticLock(table, id, async (current) => ({
                ...updates,
                updated_at: new Date().toISOString()
            }));
        }
        else {
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
                return data;
            });
        }
    }
    async deleteEntity(table, id, expectedVersion) {
        return this.withTransaction(async (client) => {
            let query = client.from(table).delete().eq('id', id);
            if (expectedVersion !== undefined) {
                query = query.eq('version', expectedVersion);
            }
            const { error } = await query;
            if (error) {
                throw new Error(`Failed to delete ${table}: ${error.message}`);
            }
        });
    }
    async countEntities(table, filters = {}) {
        let query = this.client.from(table).select('*', { count: 'exact', head: true });
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }
        const { count, error } = await query;
        if (error) {
            throw new Error(`Failed to count ${table}: ${error.message}`);
        }
        return count || 0;
    }
    async listEntities(table, options = {}) {
        let query = this.client.from(table).select('*');
        if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
                query = query.eq(key, value);
            }
        }
        if (options.orderBy) {
            query = query.order(options.orderBy, { ascending: options.ascending ?? true });
        }
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
        return (data || []);
    }
    async executeQuery(query, params = {}) {
        const { data, error } = await this.client.rpc(query, params);
        if (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
        return (data || []);
    }
    async logMetric(name, value, type = 'gauge', tags = {}) {
        try {
            await this.client.from('performance_metrics').insert({
                metric_name: name,
                metric_value: value,
                metric_type: type,
                tags
            });
        }
        catch (error) {
            console.warn('Failed to log metric:', error);
        }
    }
    async logError(type, message, stack, context = {}, severity = 'error') {
        try {
            await this.client.from('error_logs').insert({
                error_type: type,
                error_message: message,
                error_stack: stack,
                context,
                severity
            });
        }
        catch (error) {
            console.error('Failed to log error:', error);
        }
    }
}
exports.BaseRepository = BaseRepository;
function handleRepositoryError(error, operation, table) {
    const message = `${operation} failed for ${table}: ${error.message || error}`;
    console.error(message, { error, operation, table });
    throw new Error(message);
}
function withErrorHandling(table) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const startTime = Date.now();
            try {
                const result = await method.apply(this, args);
                await this.logMetric(`${table}.${propertyName}.duration`, Date.now() - startTime, 'histogram', { table, operation: propertyName, success: true });
                return result;
            }
            catch (error) {
                await this.logMetric(`${table}.${propertyName}.duration`, Date.now() - startTime, 'histogram', { table, operation: propertyName, success: false });
                await this.logError(`${table}.${propertyName}`, error.message, error.stack, { table, operation: propertyName, args });
                throw error;
            }
        };
        return descriptor;
    };
}
