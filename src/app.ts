import type { Request, Response, NextFunction } from 'express';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3001',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Poker Engine API',
    version: '1.0.0',
    status: 'running',
  });
});

// Serve test client
app.get('/test', (_req: Request, res: Response) => {
  res.sendFile('test-client.html', { root: __dirname + '/..' });
});

// API routes
const gamesRouter = require('./api/routes/games.routes').gamesRouter;
app.use(gamesRouter);

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    // eslint-disable-next-line no-console
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        process.env['NODE_ENV'] === 'development'
          ? (err as Error).message
          : 'Something went wrong',
    });
  }
);

module.exports = { app };
