import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function UserRoutes(prisma: PrismaClient) {
  const router = Router()

  // Get all users
  router.get('/', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          chips: true,
          totalHandsPlayed: true,
          totalWinnings: true,
          biggestPot: true,
          createdAt: true
        }
      })
      res.json(users)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      res.status(500).json({ error: 'Failed to fetch users' })
    }
  })

  // Create a new user (simplified for demo)
  router.post('/register', async (req, res) => {
    try {
      const { username, email } = req.body
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
      
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' })
      }
      
      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          chips: 1000, // Starting chips
          totalHandsPlayed: 0,
          totalWinnings: 0,
          biggestPot: 0
        }
      })
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        chips: user.chips
      })
    } catch (error) {
      console.error('❌ Error creating user:', error)
      res.status(500).json({ error: 'Failed to create user' })
    }
  })

  // Get user by ID
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          chips: true,
          totalHandsPlayed: true,
          totalWinnings: true,
          biggestPot: true,
          createdAt: true
        }
      })
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      res.json(user)
    } catch (error) {
      console.error('❌ Error fetching user:', error)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  })

  // Get user's game history
  router.get('/:userId/history', async (req, res) => {
    try {
      const { userId } = req.params
      
      const history = await prisma.gameHistory.findMany({
        where: { userId },
        include: {
          game: true
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      })
      
      res.json(history)
    } catch (error) {
      console.error('❌ Error fetching user history:', error)
      res.status(500).json({ error: 'Failed to fetch user history' })
    }
  })

  // Create demo user (for testing)
  router.post('/demo', async (req, res) => {
    try {
      const demoUser = await prisma.user.create({
        data: {
          username: `demo_${Date.now()}`,
          email: `demo_${Date.now()}@example.com`,
          chips: 1000,
          totalHandsPlayed: 0,
          totalWinnings: 0,
          biggestPot: 0
        }
      })
      
      res.json({
        id: demoUser.id,
        username: demoUser.username,
        email: demoUser.email,
        chips: demoUser.chips
      })
    } catch (error) {
      console.error('❌ Error creating demo user:', error)
      res.status(500).json({ error: 'Failed to create demo user' })
    }
  })

  return router
} 