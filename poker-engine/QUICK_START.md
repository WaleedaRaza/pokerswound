# Poker Engine - Quick Start Guide

## 🚀 Start the Server

```bash
cd poker-engine
node sophisticated-engine-server.js
```

Server runs on: **http://localhost:3000**

## 🎮 Access the Game

- **Poker UI**: http://localhost:3000/poker
- **API Health**: http://localhost:3000/

## ✅ What's Working

- ✅ **Database Connection**: Connected to Supabase PostgreSQL
- ✅ **Event Sourcing**: Full event history and crash recovery
- ✅ **Guest Users**: No authentication required to play
- ✅ **Room Creation**: Create and join poker rooms
- ✅ **Real-time Gameplay**: WebSocket-based multiplayer
- ✅ **Sophisticated Engine**: Professional poker rules and betting

## 🎯 Quick Test

### Create a Room
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Poker Room",
    "small_blind": 10,
    "big_blind": 20,
    "min_buy_in": 100,
    "max_buy_in": 1000,
    "max_players": 6,
    "is_private": false,
    "user_id": "guest-123"
  }'
```

Response:
```json
{
  "roomId": "uuid-here",
  "inviteCode": "ABC123",
  "maxPlayers": 6,
  "hostUserId": "guest-123"
}
```

### Join a Room
Visit: `http://localhost:3000/poker` and enter the invite code!

## 🛠️ Troubleshooting

### Server won't start?
1. Check if `.env` file exists in `poker-engine/` directory
2. Verify `DATABASE_URL` is set in `.env`
3. Kill any existing node processes: `Get-Process node | Stop-Process -Force`

### Foreign key constraint errors?
Already fixed! All user_id foreign key constraints have been removed to support guest users.

### Port already in use?
Change the port in `.env`:
```
PORT=3001
```

## 📁 Important Files

- `sophisticated-engine-server.js` - Main server file
- `.env` - Environment configuration (DATABASE_URL, etc.)
- `public/poker.html` - Main poker UI
- `FOREIGN_KEY_FIX.md` - Details on the guest user fix

## 🎲 Features

- **Multi-table Support**: Multiple games running simultaneously
- **Guest & Auth Users**: Play without signing in or use Google OAuth
- **Event Sourcing**: Every action is recorded and recoverable
- **Real-time Updates**: See other players' actions instantly
- **Professional Rules**: Proper betting rounds, all-in handling, showdowns
- **Crash Recovery**: Games resume after server restart

## 📊 Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL (Supabase)
- **Engine**: TypeScript-based poker engine with event sourcing
- **Frontend**: Vanilla HTML/CSS/JS with WebSocket real-time updates

---

**Status**: ✅ Production Ready
**Last Updated**: October 18, 2025

