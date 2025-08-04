// src/routes/gamePlayers.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/player/create
 * Body:
 *   - gameId:   string
 *   - userId:   string    // your UUID from cookie
 *   - position?: number
 *   - chips?:    number
 *   - isDealer?: boolean
 */
router.post('/create', async (req: Request, res: Response) => {
  const {
    gameId,
    userId,
    position = 0,
    chips    = 0,
    isDealer = false,
  } = req.body;

  if (!gameId || !userId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing required fields: gameId or userId' });
  }

  try {
    // 1) Attempt to find existing user
    let user = await prisma.user.findUnique({ where: { id: userId } });
    const count = await prisma.gamePlayer.count({ where: { gameId } });

    // 2) If not exists, create a guest user
    if (!user) {
      // generate 6‐char alphanumeric
      const rnd = randomBytes(4)            // 4 bytes → 6 base64 chars before slicing
        .toString('base64')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 6);
      const guestUsername = `guest-${rnd}`;

      user = await prisma.user.create({
        data: {
          id:       userId,
          email:    `${userId}@guest.local`,  // placeholder to satisfy unique constraint
          username: guestUsername,
        },
      });
    }

    const nextPosition = count;

    // 3) Create the GamePlayer record
            const player = await prisma.gamePlayer.create({
        data: {
            gameId,
            userId,
            position: nextPosition,
            chips,
            isDealer,
        },
        });

    return res.status(201).json({ success: true, player });
  } catch (error) {
    console.error('❌ Error creating player:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/list/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Missing gameId' });
  }
  try {
    // Fetch all GamePlayer rows for this game, including the related User record
    const players = await prisma.gamePlayer.findMany({
      where: { gameId },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    // Map into a simpler shape
    const result = players.map(p => ({
      id:       p.user.id,
      username: p.user.username,
      avatar:   p.user.avatar || null,
      joinedAt: p.joinedAt,
      isDealer: p.isDealer,
    }));
    return res.json({ success: true, players: result });
  } catch (err) {
    console.error('Error listing players:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
