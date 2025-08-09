import { PokerGameEngine } from './index'
import { GameSettings } from './types'

describe('PokerGameEngine', () => {
  let engine: PokerGameEngine
  let settings: GameSettings

  beforeEach(() => {
    settings = {
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      timeBank: 30,
      autoFoldDelay: 10
    }
    engine = new PokerGameEngine(settings)
  })

  test('should create a new game with players', async () => {
    const players = [
      { id: '1', name: 'Alice', chips: 1000, position: 0 },
      { id: '2', name: 'Bob', chips: 1000, position: 1 },
      { id: '3', name: 'Charlie', chips: 1000, position: 2 }
    ]

    const gameState = await engine.startNewGame(players)

    expect(gameState.players).toHaveLength(3)
    expect(gameState.phase).toBe('preflop')
    expect(gameState.pot).toBe(30) // Small blind + big blind
    expect(gameState.players[0].isDealer).toBe(true)
    expect(gameState.players[1].isSmallBlind).toBe(true)
    expect(gameState.players[2].isBigBlind).toBe(true)
  })

  test('should handle player actions', async () => {
    const players = [
      { id: '1', name: 'Alice', chips: 1000, position: 0 },
      { id: '2', name: 'Bob', chips: 1000, position: 1 }
    ]

    await engine.startNewGame(players)
    
    // Alice folds
    const stateAfterFold = engine.handlePlayerAction('1', 'fold')
    expect(stateAfterFold.players[0].folded).toBe(true)
  })

  test('should validate illegal actions', async () => {
    const players = [
      { id: '1', name: 'Alice', chips: 1000, position: 0 },
      { id: '2', name: 'Bob', chips: 1000, position: 1 }
    ]

    await engine.startNewGame(players)
    
    // Try to check when there's a bet
    expect(() => {
      engine.handlePlayerAction('1', 'check')
    }).toThrow('Cannot check when there is a bet to call')
  })

  test('should advance phases correctly', async () => {
    const players = [
      { id: '1', name: 'Alice', chips: 1000, position: 0 },
      { id: '2', name: 'Bob', chips: 1000, position: 1 }
    ]

    await engine.startNewGame(players)
    
    // Both players call to advance to flop
    engine.handlePlayerAction('1', 'call')
    engine.handlePlayerAction('2', 'check')
    
    const state = engine.getState()
    expect(state.phase).toBe('flop')
    expect(state.communityCards).toHaveLength(3)
  })
}) 