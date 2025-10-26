"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStoreRepository = void 0;
class EventStoreRepository {
    constructor(db) {
        this.db = db;
    }
    async append(event) {
        const query = `
      INSERT INTO domain_events (
        id, event_type, aggregate_type, aggregate_id, event_data, 
        version, user_id, metadata, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, 
        $5, $6, $7, NOW()
      )
      RETURNING id, aggregate_id as game_id, event_type, event_data, version, user_id, created_at, id as sequence
    `;
        const values = [
            event.eventType,
            'Game',
            event.gameId,
            event.eventData,
            event.version || 1,
            event.userId || null,
            event.metadata || {}
        ];
        const result = await this.db.query(query, values);
        const row = result.rows[0];
        return {
            id: row.id,
            gameId: row.game_id,
            eventType: row.event_type,
            eventData: row.event_data,
            version: row.version,
            userId: row.user_id,
            timestamp: row.created_at,
            sequence: 0
        };
    }
    async getEventsByGameId(gameId, fromSequence) {
        const query = 'SELECT *, aggregate_id as game_id FROM domain_events WHERE aggregate_type = \'Game\' AND aggregate_id = $1 ORDER BY created_at ASC';
        const values = [gameId];
        const result = await this.db.query(query, values);
        return result.rows.map(row => ({
            id: row.id,
            gameId: row.game_id,
            eventType: row.event_type,
            eventData: row.event_data,
            version: row.version,
            userId: row.user_id,
            timestamp: row.created_at,
            sequence: 0
        }));
    }
    async getEventsByType(eventType, limit = 100) {
        const result = await this.db.query('SELECT *, aggregate_id as game_id FROM domain_events WHERE aggregate_type = \'Game\' AND event_type = $1 ORDER BY created_at DESC LIMIT $2', [eventType, limit]);
        return result.rows.map(row => ({
            id: row.id,
            gameId: row.game_id,
            eventType: row.event_type,
            eventData: row.event_data,
            version: row.version,
            userId: row.user_id,
            timestamp: row.created_at,
            sequence: 0
        }));
    }
    async getLatestSequence(gameId) {
        const result = await this.db.query('SELECT COUNT(*) as count FROM domain_events WHERE aggregate_type = \'Game\' AND aggregate_id = $1', [gameId]);
        return parseInt(result.rows[0]?.count) || 0;
    }
    async getEventCount(gameId) {
        const result = await this.db.query('SELECT COUNT(*) as count FROM domain_events WHERE aggregate_type = \'Game\' AND aggregate_id = $1', [gameId]);
        return parseInt(result.rows[0].count);
    }
    async getEventsByTimeRange(gameId, startTime, endTime) {
        const result = await this.db.query(`SELECT *, aggregate_id as game_id
       FROM domain_events 
       WHERE aggregate_type = 'Game' 
       AND aggregate_id = $1 
       AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC`, [gameId, startTime, endTime]);
        return result.rows.map(row => ({
            id: row.id,
            gameId: row.game_id,
            eventType: row.event_type,
            eventData: row.event_data,
            version: row.version,
            userId: row.user_id,
            timestamp: row.created_at,
            sequence: 0
        }));
    }
}
exports.EventStoreRepository = EventStoreRepository;
