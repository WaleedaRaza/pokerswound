import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { GameManager } from '../game-manager'

export function GameRoutes(prisma: PrismaClient, gameManager: GameManager) {
  const router = Router()

  // Get all games
  router.get('/', async (req, res) => {
    try {
      const games = await prisma.game.findMany({
        include: {
          players: {
            include: { user: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      res.json(games)
    } catch (error) {
      console.error('❌ Error fetching games:', error)
      res.status(500).json({ error: 'Failed to fetch games' })
    }
  })

  // Create a new game
  router.post('/', async (req, res) => {
    try {
      const { name, maxPlayers, buyIn, smallBlind, bigBlind, createdBy } = req.body
      
      const game = await gameManager.createGame({
        name,
        maxPlayers: maxPlayers || 9,
        buyIn: buyIn || 1000,
        smallBlind: smallBlind || 10,
        bigBlind: bigBlind || 20,
        createdBy
      })
      
      res.json(game)
    } catch (error) {
      console.error('❌ Error creating game:', error)
      res.status(500).json({ error: 'Failed to create game' })
    }
  })

  // Get a specific game
  router.get('/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params
      
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          players: {
            include: { user: true }
          },
          hands: {
            orderBy: { handNumber: 'desc' },
            take: 1
          }
        }
      })
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' })
      }
      
      res.json(game)
    } catch (error) {
      console.error('❌ Error fetching game:', error)
      res.status(500).json({ error: 'Failed to fetch game' })
    }
  })

  // Join a game
  router.post('/:gameId/join', async (req, res) => {
    try {
      const { gameId } = req.params
      const { userId } = req.body
      
      const success = await gameManager.joinGame(gameId, userId)
      
      if (success) {
        res.json({ success: true })
      } else {
        res.status(400).json({ error: 'Failed to join game' })
      }
    } catch (error) {
      console.error('❌ Error joining game:', error)
      res.status(500).json({ error: 'Failed to join game' })
    }
  })

  // Start a game
  router.post('/:gameId/start', async (req, res) => {
    try {
      const { gameId } = req.params
      
      const success = await gameManager.startGame(gameId)
      
      if (success) {
        res.json({ success: true })
      } else {
        res.status(400).json({ error: 'Failed to start game' })
      }
    } catch (error) {
      console.error('❌ Error starting game:', error)
      res.status(500).json({ error: 'Failed to start game' })
    }
  })

  // Get game state
  router.get('/:gameId/state', async (req, res) => {
    try {
      const { gameId } = req.params
      
      const gameState = await gameManager.getGameState(gameId)
      res.json(gameState)
    } catch (error) {
      console.error('❌ Error fetching game state:', error)
      res.status(500).json({ error: 'Failed to fetch game state' })
    }
  })

  return router
} 