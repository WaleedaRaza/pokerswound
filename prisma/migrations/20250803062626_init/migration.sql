-- CreateEnum
CREATE TYPE "PokerStreet" AS ENUM ('PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'FINISHED');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('UTG', 'UTG1', 'UTG2', 'UTG3', 'UTG4', 'HJ', 'CO', 'BTN', 'SB', 'BB');

-- CreateEnum
CREATE TYPE "PayInfoStatus" AS ENUM ('PAY_TILL_END', 'ALLIN', 'FOLDED');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('TEXAS_HOLDEM', 'OMAHA', 'SEVEN_CARD_STUD');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'STARTING', 'PLAYING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandRank" AS ENUM ('HIGH_CARD', 'PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND', 'STRAIGHT', 'FLUSH', 'FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "tokenBalance" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL DEFAULT 'TEXAS_HOLDEM',
    "maxPlayers" INTEGER NOT NULL DEFAULT 9,
    "minBet" INTEGER NOT NULL DEFAULT 10,
    "maxBet" INTEGER NOT NULL DEFAULT 1000,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "currentHandId" TEXT,
    "dealerPosition" INTEGER NOT NULL DEFAULT 0,
    "smallBlindPosition" INTEGER NOT NULL DEFAULT 1,
    "bigBlindPosition" INTEGER NOT NULL DEFAULT 2,
    "currentPlayerId" TEXT,
    "currentBet" INTEGER NOT NULL DEFAULT 0,
    "minRaise" INTEGER NOT NULL DEFAULT 0,
    "pot" INTEGER NOT NULL DEFAULT 0,
    "sidePots" JSONB,
    "communityCards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deck" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entropy" TEXT,
    "entropySources" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hands" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL,
    "street" "PokerStreet" NOT NULL DEFAULT 'PREFLOP',
    "pot" INTEGER NOT NULL DEFAULT 0,
    "sidePots" JSONB,
    "communityCards" TEXT[],
    "deck" TEXT[],
    "currentBet" INTEGER NOT NULL DEFAULT 0,
    "minRaise" INTEGER NOT NULL DEFAULT 0,
    "dealerPosition" INTEGER NOT NULL DEFAULT 0,
    "smallBlindPosition" INTEGER NOT NULL DEFAULT 1,
    "bigBlindPosition" INTEGER NOT NULL DEFAULT 2,
    "currentPlayerId" TEXT,
    "winnerIds" TEXT[],
    "entropy" TEXT,
    "entropySources" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "hands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hand_actions" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "street" "PokerStreet" NOT NULL,
    "position" "PlayerPosition",
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hand_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_players" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "chips" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAllIn" BOOLEAN NOT NULL DEFAULT false,
    "isFolded" BOOLEAN NOT NULL DEFAULT false,
    "holeCards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "handRank" "HandRank",
    "handValue" INTEGER,
    "betAmount" INTEGER NOT NULL DEFAULT 0,
    "lastAction" "ActionType",
    "lastActionAmount" INTEGER NOT NULL DEFAULT 0,
    "payInfoStatus" "PayInfoStatus" NOT NULL DEFAULT 'PAY_TILL_END',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "game_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'CHAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "games_currentHandId_key" ON "games"("currentHandId");

-- CreateIndex
CREATE UNIQUE INDEX "game_players_gameId_playerId_key" ON "game_players"("gameId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_userId_friendId_key" ON "friendships"("userId", "friendId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_currentHandId_fkey" FOREIGN KEY ("currentHandId") REFERENCES "hands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hands" ADD CONSTRAINT "hands_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hand_actions" ADD CONSTRAINT "hand_actions_handId_fkey" FOREIGN KEY ("handId") REFERENCES "hands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
