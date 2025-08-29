# SYSTEM ARCHITECTURE

## Overview
The poker engine is built as a distributed, real-time system with clear separation of concerns, immutable state management, and bulletproof security. This document outlines the complete system architecture from high-level design to component interactions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web Client (React)  │  Mobile Client (React Native)  │  Admin Panel    │
└─────────────────────┬─────────────────────────────────┬─────────────────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │           GATEWAY LAYER           │
                    ├─────────────────────────────────────┤
                    │  Load Balancer  │  API Gateway   │  WebSocket Gateway │
                    └─────────────────┼─────────────────┼─────────────────────┘
                                      │                 │
                    ┌─────────────────▼─────────────────▼─────────────────────┐
                    │                        CORE LAYER                       │
                    ├─────────────────────────────────────────────────────────┤
                    │  Game Engine  │  State Manager  │  Action Processor   │
                    │  Round Manager │  Pot Manager   │  Hand Evaluator     │
                    └─────────────────┼─────────────────┼─────────────────────┘
                                      │                 │
                    ┌─────────────────▼─────────────────▼─────────────────────┐
                    │                     SERVICE LAYER                       │
                    ├─────────────────────────────────────────────────────────┤
                    │  Entropy Service │  Auth Service  │  Database Service  │
                    │  WebSocket Service│  Redis Service │  Monitoring Service│
                    └─────────────────┼─────────────────┼─────────────────────┘
                                      │                 │
                    ┌─────────────────▼─────────────────▼─────────────────────┐
                    │                      DATA LAYER                        │
                    ├─────────────────────────────────────────────────────────┤
                    │  PostgreSQL (Supabase)  │  Redis Cache  │  Audit Logs  │
                    └─────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Client Layer
**Purpose**: User interface and interaction
**Components**:
- **Web Client**: React SPA with real-time updates
- **Mobile Client**: React Native with native performance
- **Admin Panel**: Game monitoring and user management

**Responsibilities**:
- Render game state and UI
- Handle user interactions
- Manage WebSocket connections
- Provide responsive user experience

### 2. Gateway Layer
**Purpose**: Traffic management and routing
**Components**:
- **Load Balancer**: Distribute traffic across multiple servers
- **API Gateway**: Authentication, rate limiting, request routing
- **WebSocket Gateway**: Real-time event distribution

**Responsibilities**:
- SSL termination and security
- Request routing and load balancing
- Rate limiting and DDoS protection
- WebSocket connection management

### 3. Core Layer
**Purpose**: Game logic and state management
**Components**:
- **Game Engine**: Main orchestrator for game flow
- **State Manager**: Immutable state transitions
- **Action Processor**: Player action validation and execution
- **Round Manager**: Betting round management
- **Pot Manager**: Pot calculation and distribution
- **Hand Evaluator**: Hand ranking and winner determination

**Responsibilities**:
- Execute game logic
- Manage game state
- Process player actions
- Determine winners
- Handle betting rounds

### 4. Service Layer
**Purpose**: Business logic and external integrations
**Components**:
- **Entropy Service**: External randomness generation
- **Auth Service**: Authentication and authorization
- **Database Service**: Data persistence and retrieval
- **WebSocket Service**: Real-time communication
- **Redis Service**: Caching and session management
- **Monitoring Service**: Metrics and alerting

**Responsibilities**:
- Provide business logic services
- Handle external API integrations
- Manage data persistence
- Monitor system health

### 5. Data Layer
**Purpose**: Data storage and persistence
**Components**:
- **PostgreSQL (Supabase)**: Primary data store
- **Redis Cache**: Real-time state and session storage
- **Audit Logs**: Immutable event log

**Responsibilities**:
- Store persistent data
- Cache real-time state
- Maintain audit trail
- Ensure data integrity

## Data Flow Architecture

### 1. Player Action Flow
```
Player Action → WebSocket → Gateway → Core Engine → State Manager → Database → Broadcast
     ↓              ↓         ↓         ↓            ↓           ↓         ↓
   Client      Connection   Auth    Validation   State Update  Persist   Real-time
   Input       Management  Check   & Execution  (Immutable)   Data      Update
```

### 2. Game State Flow
```
Game State → State Manager → Database → Cache → WebSocket → Client
     ↓           ↓            ↓        ↓        ↓         ↓
  Current    Immutable    Persist   Cache    Broadcast  Render
  State      Update       State     State    Update     UI
```

### 3. Entropy Flow
```
External APIs → Entropy Service → Hash → Seed → Shuffle → Game Engine
      ↓            ↓            ↓      ↓      ↓         ↓
   YouTube/    Collection    SHA-256  RNG   Fisher-   Deal
   Twitch      & Validation           Seed   Yates    Cards
```

## State Management Architecture

### 1. Immutable State Pattern
**Principle**: Never modify existing state, always create new state
**Implementation**:
```typescript
interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: Pot;
  currentBet: number;
  street: Street;
  currentPlayerIndex: number;
  deck: Card[];
  entropySeed: string;
  lastActionTime: number;
}

class StateManager {
  createNewState(currentState: GameState, action: Action): GameState {
    // Create new state object, never modify existing
    return {
      ...currentState,
      // Apply changes to create new state
    };
  }
}
```

### 2. State Persistence Strategy
**Primary Storage**: PostgreSQL (Supabase)
- Complete game state snapshots
- Player data and balances
- Transaction history
- Audit logs

**Cache Storage**: Redis
- Active game states
- Player sessions
- Real-time data
- Event queues

### 3. State Synchronization
**Real-time Updates**: WebSocket broadcasting
**Fallback**: REST API for state recovery
**Consistency**: Event ordering and atomic updates

## Security Architecture

### 1. Multi-Layer Security
**Network Layer**:
- HTTPS/TLS encryption
- DDoS protection
- Rate limiting

**Application Layer**:
- JWT authentication
- Input validation
- SQL injection prevention

**Data Layer**:
- Database encryption
- Audit logging
- Access control

### 2. Anti-Cheating Measures
**Server-Side Validation**:
- All game logic server-side
- No client-trusted data
- Action validation
- State verification

**Fraud Detection**:
- Pattern analysis
- Timing analysis
- Collusion detection
- Anomaly detection

## Scalability Architecture

### 1. Horizontal Scaling
**Load Distribution**:
- Multiple server instances
- Load balancer distribution
- Session affinity
- Database sharding

**Auto-Scaling**:
- CPU-based scaling
- Memory-based scaling
- Connection-based scaling
- Queue-based scaling

### 2. Performance Optimization
**Caching Strategy**:
- Game state cache
- Player data cache
- Hand evaluation cache
- Connection pooling

**Database Optimization**:
- Query optimization
- Indexing strategy
- Read replicas
- Connection pooling

## Fault Tolerance Architecture

### 1. Redundancy
**Component Redundancy**:
- Multiple server instances
- Database replication
- Cache clustering
- Load balancer redundancy

**Geographic Redundancy**:
- Multi-region deployment
- Data center redundancy
- Network redundancy
- Backup systems

### 2. Recovery Strategies
**Automatic Recovery**:
- Health checks
- Auto-restart
- Failover mechanisms
- Circuit breakers

**Manual Recovery**:
- Backup restoration
- State reconstruction
- Data recovery
- System restoration

## Monitoring Architecture

### 1. Metrics Collection
**System Metrics**:
- CPU usage
- Memory usage
- Network I/O
- Disk I/O

**Application Metrics**:
- Game performance
- Player activity
- Error rates
- Response times

### 2. Alerting System
**Critical Alerts**:
- System down
- High error rate
- Performance degradation
- Security incidents

**Operational Alerts**:
- High load
- Memory pressure
- Database issues
- Network issues

## Deployment Architecture

### 1. Container Strategy
**Docker Containers**:
- Application containers
- Database containers
- Cache containers
- Monitoring containers

**Orchestration**:
- Docker Compose (development)
- Kubernetes (production)
- Service mesh
- Load balancing

### 2. Environment Strategy
**Development Environment**:
- Local development
- Docker Compose
- Hot reloading
- Debug tools

**Staging Environment**:
- Production-like setup
- Testing environment
- Performance testing
- Security testing

**Production Environment**:
- High availability
- Auto-scaling
- Monitoring
- Backup systems

## Technology Stack Integration

### 1. Backend Stack
**Runtime**: Node.js with TypeScript
**Framework**: NestJS/Express
**Database**: Supabase (PostgreSQL)
**Cache**: Redis
**Real-time**: WebSocket + Supabase Realtime

### 2. Frontend Stack
**Web**: React with TypeScript
**Mobile**: React Native
**State Management**: Redux Toolkit
**Real-time**: WebSocket client

### 3. Infrastructure Stack
**Hosting**: Render/Fly.io (Backend), Vercel (Frontend)
**Database**: Supabase
**Monitoring**: Sentry + Supabase Logs
**Security**: JWT, HTTPS, Rate Limiting

## Component Interactions

### 1. Game Engine Interactions
```
Game Engine
├── State Manager (state transitions)
├── Action Processor (player actions)
├── Round Manager (betting rounds)
├── Pot Manager (money management)
├── Hand Evaluator (winner determination)
└── WebSocket Service (real-time updates)
```

### 2. Service Layer Interactions
```
Entropy Service
├── YouTube API (external entropy)
├── Twitch API (external entropy)
├── System entropy (fallback)
└── Game Engine (seeded shuffle)

Auth Service
├── JWT generation/validation
├── User management
├── Session handling
└── Authorization checks

Database Service
├── PostgreSQL (Supabase)
├── Redis cache
├── Audit logging
└── Backup/recovery
```

### 3. Data Flow Interactions
```
Client Request
├── Gateway (routing/auth)
├── Core Engine (game logic)
├── Service Layer (business logic)
├── Data Layer (persistence)
└── Real-time Response
```

## Performance Characteristics

### 1. Response Time Targets
- **WebSocket events**: < 50ms
- **API responses**: < 200ms
- **Database queries**: < 100ms
- **State updates**: < 100ms

### 2. Throughput Requirements
- **Concurrent players**: 10,000
- **Simultaneous games**: 1,000
- **Actions per minute**: 100,000
- **Uptime**: 99.9%

### 3. Scalability Metrics
- **Horizontal scaling**: Linear with players
- **Database scaling**: Read replicas + sharding
- **Cache scaling**: Redis cluster
- **Network scaling**: CDN + load balancing

## Security Characteristics

### 1. Authentication
- **JWT tokens**: Stateless authentication
- **Session management**: Secure session handling
- **Rate limiting**: Prevent abuse
- **Input validation**: Sanitize all inputs

### 2. Authorization
- **Role-based access**: Player, Moderator, Admin
- **Resource-based access**: Game-specific permissions
- **Action-based access**: Action-specific permissions
- **Time-based access**: Session expiration

### 3. Data Protection
- **Encryption at rest**: Database encryption
- **Encryption in transit**: HTTPS/TLS
- **Audit logging**: Complete audit trail
- **Backup encryption**: Encrypted backups

## Reliability Characteristics

### 1. Fault Tolerance
- **Component redundancy**: Multiple instances
- **Geographic redundancy**: Multi-region
- **Network redundancy**: Multiple providers
- **Data redundancy**: Replication + backups

### 2. Recovery Capabilities
- **Automatic recovery**: Health checks + restart
- **Manual recovery**: Backup restoration
- **State recovery**: State reconstruction
- **Data recovery**: Point-in-time recovery

### 3. Monitoring Capabilities
- **Health monitoring**: Component health
- **Performance monitoring**: Response times
- **Error monitoring**: Error tracking
- **Security monitoring**: Security events

This system architecture provides a comprehensive, scalable, and secure foundation for the poker engine, ensuring reliability, performance, and maintainability throughout the development and deployment lifecycle. 