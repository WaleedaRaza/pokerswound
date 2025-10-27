// PAGES ROUTER - Frontend page routes
// Extracted from sophisticated-engine-server.js

const express = require('express');
const path = require('path');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

// Play lobby page
router.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/play.html'));
});

// Friends page
router.get('/friends', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/friends.html'));
});

// AI Solver page
router.get('/ai-solver', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/ai-solver.html'));
});

// Analysis page
router.get('/analysis', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/analysis.html'));
});

// Learning page
router.get('/learning', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/learning.html'));
});

// Poker Today page
router.get('/poker-today', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/poker-today.html'));
});

// Game table route (poker.html - full game interface)
router.get('/game', (req, res) => {
  // Always serve poker.html - it will handle ?room= parameter and auto-join
  res.sendFile(path.join(__dirname, '../public/poker.html'));
});

// Direct room access via /game/:roomId
router.get('/game/:roomId', (req, res) => {
  console.log(`🎮 Direct room access: /game/${req.params.roomId}`);
  // Serve zoom-lock table (wired to backend)
  res.sendFile(path.join(__dirname, '../public/poker-table-zoom-lock.html'));
});

// NEW: Test route for modern poker table UI
router.get('/poker-v2', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-v2.html'));
});

// Direct v2 room access
router.get('/game-v2/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-v2.html'));
});

// Demo version - no backend required!
router.get('/poker-demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-v2-demo.html'));
});

// V3 - Premium rectangular table design
router.get('/poker-v3', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-v3.html'));
});

// V3 Demo - See the new design!
router.get('/poker-v3-demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-v3-demo.html'));
});

// ZOOM-LOCKED TABLE (Virtual canvas with uniform scaling)
router.get('/table', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-zoom-lock.html'));
});

// Grid version (previous approach)
router.get('/table-grid', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-grid.html'));
});

// Legacy table (old approach)
router.get('/table-old', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-final.html'));
});

// Legacy routes - redirect to game
router.get('/poker', (req, res) => {
  res.redirect('/game');
});

router.get('/poker-test.html', (req, res) => {
  res.redirect('/game');
});

router.get('/public/poker-test.html', (req, res) => {
  res.redirect('/game');
});

module.exports = router;

