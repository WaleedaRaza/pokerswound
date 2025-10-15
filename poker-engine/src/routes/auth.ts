/**
 * Authentication API Routes
 */

import { Router, Request, Response } from 'express'
import { authService } from '../lib/auth-simple'

const router = Router()

// Middleware to extract token from Authorization header
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, username, password, display_name } = req.body

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, and password are required'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      })
    }

    const result = await authService.signup(email, username, password, display_name)

    if (!result.success) {
      return res.status(400).json(result)
    }

    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token
    })

  } catch (error) {
    console.error('Signup route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      })
    }

    const result = await authService.login(email, password)

    if (!result.success) {
      return res.status(401).json(result)
    }

    res.json({
      success: true,
      user: result.user,
      token: result.token
    })

  } catch (error) {
    console.error('Login route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})


/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    const user = await authService.verifyToken(token)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    res.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Me route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    const user = await authService.verifyToken(token)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    const { display_name, avatar_url, username } = req.body

    const updatedUser = await authService.updateProfile(user.id, {
      display_name,
      avatar_url,
      username
    })

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update profile'
      })
    }

    res.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Profile update route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router