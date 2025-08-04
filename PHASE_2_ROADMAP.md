# PHASE 2: BETTING & GAME LOGIC ROADMAP

## 📅 TIMELINE
**Week 3-4** - Game Logic phase

## 🎯 OVERVIEW
Implement the core betting logic and game flow that makes poker functional.

## 📋 POC BREAKDOWN

### 🏗️ POC 2.1: Betting Logic & Action Validation
**Goal**: Prove we can handle all betting actions correctly with proper validation

**Deliverables**:
- Action validation (fold, call, raise, check)
- Betting round management
- Pot calculation and side pot handling
- Min-raise logic and validation

**Success Criteria**:
- All betting actions validated correctly
- Pot calculation accurate for all scenarios
- Side pot handling working for all-in situations
- Min-raise logic implemented and enforced
- Action validation prevents invalid moves

**Dependencies**: 
- POC 1.1: Basic Card & Deck System
- POC 1.2: Hand Evaluation Engine
- POC 1.3: Basic Game State Management

---

### 🏗️ POC 2.2: Complete Hand Flow
**Goal**: Prove we can play a complete hand from start to finish with proper flow

**Deliverables**:
- Complete hand orchestration
- Blind posting and rotation
- Winner determination and pot distribution
- Hand history logging

**Success Criteria**:
- Complete hand flow working from deal to showdown
- Blind rotation working correctly
- Winner determination accurate for all scenarios
- Pot distribution correct for splits and side pots
- Hand history logged with all actions

**Dependencies**: POC 2.1: Betting Logic & Action Validation

---

### 🏗️ POC 2.3: Multi-Hand Game Continuity
**Goal**: Prove we can play multiple hands with persistent state and proper transitions

**Deliverables**:
- Hand-to-hand transition logic
- Player balance persistence
- Dealer button rotation
- Player removal/re-entry logic

**Success Criteria**:
- Multi-hand continuity working seamlessly
- Player balances persist correctly between hands
- Dealer button rotates properly
- Player management (add/remove/re-enter) working
- Game state recovery after disconnections

**Dependencies**: POC 2.2: Complete Hand Flow

---

## 🔧 TECHNICAL REQUIREMENTS

### Core Technologies
- **TypeScript**: All implementations in TypeScript
- **Jest**: Comprehensive testing framework
- **Node.js**: Runtime environment
- **State Management**: Game state persistence
- **Event System**: Action broadcasting

### Architecture Patterns
- **State Machine**: Game state transitions
- **Observer Pattern**: Action notifications
- **Command Pattern**: Action validation
- **Strategy Pattern**: Different betting strategies
- **Factory Pattern**: Action creation

### Code Quality Standards
- **TypeScript strict mode**: All type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **95%+ test coverage**: Comprehensive testing
- **Performance benchmarks**: < 50ms for actions

### File Structure
```
src/server/services/
├── bettingLogic.ts       # Betting action validation
├── potCalculator.ts      # Pot and side pot calculation
├── handOrchestrator.ts   # Complete hand flow
├── gameContinuity.ts     # Multi-hand management
└── actionValidator.ts    # Action validation logic

src/server/tests/
├── bettingLogic.test.ts  # Betting logic tests
├── potCalculator.test.ts # Pot calculation tests
├── handOrchestrator.test.ts # Hand flow tests
├── gameContinuity.test.ts # Multi-hand tests
└── integration.test.ts   # Integration tests
```

---

## 🚀 IMPLEMENTATION ORDER

### Day 1-3: POC 2.1 - Betting Logic & Action Validation
1. **Action Validation Implementation**
   - Fold, call, raise, check validation
   - Betting round management
   - Min-raise logic
   - Action state validation

2. **Pot Calculation Implementation**
   - Main pot calculation
   - Side pot calculation for all-ins
   - Pot distribution logic
   - Bet tracking

3. **Comprehensive Testing**
   - All betting action tests
   - Edge case testing
   - Performance benchmarking
   - Error handling tests

### Day 4-6: POC 2.2 - Complete Hand Flow
1. **Hand Orchestration Implementation**
   - Complete hand flow logic
   - Blind posting and rotation
   - Street progression integration
   - Winner determination

2. **Hand History Implementation**
   - Action logging
   - Hand history persistence
   - History retrieval
   - History analysis

3. **Integration Testing**
   - Complete hand flow tests
   - Blind rotation tests
   - Winner determination tests
   - Hand history tests

### Day 7-9: POC 2.3 - Multi-Hand Game Continuity
1. **Hand-to-Hand Transition**
   - Hand completion logic
   - New hand initialization
   - State cleanup and reset
   - Player balance updates

2. **Player Management**
   - Player addition/removal
   - Dealer button rotation
   - Balance persistence
   - Re-entry logic

3. **Recovery Mechanisms**
   - Disconnection handling
   - State recovery
   - Player reconnection
   - Game continuation

---

## ✅ SUCCESS VALIDATION

### POC 2.1 Validation
```bash
# Run betting logic tests
npm test -- --testNamePattern="Betting Logic"
npm test -- --testNamePattern="Action Validation"
npm test -- --testNamePattern="Pot Calculation"

# Expected results
✓ All betting actions validated correctly
✓ Pot calculation accurate
✓ Side pot handling working
✓ Min-raise logic enforced
✓ Performance < 50ms per action
```

### POC 2.2 Validation
```bash
# Run hand flow tests
npm test -- --testNamePattern="Hand Flow"
npm test -- --testNamePattern="Blind Rotation"
npm test -- --testNamePattern="Winner Determination"

# Expected results
✓ Complete hand flow working
✓ Blind rotation correct
✓ Winner determination accurate
✓ Hand history logged
✓ Performance benchmarks met
```

### POC 2.3 Validation
```bash
# Run multi-hand tests
npm test -- --testNamePattern="Game Continuity"
npm test -- --testNamePattern="Player Management"
npm test -- --testNamePattern="Recovery"

# Expected results
✓ Multi-hand continuity working
✓ Player balances persist
✓ Dealer button rotates
✓ Player management working
✓ Recovery mechanisms functional
```

---

## 🔗 DEPENDENCIES & INTEGRATION

### External Dependencies
- **Phase 1 Components**: Card, Deck, HandEvaluator, GameState
- **State Management**: Game state persistence
- **Event System**: Action broadcasting

### Internal Dependencies
- **POC 2.1 → POC 2.2**: Hand flow needs betting logic
- **POC 2.2 → POC 2.3**: Multi-hand needs hand flow
- **Phase 1 → Phase 2**: All POCs depend on foundation

### Integration Points
- **Betting Logic → Game State**: Actions update game state
- **Hand Flow → Hand Evaluation**: Showdown uses hand evaluation
- **Multi-Hand → State Management**: Hand transitions use state management

---

## 📊 PERFORMANCE TARGETS

### Betting Actions
- **Action validation**: < 10ms
- **Pot calculation**: < 5ms
- **Min-raise calculation**: < 1ms
- **Action processing**: < 50ms

### Hand Flow
- **Hand initialization**: < 100ms
- **Street progression**: < 50ms
- **Winner determination**: < 100ms
- **Pot distribution**: < 50ms

### Multi-Hand Operations
- **Hand transition**: < 200ms
- **Player management**: < 50ms
- **State recovery**: < 500ms
- **Balance updates**: < 10ms

---

## 🚨 RISK MITIGATION

### Technical Risks
- **State Consistency**: Comprehensive state validation
- **Race Conditions**: Proper action queuing
- **Performance Issues**: Benchmarking and optimization
- **Data Integrity**: Transaction-like operations

### Implementation Risks
- **Complexity**: Incremental development
- **Integration**: Extensive integration testing
- **Edge Cases**: Comprehensive test coverage
- **Recovery**: Robust error handling

---

## 📝 DOCUMENTATION REQUIREMENTS

### Code Documentation
- **JSDoc comments**: All public methods documented
- **State diagrams**: Game state transitions
- **Action flow**: Betting action sequences
- **API documentation**: Method signatures and examples

### User Documentation
- **Betting rules**: Action validation rules
- **Hand flow**: Complete hand sequence
- **Player management**: Add/remove/re-enter logic
- **Troubleshooting**: Common issues and solutions

---

## 🎯 NEXT PHASE PREPARATION

### Phase 3 Dependencies
- **POC 2.1**: Betting logic for API endpoints
- **POC 2.2**: Hand flow for real-time updates
- **POC 2.3**: Multi-hand for state persistence

### Architecture Considerations
- **API design**: Ready for REST endpoints
- **Real-time updates**: Prepared for WebSocket events
- **State persistence**: Optimized for database storage
- **Error handling**: Robust for production use

This roadmap ensures Phase 2 provides complete game logic functionality for the poker engine. 