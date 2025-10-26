"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresEventStore = void 0;
const IEventStore_1 = require("../../common/interfaces/IEventStore");
class PostgresEventStore {
    constructor(pool) {
        this.pool = pool;
    }
    async append(event) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const latestVersion = await this.getLatestVersionWithClient(client, event.aggregateId);
            if (event.version <= latestVersion) {
                throw new IEventStore_1.VersionConflictError(event.aggregateId, event.version, latestVersion);
            }
            const result = await client.query(`
        INSERT INTO domain_events (
          event_type,
          aggregate_type,
          aggregate_id,
          event_data,
          metadata,
          version,
          causation_id,
          correlation_id,
          user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          event_data,
          metadata,
          version,
          event_timestamp,
          sequence_number,
          causation_id,
          correlation_id,
          user_id
        `, [
                event.eventType,
                event.aggregateType,
                event.aggregateId,
                JSON.stringify(event.eventData),
                event.metadata ? JSON.stringify(event.metadata) : '{}',
                event.version,
                event.causationId || null,
                event.correlationId || null,
                event.userId || null,
            ]);
            await client.query('COMMIT');
            const row = result.rows[0];
            return this.mapRowToDomainEvent(row);
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof IEventStore_1.VersionConflictError) {
                throw error;
            }
            throw new IEventStore_1.EventAppendError(`Failed to append event for aggregate ${event.aggregateId}`, error);
        }
        finally {
            client.release();
        }
    }
    async appendMany(events) {
        if (events.length === 0) {
            return [];
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const savedEvents = [];
            for (const event of events) {
                const latestVersion = await this.getLatestVersionWithClient(client, event.aggregateId);
                if (event.version <= latestVersion) {
                    throw new IEventStore_1.VersionConflictError(event.aggregateId, event.version, latestVersion);
                }
                const result = await client.query(`
          INSERT INTO domain_events (
            event_type,
            aggregate_type,
            aggregate_id,
            event_data,
            metadata,
            version,
            causation_id,
            correlation_id,
            user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING 
            id,
            event_type,
            aggregate_type,
            aggregate_id,
            event_data,
            metadata,
            version,
            timestamp,
            sequence_number,
            causation_id,
            correlation_id,
            user_id
          `, [
                    event.eventType,
                    event.aggregateType,
                    event.aggregateId,
                    JSON.stringify(event.eventData),
                    event.metadata ? JSON.stringify(event.metadata) : '{}',
                    event.version,
                    event.causationId || null,
                    event.correlationId || null,
                    event.userId || null,
                ]);
                savedEvents.push(this.mapRowToDomainEvent(result.rows[0]));
            }
            await client.query('COMMIT');
            return savedEvents;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof IEventStore_1.VersionConflictError) {
                throw error;
            }
            throw new IEventStore_1.EventAppendError('Failed to append events', error);
        }
        finally {
            client.release();
        }
    }
    async getByAggregate(aggregateId, fromVersion = 0) {
        try {
            const result = await this.pool.query(`
        SELECT 
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          event_data,
          metadata,
          version,
          event_timestamp,
          sequence_number,
          causation_id,
          correlation_id,
          user_id
        FROM domain_events
        WHERE aggregate_id = $1
          AND version > $2
        ORDER BY version ASC
        `, [aggregateId, fromVersion]);
            return result.rows.map(row => this.mapRowToDomainEvent(row));
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get events for aggregate ${aggregateId}`, error);
        }
    }
    async getByType(eventType, limit = 100) {
        try {
            const result = await this.pool.query(`
        SELECT 
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          event_data,
          metadata,
          version,
          event_timestamp,
          sequence_number,
          causation_id,
          correlation_id,
          user_id
        FROM domain_events
        WHERE event_type = $1
        ORDER BY event_timestamp DESC
        LIMIT $2
        `, [eventType, limit]);
            return result.rows.map(row => this.mapRowToDomainEvent(row));
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get events by type ${eventType}`, error);
        }
    }
    async query(filter) {
        try {
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (filter.aggregateId) {
                conditions.push(`aggregate_id = $${paramIndex++}`);
                params.push(filter.aggregateId);
            }
            if (filter.aggregateType) {
                conditions.push(`aggregate_type = $${paramIndex++}`);
                params.push(filter.aggregateType);
            }
            if (filter.eventType) {
                if (Array.isArray(filter.eventType)) {
                    conditions.push(`event_type = ANY($${paramIndex++})`);
                    params.push(filter.eventType);
                }
                else {
                    conditions.push(`event_type = $${paramIndex++}`);
                    params.push(filter.eventType);
                }
            }
            if (filter.userId) {
                conditions.push(`user_id = $${paramIndex++}`);
                params.push(filter.userId);
            }
            if (filter.correlationId) {
                conditions.push(`correlation_id = $${paramIndex++}`);
                params.push(filter.correlationId);
            }
            if (filter.fromTimestamp) {
                conditions.push(`event_timestamp >= $${paramIndex++}`);
                params.push(filter.fromTimestamp);
            }
            if (filter.toTimestamp) {
                conditions.push(`event_timestamp <= $${paramIndex++}`);
                params.push(filter.toTimestamp);
            }
            if (filter.fromVersion !== undefined) {
                conditions.push(`version >= $${paramIndex++}`);
                params.push(filter.fromVersion);
            }
            if (filter.toVersion !== undefined) {
                conditions.push(`version <= $${paramIndex++}`);
                params.push(filter.toVersion);
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            let orderBy = filter.orderBy || 'timestamp';
            if (orderBy === 'timestamp') {
                orderBy = 'event_timestamp';
            }
            const orderDirection = filter.orderDirection || 'DESC';
            const orderClause = `ORDER BY ${orderBy} ${orderDirection}`;
            let limitClause = '';
            if (filter.limit) {
                limitClause = `LIMIT $${paramIndex++}`;
                params.push(filter.limit);
                if (filter.offset) {
                    limitClause += ` OFFSET $${paramIndex++}`;
                    params.push(filter.offset);
                }
            }
            const query = `
        SELECT 
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          event_data,
          metadata,
          version,
          event_timestamp,
          sequence_number,
          causation_id,
          correlation_id,
          user_id
        FROM domain_events
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;
            const result = await this.pool.query(query, params);
            return result.rows.map(row => this.mapRowToDomainEvent(row));
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError('Failed to query events', error);
        }
    }
    async getStream(aggregateId, fromVersion = 0) {
        return this.getByAggregate(aggregateId, fromVersion);
    }
    async getLatestVersion(aggregateId) {
        try {
            const result = await this.pool.query(`
        SELECT COALESCE(MAX(version), 0) as latest_version
        FROM domain_events
        WHERE aggregate_id = $1
        `, [aggregateId]);
            return parseInt(result.rows[0].latest_version, 10);
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get latest version for aggregate ${aggregateId}`, error);
        }
    }
    async exists(aggregateId) {
        try {
            const result = await this.pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM domain_events WHERE aggregate_id = $1
        ) as exists
        `, [aggregateId]);
            return result.rows[0].exists;
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to check existence of aggregate ${aggregateId}`, error);
        }
    }
    async getEventCount(aggregateId) {
        try {
            const result = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM domain_events
        WHERE aggregate_id = $1
        `, [aggregateId]);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get event count for aggregate ${aggregateId}`, error);
        }
    }
    async saveSnapshot(snapshot) {
        try {
            const result = await this.pool.query(`
        INSERT INTO event_snapshots (
          aggregate_type,
          aggregate_id,
          snapshot_data,
          version,
          event_count,
          snapshot_reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          aggregate_type,
          aggregate_id,
          snapshot_data,
          version,
          created_at,
          event_count,
          snapshot_reason
        `, [
                snapshot.aggregateType,
                snapshot.aggregateId,
                JSON.stringify(snapshot.snapshotData),
                snapshot.version,
                snapshot.eventCount || null,
                snapshot.snapshotReason || 'manual',
            ]);
            const row = result.rows[0];
            return {
                id: row.id,
                aggregateType: row.aggregate_type,
                aggregateId: row.aggregate_id,
                snapshotData: row.snapshot_data,
                version: row.version,
                createdAt: row.created_at,
                eventCount: row.event_count,
                snapshotReason: row.snapshot_reason,
            };
        }
        catch (error) {
            throw new IEventStore_1.EventStoreError(`Failed to save snapshot for aggregate ${snapshot.aggregateId}`);
        }
    }
    async getLatestSnapshot(aggregateId) {
        try {
            const result = await this.pool.query(`
        SELECT 
          id,
          aggregate_type,
          aggregate_id,
          snapshot_data,
          version,
          created_at,
          event_count,
          snapshot_reason
        FROM event_snapshots
        WHERE aggregate_id = $1
        ORDER BY version DESC
        LIMIT 1
        `, [aggregateId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                aggregateType: row.aggregate_type,
                aggregateId: row.aggregate_id,
                snapshotData: row.snapshot_data,
                version: row.version,
                createdAt: row.created_at,
                eventCount: row.event_count,
                snapshotReason: row.snapshot_reason,
            };
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get latest snapshot for aggregate ${aggregateId}`, error);
        }
    }
    async getSnapshotAtVersion(aggregateId, version) {
        try {
            const result = await this.pool.query(`
        SELECT 
          id,
          aggregate_type,
          aggregate_id,
          snapshot_data,
          version,
          created_at,
          event_count,
          snapshot_reason
        FROM event_snapshots
        WHERE aggregate_id = $1
          AND version <= $2
        ORDER BY version DESC
        LIMIT 1
        `, [aggregateId, version]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                aggregateType: row.aggregate_type,
                aggregateId: row.aggregate_id,
                snapshotData: row.snapshot_data,
                version: row.version,
                createdAt: row.created_at,
                eventCount: row.event_count,
                snapshotReason: row.snapshot_reason,
            };
        }
        catch (error) {
            throw new IEventStore_1.EventQueryError(`Failed to get snapshot at version ${version} for aggregate ${aggregateId}`, error);
        }
    }
    async getLatestVersionWithClient(client, aggregateId) {
        const result = await client.query(`
      SELECT COALESCE(MAX(version), 0) as latest_version
      FROM domain_events
      WHERE aggregate_id = $1
      `, [aggregateId]);
        return parseInt(result.rows[0].latest_version, 10);
    }
    mapRowToDomainEvent(row) {
        return {
            id: row.id,
            eventType: row.event_type,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            eventData: row.event_data,
            metadata: row.metadata,
            version: row.version,
            timestamp: row.event_timestamp,
            sequenceNumber: row.sequence_number ? parseInt(row.sequence_number, 10) : undefined,
            causationId: row.causation_id,
            correlationId: row.correlation_id,
            userId: row.user_id,
        };
    }
}
exports.PostgresEventStore = PostgresEventStore;
