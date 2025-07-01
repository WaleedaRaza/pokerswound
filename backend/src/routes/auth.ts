import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { body, validationResult } from 'express-validator';
import * as store from '../auth/userStore';
import { signAccessToken, signRefreshToken, verifyToken } from '../auth/jwt';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';

const router = Router();

const emailV = body('email').isEmail().normalizeEmail();
const passV  = body('password').isLength({ min: 8 });


interface RegisterBody {
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

type Req<B = unknown> = Request<{}, {}, B>;
type Res<R = unknown> = Response<R>;

router.post(
  '/register',
  [emailV, passV],
  async (req: Req<RegisterBody>, res: Res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    if (await store.findByEmail(email)) {
      return res.status(409).json({ msg: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: uuid(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
      lifetimeWinnings: 0,
      lifetimeLosses: 0,
    };
    await store.add(user);

    res.status(201).json({ msg: 'Account created' });
  }
);

router.post(
  '/login',
  [emailV, passV],
  async (req: Req<LoginBody>, res: Res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await store.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const access  = signAccessToken(user);
    const refresh = signRefreshToken(user);

    // Send the refresh token in an HttpOnly cookie (XSS-safe)
    res.cookie('refreshToken', refresh, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure:   false,               // still fine on plain HTTP localhost
      maxAge:   1000 * 60 * 60 * 24 * 7,
    });
    console.log("Email logged in: " + email);
    return res.json({ access });
  }
);

router.get('/me', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) 
  {
    console.log("Sent 401 status 1");
    return res.sendStatus(401);
  }

  try {
    const payload = verifyToken(token);              // { sub: <user-id> }
    const user = await prisma.user.findUnique({      // 1️⃣  use the id
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) 
    {
      console.log("Sent 401 status 2");
      return res.sendStatus(401);
    }
    console.log("Sending /me: " + user.email + " " + user.id);
    return res.json({ user });
  } catch {
    console.log("Sent 401 status 3");
    return res.sendStatus(401);
  }
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({      // 1️⃣  same here
      where: { id: payload.sub },
    });
    if (!user) return res.sendStatus(401);

    const access = signAccessToken(user);
    res.json({ access });
  } catch {
    res.sendStatus(401);
  }
});

export default router;
