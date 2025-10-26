"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3001',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'development',
    });
});
app.get('/', (_req, res) => {
    res.json({
        message: 'Poker Engine API',
        version: '1.0.0',
        status: 'running',
    });
});
app.get('/test', (_req, res) => {
    res.sendFile('test-client.html', { root: __dirname + '/..' });
});
const gamesRouter = require('./api/routes/games.routes').gamesRouter;
app.use(gamesRouter);
app.use('*', (_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
    });
});
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env['NODE_ENV'] === 'development'
            ? err.message
            : 'Something went wrong',
    });
});
module.exports = { app };
