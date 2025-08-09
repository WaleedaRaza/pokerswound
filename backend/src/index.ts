import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { GameManager } from './game-manager'
import { AuthMiddleware } from './middleware/auth'
import { GameRoutes } from './routes/game'
import { UserRoutes } from './routes/user'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const prisma = new PrismaClient()
const gameManager = new GameManager(prisma, io)

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/auth', UserRoutes(prisma))
app.use('/api/games', AuthMiddleware, GameRoutes(prisma, gameManager))

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id)
  
  // Join game room
  socket.on('join-game', async (data: { gameId: string, userId: string }) => {
    try {
      const { gameId, userId } = data
      
      // Verify user can join this game
      const gamePlayer = await prisma.gamePlayer.findFirst({
        where: { gameId, userId, isActive: true },
        include: { game: true, user: true }
      })
      
      if (!gamePlayer) {
        socket.emit('error', { message: 'Not authorized to join this game' })
        return
      }
      
      // Join the game room
      socket.join(`game:${gameId}`)
      socket.data.userId = userId
      socket.data.gameId = gameId
      
      console.log(`🎮 User ${userId} joined game ${gameId}`)
      
      // Send current game state
      const gameState = await gameManager.getGameState(gameId)
      socket.emit('game-state', gameState)
      
    } catch (error) {
      console.error('❌ Error joining game:', error)
      socket.emit('error', { message: 'Failed to join game' })
    }
  })
  
  // Player action
  socket.on('player-action', async (data: { action: string, amount?: number }) => {
    try {
      const { action, amount } = data
      const userId = socket.data.userId
      const gameId = socket.data.gameId
      
      if (!userId || !gameId) {
        socket.emit('error', { message: 'Not in a game' })
        return
      }
      
      console.log(`🎯 Player action: ${userId} -> ${action}${amount ? ` ($${amount})` : ''}`)
      
      // Process action through game manager
      const result = await gameManager.handlePlayerAction(gameId, userId, action, amount)
      
      if (result.success) {
        // Broadcast updated state to all players in the game
        const gameState = await gameManager.getGameState(gameId)
        io.to(`game:${gameId}`).emit('game-state', gameState)
      } else {
        socket.emit('error', { message: result.error })
      }
      
    } catch (error) {
      console.error('❌ Error processing player action:', error)
      socket.emit('error', { message: 'Failed to process action' })
    }
  })
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id)
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`)
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
  console.log(`🎮 Game Manager: Ready`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
}) 