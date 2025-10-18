# Poker Engine Database - Technical Deep Dive
**Complete Table Analysis, Constraints, Relationships & Application Integration**

## Table of Contents
1. [Core Game Tables](#core-game-tables)
2. [Authentication & User Management](#authentication--user-management)
3. [Event Sourcing & Audit](#event-sourcing--audit)
4. [Configuration & Session Management](#configuration--session-management)
5. [Application Integration Points](#application-integration-points)
6. [Constraint Analysis](#constraint-analysis)
7. [Index Strategy](#index-strategy)

---

## Core Game Tables

### 1. `rooms` - Game Lobby Management
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host_user_id UUID REFERENCES auth.users(id),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    min_buy_in INTEGER NOT NULL,
    max_buy_in INTEGER NOT NULL,
    max_players INTEGER DEFAULT 9,
    is_private BOOLEAN DEFAULT false,
    lobby_status VARCHAR(20) DEFAULT 'waiting',
    game_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `rooms_small_blind_positive CHECK (small_blind > 0)`
- `rooms_big_blind_positive CHECK (big_blind > 0)`
- `rooms_min_buy_in_positive CHECK (min_buy_in > 0)`
- `rooms_max_buy_in_positive CHECK (max_buy_in > 0)`
- `rooms_max_players_range CHECK (max_players >= 2 AND max_players <= 10)`
- `rooms_lobby_status_check CHECK (lobby_status IN ('waiting', 'active', 'paused', 'ended'))`

**Indexes:**
- `idx_rooms_host_user_id` ON (host_user_id)
- `idx_rooms_invite_code` ON (invite_code)
- `idx_rooms_public_active` ON (is_private, lobby_status)
- `idx_rooms_created_at` ON (created_at)

**Application Integration:**
- **Created by:** `POST /api/rooms` in `sophisticated-engine-server.js:1687`
- **Queried by:** `GET /api/rooms/:roomId/lobby/players` in `sophisticated-engine-server.js:1750`
- **Updated by:** Room status changes in game lifecycle
- **WebSocket events:** Room updates broadcast to all connected clients

---

### 2. `room_players` - Lobby Player Management
```sql
CREATE TABLE room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    status VARCHAR(20) DEFAULT 'pending',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id)
);
```

**Constraints:**
- `room_players_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'left'))`
- `unique_user_room_player` UNIQUE (user_id, room_id)

**Indexes:**
- `idx_room_players_room_id` ON (room_id)
- `idx_room_players_user_id` ON (user_id)
- `idx_room_players_status` ON (status)

**Application Integration:**
- **Created by:** `POST /api/rooms/:roomId/lobby/join` in `sophisticated-engine-server.js:1720`
- **Updated by:** Host approval/rejection in lobby management
- **Queried by:** Lobby player list display
- **WebSocket events:** Player join/leave notifications

---

### 3. `room_seats` - Table Seating Management
```sql
CREATE TABLE room_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    seat_index INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'SEATED',
    chips_in_play INTEGER DEFAULT 0,
    sat_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);
```

**Constraints:**
- `room_seats_seat_index_range CHECK (seat_index >= 0 AND seat_index <= 9)`
- `room_seats_chips_non_negative CHECK (chips_in_play >= 0)`
- `room_seats_status_check CHECK (status IN ('SEATED', 'STANDING', 'AWAY'))`
- `unique_room_seat` UNIQUE (room_id, seat_index) WHERE left_at IS NULL
- `unique_user_room` UNIQUE (user_id, room_id) WHERE left_at IS NULL

**Indexes:**
- `idx_room_seats_room_id` ON (room_id)
- `idx_room_seats_user_id` ON (user_id)
- `idx_room_seats_seat_index` ON (seat_index)
- `idx_room_seats_status` ON (status)
- `idx_room_seats_active` ON (room_id, status) WHERE left_at IS NULL

**Application Integration:**
- **Created by:** `POST /api/rooms/:roomId/join` in `sophisticated-engine-server.js:1780`
- **Updated by:** Seat claiming and leaving
- **Queried by:** `syncPlayersFromRoomSeats()` in `sophisticated-engine-server.js:1850`
- **WebSocket events:** Seat changes broadcast to room

---

### 4. `room_spectators` - Observer Management
```sql
CREATE TABLE room_spectators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    joined_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `unique_spectator_room` UNIQUE (user_id, room_id)

**Indexes:**
- `idx_room_spectators_room_id` ON (room_id)
- `idx_room_spectators_user_id` ON (user_id)

**Application Integration:**
- **Created by:** Spectator join functionality
- **Queried by:** Spectator list display
- **WebSocket events:** Spectator join/leave notifications

---

## Game Execution Tables

### 5. `games` - Active Game Instances
```sql
CREATE TABLE games (
    id VARCHAR(100) PRIMARY KEY,
    room_id UUID REFERENCES rooms(id),
    status VARCHAR(20) DEFAULT 'waiting',
    current_hand INTEGER DEFAULT 0,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    ante INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);
```

**Constraints:**
- `games_status_check CHECK (status IN ('waiting', 'active', 'paused', 'ended'))`
- `games_small_blind_positive CHECK (small_blind > 0)`
- `games_big_blind_positive CHECK (big_blind > 0)`
- `games_ante_non_negative CHECK (ante >= 0)`

**Indexes:**
- `idx_games_room_id` ON (room_id)
- `idx_games_status` ON (status)
- `idx_games_created_at` ON (created_at)

**Application Integration:**
- **Created by:** `createGame()` in `sophisticated-engine-server.js:1950`
- **Updated by:** Game state machine transitions
- **Queried by:** Game state retrieval and display
- **WebSocket events:** Game status updates

---

### 6. `players` - Active Game Players
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    seat_number INTEGER NOT NULL,
    chips INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    position VARCHAR(20),
    is_dealer BOOLEAN DEFAULT false,
    is_small_blind BOOLEAN DEFAULT false,
    is_big_blind BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);
```

**Constraints:**
- `players_seat_number_range CHECK (seat_number >= 0 AND seat_number <= 9)`
- `players_chips_non_negative CHECK (chips >= 0)`
- `players_status_check CHECK (status IN ('active', 'folded', 'all_in', 'sitting_out', 'left'))`
- `unique_game_seat` UNIQUE (game_id, seat_number)
- `unique_game_user` UNIQUE (game_id, user_id)

**Indexes:**
- `idx_players_game_id` ON (game_id)
- `idx_players_user_id` ON (user_id)
- `idx_players_seat_number` ON (seat_number)
- `idx_players_status` ON (status)

**Application Integration:**
- **Created by:** `syncPlayersFromRoomSeats()` in `sophisticated-engine-server.js:1850`
- **Updated by:** Game state machine in `game-state-machine.ts`
- **Queried by:** Player state display and game logic
- **WebSocket events:** Player state changes

---

### 7. `hands` - Individual Poker Hands
```sql
CREATE TABLE hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'preflop',
    pot INTEGER DEFAULT 0,
    community_cards TEXT[], -- Array of card strings
    winner_user_id UUID, -- No FK constraint (allows guests)
    winning_hand TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
```

**Constraints:**
- `hands_hand_number_positive CHECK (hand_number > 0)`
- `hands_pot_non_negative CHECK (pot >= 0)`
- `hands_status_check CHECK (status IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'ended'))`
- `unique_game_hand_number` UNIQUE (game_id, hand_number)

**Indexes:**
- `idx_hands_game_id` ON (game_id)
- `idx_hands_hand_number` ON (hand_number)
- `idx_hands_status` ON (status)
- `idx_hands_created_at` ON (created_at)

**Application Integration:**
- **Created by:** `startHand()` in game state machine
- **Updated by:** Hand progression (preflop → flop → turn → river)
- **Queried by:** Hand history and current hand display
- **WebSocket events:** Hand state changes

---

### 8. `actions` - Player Actions
```sql
CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    action_type VARCHAR(20) NOT NULL,
    amount INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `actions_amount_non_negative CHECK (amount >= 0)`
- `actions_position_positive CHECK (position > 0)`
- `actions_action_type_check CHECK (action_type IN ('fold', 'call', 'raise', 'bet', 'check', 'all_in'))`
- `unique_hand_sequence` UNIQUE (hand_id, position)

**Indexes:**
- `idx_actions_hand_id` ON (hand_id)
- `idx_actions_user_id` ON (user_id)
- `idx_actions_action_type` ON (action_type)
- `idx_actions_position` ON (position)
- `idx_actions_created_at` ON (created_at)

**Application Integration:**
- **Created by:** `processAction()` in `game-state-machine.ts:245`
- **Queried by:** Action history and betting round logic
- **WebSocket events:** Action broadcasts to all players

---

### 9. `pots` - Pot Management
```sql
CREATE TABLE pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    pot_number INTEGER DEFAULT 1,
    amount INTEGER NOT NULL,
    eligible_players UUID[], -- Array of user IDs
    winner_user_id UUID, -- No FK constraint (allows guests)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `pots_pot_number_positive CHECK (pot_number > 0)`
- `pots_amount_positive CHECK (amount > 0)`

**Indexes:**
- `idx_pots_hand_id` ON (hand_id)
- `idx_pots_winner_user_id` ON (winner_user_id)

**Application Integration:**
- **Created by:** Pot creation during betting rounds
- **Updated by:** Pot distribution logic
- **Queried by:** Pot display and winner calculation

---

### 10. `hand_history` - Complete Hand Records
```sql
CREATE TABLE hand_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    hand_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_hand_history_game_id` ON (game_id)
- `idx_hand_history_hand_id` ON (hand_id)
- `idx_hand_history_created_at` ON (created_at)

**Application Integration:**
- **Created by:** Hand completion in game state machine
- **Queried by:** Hand replay and analysis features
- **WebSocket events:** Hand completion notifications

---

## Authentication & User Management

### 11. `user_profiles` - Application User Data
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- References auth.users(id) but no FK constraint
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    chips INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `user_profiles_username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 50)`
- `user_profiles_chips_non_negative CHECK (chips >= 0)`
- `user_profiles_username_key` UNIQUE (username)

**Indexes:**
- `idx_user_profiles_username` ON (username)
- `idx_user_profiles_display_name` ON (display_name)
- `idx_user_profiles_id` ON (id)
- `idx_user_profiles_is_online` ON (is_online)

**Application Integration:**
- **Created by:** `claimSeat()` in `sophisticated-engine-server.js:1780`
- **Updated by:** Profile editing functionality
- **Queried by:** User display and game participation
- **WebSocket events:** Profile updates

---

## Event Sourcing & Audit

### 12. `domain_events` - Event Store
```sql
CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    event_version INTEGER NOT NULL,
    correlation_id UUID,
    causation_id UUID,
    user_id UUID,
    sequence BIGSERIAL,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ
);
```

**Constraints:**
- `unique_aggregate_version` UNIQUE (aggregate_id, event_version)

**Indexes:**
- `idx_domain_events_aggregate` ON (aggregate_id)
- `idx_domain_events_aggregate_version` ON (aggregate_id, event_version)
- `idx_domain_events_type` ON (event_type)
- `idx_domain_events_sequence` ON (sequence)
- `idx_domain_events_timestamp` ON (event_timestamp)
- `idx_domain_events_processed` ON (processed)
- `idx_domain_events_correlation` ON (correlation_id)
- `idx_domain_events_user` ON (user_id)

**Application Integration:**
- **Created by:** `EventBus.publish()` in event sourcing system
- **Queried by:** Event replay and crash recovery
- **Updated by:** Event processing handlers

---

### 13. `event_snapshots` - Aggregate Snapshots
```sql
CREATE TABLE event_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    snapshot_data JSONB NOT NULL,
    snapshot_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `unique_snapshot_version` UNIQUE (aggregate_id, snapshot_version)

**Indexes:**
- `idx_event_snapshots_aggregate` ON (aggregate_id)

**Application Integration:**
- **Created by:** Snapshot creation in event sourcing
- **Queried by:** Fast aggregate reconstruction

---

### 14. `audit_log` - System Activity Log
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- No FK constraint (allows guests)
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_audit_log_user_id` ON (user_id)
- `idx_audit_log_action` ON (action)
- `idx_audit_log_table_name` ON (table_name)
- `idx_audit_log_created_at` ON (created_at)
- `idx_audit_log_resource` ON (table_name, record_id)

**Application Integration:**
- **Created by:** Audit triggers and application logging
- **Queried by:** Compliance and debugging

---

## Financial Tracking

### 15. `chips_transactions` - Financial Records
```sql
CREATE TABLE chips_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    transaction_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    game_id VARCHAR(100) REFERENCES games(id),
    hand_id UUID REFERENCES hands(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `chips_transactions_type_check CHECK (transaction_type IN ('buy_in', 'cash_out', 'win', 'loss', 'bonus', 'penalty'))`
- `chips_transactions_amount_non_zero CHECK (amount != 0)`

**Indexes:**
- `idx_chips_transactions_user_id` ON (user_id)
- `idx_chips_transactions_type` ON (transaction_type)
- `idx_chips_transactions_game_id` ON (game_id)
- `idx_chips_transactions_created_at` ON (created_at)

**Application Integration:**
- **Created by:** Chip movement tracking
- **Queried by:** Financial reporting and user balance

---

### 16. `chips_pending` - Pending Transfers
```sql
CREATE TABLE chips_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    amount INTEGER NOT NULL,
    game_id VARCHAR(100) REFERENCES games(id),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `chips_pending_amount_positive CHECK (amount > 0)`
- `chips_pending_status_check CHECK (status IN ('pending', 'completed', 'expired', 'cancelled'))`

**Indexes:**
- `idx_chips_pending_user_id` ON (user_id)
- `idx_chips_pending_status` ON (status)
- `idx_chips_pending_expires_at` ON (expires_at)

**Application Integration:**
- **Created by:** Pending transaction management
- **Updated by:** Transaction completion logic

---

## Configuration & Session Management

### 17. `table_stakes` - Stakes Configuration
```sql
CREATE TABLE table_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    min_buy_in INTEGER NOT NULL,
    max_buy_in INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `unique_user_room_stakes` UNIQUE (user_id, room_id)

**Indexes:**
- `idx_table_stakes_room_id` ON (room_id)
- `idx_table_stakes_user_id` ON (user_id)

**Application Integration:**
- **Created by:** Room configuration
- **Queried by:** Game setup and validation

---

### 18. `rejoin_tokens` - Reconnection Management
```sql
CREATE TABLE rejoin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `rejoin_tokens_expires_future CHECK (expires_at > created_at)`
- `unique_user_game_rejoin` UNIQUE (user_id, game_id)

**Indexes:**
- `idx_rejoin_tokens_user_id` ON (user_id)
- `idx_rejoin_tokens_game_id` ON (game_id)
- `idx_rejoin_tokens_token` ON (token)
- `idx_rejoin_tokens_expires_at` ON (expires_at)

**Application Integration:**
- **Created by:** Player disconnection handling
- **Queried by:** Reconnection validation

---

### 19. `user_sessions` - Legacy Session Management
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No FK constraint (allows guests)
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Application Integration:**
- **Legacy table** - being phased out in favor of Supabase auth

---

## Application Integration Points

### Core Integration Flow
```
1. User Authentication (Supabase) → user_profiles
2. Room Creation → rooms → room_players
3. Seat Claiming → room_seats
4. Game Start → games → players
5. Hand Execution → hands → actions → pots
6. Event Sourcing → domain_events
7. Financial Tracking → chips_transactions
```

### WebSocket Event Mapping
- **Room Events:** `room_created`, `player_joined`, `player_left`
- **Game Events:** `game_started`, `hand_started`, `action_taken`
- **Player Events:** `seat_claimed`, `chips_updated`, `status_changed`

### API Endpoint Mapping
- **Room Management:** `/api/rooms/*` → `rooms`, `room_players`, `room_seats`
- **Game Management:** `/api/games/*` → `games`, `players`, `hands`
- **User Management:** `/api/v2/user/*` → `user_profiles`
- **Event Sourcing:** `/api/v2/events/*` → `domain_events`

---

## Constraint Analysis

### Foreign Key Strategy
- **Core relationships:** Full FK constraints for data integrity
- **User references:** No FK constraints to support guest users
- **Cascade deletes:** Proper cleanup on parent deletion
- **Unique constraints:** Prevent duplicate relationships

### Data Validation
- **Range checks:** Seat numbers, chip amounts, player counts
- **Enum constraints:** Status fields, action types
- **Length limits:** Usernames, descriptions, text fields
- **Non-negative values:** Chips, amounts, counts

### Performance Constraints
- **Composite indexes:** For common query patterns
- **Partial indexes:** For filtered queries
- **Unique constraints:** With WHERE clauses for soft deletes

---

## Index Strategy

### Query Pattern Indexes
- **Lookup by ID:** Primary key indexes
- **Filter by status:** Status field indexes
- **Time-based queries:** Timestamp indexes
- **User-based queries:** User ID indexes
- **Game-based queries:** Game ID indexes

### Composite Indexes
- **Room + Status:** `(room_id, status)`
- **Game + User:** `(game_id, user_id)`
- **Hand + Position:** `(hand_id, position)`
- **User + Type:** `(user_id, transaction_type)`

### Specialized Indexes
- **Event sourcing:** Sequence and timestamp indexes
- **Audit trail:** Multi-column indexes for reporting
- **Financial data:** Amount and date range indexes
- **Session management:** Token and expiration indexes

---

This technical deep dive provides complete visibility into every table, constraint, relationship, and application integration point in your poker engine database.
