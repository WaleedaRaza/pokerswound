import { Request, Response, NextFunction } from 'express'

// Simple auth middleware for demo purposes
// In production, you'd use JWT tokens
export function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // For demo, we'll just pass through
  // In production, you'd verify JWT tokens here
  next()
} 