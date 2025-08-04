import express, { NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/create', async (req, res) => {
  console.log("Working! Creating game with data:", req.body);
  try {
    const {
      name,
      maxPlayers = 9,
      minPlayers = 2,
      smallBlind = 10,
      bigBlind = 20,
      buyIn = 1000,
      code = 0,
      adminUuid,
    } = req.body;

    // Validate required fields
    if (!name || !adminUuid) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name or adminUuid' });
    }

    const newGame = await prisma.game.create({
      data: {
        name,
        maxPlayers,
        minPlayers,
        smallBlind,
        bigBlind,
        buyIn,
        code,
        adminUuid,
      },
    });

    console.log('✅ Game created successfully:', newGame);
    return res.status(201).json({ success: true, game: newGame });
  } catch (error) {
    console.log('❌ Error creating game:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/fetch', async (req, res) => {
  try {
    const openGames = await prisma.game.findMany({
      where: { endedAt: null },
      orderBy: { createdAt: 'desc' },     // optional: newest first
    });
    return res.status(200).json({ success: true, games: openGames });
  } catch (error) {
    console.error('❌ Error fetching games:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


/**
 * POST /api/game/join
 * { gameId: string, userUuid: string }
 */
router.post('/join', async (req, res) => {
  console.log('🔍 POST /join body:', req.body);

  const { gameId, userUuid } = req.body;
  if (!gameId || !userUuid) {
    console.log('⚠️ Missing fields:', { gameId, userUuid });
    return res
      .status(400)
      .json({ success: false, error: 'Missing required fields: gameId or userUuid' });
  }

  try {
    // 1) Find the game by its ID, ensure it’s still open
    const game = await prisma.game.findFirst({
      where: { id: gameId, endedAt: null },
    });
    console.log('🎮 Found game:', game);

    if (!game) {
      console.log(`❌ No open game with id ${gameId}`);
      return res
        .status(404)
        .json({ success: false, error: `No open game found with id ${gameId}` });
    }

    // 2) Count active players to enforce maxPlayers
    const currentCount = await prisma.gamePlayer.count({
      where: { gameId: game.id, isActive: true },
    });
    console.log(`👥 Current player count for game ${game.id}:`, currentCount);

    if (currentCount >= game.maxPlayers) {
      console.log(`🚫 Game ${game.id} is full (maxPlayers=${game.maxPlayers})`);
      return res
        .status(400)
        .json({ success: false, error: 'Game is already full' });
    }

    // 3) Create the GamePlayer record
    const player = await prisma.gamePlayer.create({
      data: {
        gameId:   game.id,
        userId:   userUuid,
        position: currentCount,      // next seat
        chips:    game.buyIn,        // start with buy-in
        isDealer: false,
      },
    });
    console.log('➕ Created player:', player);

    return res.status(201).json({ success: true, game, player });
  } catch (error) {
    console.error('❌ Error joining game by id:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
