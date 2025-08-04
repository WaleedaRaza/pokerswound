# QUICK START: POC 1.1 - CARD & DECK SYSTEM

## PREREQUISITES
- Node.js 18+ installed
- TypeScript configured
- Jest for testing
- Environment variables for API keys

## STEP 1: SETUP ENVIRONMENT

### 1.1 Install Dependencies
```bash
# Install required packages
npm install axios crypto
npm install --save-dev @types/node jest @types/jest ts-jest
```

### 1.2 Configure Jest
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
```

### 1.3 Set Environment Variables
Create `.env`:
```bash
# YouTube API (optional)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Twitch API (optional)
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here
```

## STEP 2: IMPLEMENT CORE FILES

### 2.1 Create Card Service
```bash
mkdir -p src/server/services
touch src/server/services/card.ts
```

Copy the Card class implementation from `POC_1.1_IMPLEMENTATION.md`

### 2.2 Create Entropy Service
```bash
touch src/server/services/entropyService.ts
```

Copy the EntropyService implementation from `POC_1.1_IMPLEMENTATION.md`

### 2.3 Create Deck Service
```bash
touch src/server/services/deck.ts
```

Copy the Deck class implementation from `POC_1.1_IMPLEMENTATION.md`

## STEP 3: CREATE TESTS

### 3.1 Create Test Directory
```bash
mkdir -p src/server/tests
```

### 3.2 Create Test Files
```bash
touch src/server/tests/card.test.ts
touch src/server/tests/integration.test.ts
touch src/server/tests/performance.test.ts
```

Copy the test implementations from `POC_1.1_IMPLEMENTATION.md`

## STEP 4: RUN TESTS

### 4.1 Add Test Script
Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 4.2 Run Tests
```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="Card Creation"

# Run with coverage
npm run test:coverage
```

## STEP 5: VALIDATE SUCCESS

### 5.1 Check Test Results
All tests should pass:
```bash
✓ Card System
  ✓ Card Creation
    ✓ should create card from string
    ✓ should create card from ID
    ✓ should convert card to string
    ✓ should convert card to ID
    ✓ should handle invalid card string
  ✓ Card Comparison
    ✓ should compare cards correctly
    ✓ should check card equality

✓ Deck System
  ✓ Deck Creation
    ✓ should create standard 52-card deck
    ✓ should have all cards unique
  ✓ Deck Operations
    ✓ should draw cards correctly
    ✓ should draw multiple cards
    ✓ should handle empty deck
    ✓ should reset deck
  ✓ Deck Shuffling
    ✓ should shuffle deck
    ✓ should maintain all cards after shuffle
  ✓ Deck Serialization
    ✓ should serialize and deserialize correctly

✓ Card & Deck Integration
  ✓ should create and shuffle deck with entropy
  ✓ should handle entropy service
  ✓ should deal poker hands correctly

✓ Performance Tests
  ✓ should shuffle deck quickly
  ✓ should handle multiple shuffles
```

### 5.2 Manual Testing
```bash
# Create a simple test script
touch test-manual.js
```

```javascript
const { Card, Rank, Suit } = require('./dist/server/services/card');
const { Deck } = require('./dist/server/services/deck');

async function testManual() {
  console.log('🧪 Manual Testing POC 1.1');
  console.log('==========================');
  
  // Test card creation
  console.log('\n1. Testing Card Creation:');
  const card = Card.fromString('Ah');
  console.log(`Card from string: ${card.toString()}`);
  
  // Test deck operations
  console.log('\n2. Testing Deck Operations:');
  const deck = new Deck();
  console.log(`Deck created with ${deck.remainingCards()} cards`);
  
  // Test shuffling
  console.log('\n3. Testing Shuffling:');
  await deck.shuffle();
  console.log('Deck shuffled successfully');
  
  // Test dealing
  console.log('\n4. Testing Dealing:');
  const hand = deck.drawCards(5);
  console.log(`Dealt 5 cards: ${hand.map(c => c.toString()).join(', ')}`);
  console.log(`Remaining cards: ${deck.remainingCards()}`);
  
  console.log('\n✅ All manual tests passed!');
}

testManual().catch(console.error);
```

## STEP 6: TROUBLESHOOTING

### 6.1 Common Issues

**Issue**: TypeScript compilation errors
```bash
# Solution: Check tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Issue**: Jest not finding tests
```bash
# Solution: Check jest.config.js paths
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
```

**Issue**: Entropy service failing
```bash
# Solution: Check environment variables
echo $YOUTUBE_API_KEY
echo $TWITCH_CLIENT_ID
echo $TWITCH_CLIENT_SECRET

# If not set, the service will fall back to system entropy
```

### 6.2 Performance Issues

**Issue**: Shuffling too slow
```bash
# Solution: Check entropy service timeout
# Add timeout to axios requests
const response = await axios.get(url, { timeout: 5000 });
```

**Issue**: Memory leaks
```bash
# Solution: Check for circular references in serialization
# Ensure proper cleanup in tests
afterEach(() => {
  jest.clearAllMocks();
});
```

## STEP 7: NEXT STEPS

### 7.1 Document APIs
```bash
# Create API documentation
touch API_DOCUMENTATION.md
```

### 7.2 Set up CI/CD
```bash
# Create GitHub Actions workflow
mkdir -p .github/workflows
touch .github/workflows/test.yml
```

### 7.3 Prepare for POC 1.2
```bash
# Create hand evaluation directory
mkdir -p src/server/services/handEvaluation
```

## SUCCESS CHECKLIST

- [ ] All tests pass
- [ ] Card creation works correctly
- [ ] Deck shuffling works with entropy
- [ ] Performance benchmarks met
- [ ] Error handling works
- [ ] Documentation complete
- [ ] Ready for POC 1.2

## COMMANDS SUMMARY

```bash
# Setup
npm install axios crypto
npm install --save-dev @types/node jest @types/jest ts-jest

# Build
npm run build

# Test
npm test
npm test -- --testNamePattern="Card Creation"
npm run test:coverage

# Manual test
node test-manual.js
```

This quick start guide ensures you can implement POC 1.1 successfully and have a working foundation for the poker engine. 