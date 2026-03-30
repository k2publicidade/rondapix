-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'BET_WON', 'BET_REFUNDED', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('WAITING_FOR_PLAYERS', 'ASSIGNING_CUTTER', 'PAIR_REVEALED', 'BETTING_OPEN', 'BETTING_LOCKED', 'SHUFFLING', 'RUNNING_DECK', 'ROUND_SETTLED', 'ROUND_CANCELLED');

-- CreateEnum
CREATE TYPE "CardSide" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "total_rounds" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "total_wagered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_won" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'COINS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance_before" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference_id" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "min_bet" DECIMAL(18,2) NOT NULL DEFAULT 10,
    "max_bet" DECIMAL(18,2) NOT NULL DEFAULT 10000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "seat_index" INTEGER,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'WAITING_FOR_PLAYERS',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "nonce" INTEGER NOT NULL DEFAULT 1,
    "side_a_card_id" TEXT,
    "side_b_card_id" TEXT,
    "cutter_id" TEXT,
    "cutter_side" "CardSide",
    "winner_card_id" TEXT,
    "winner_side" "CardSide",
    "server_seed_hash" TEXT,
    "server_seed" TEXT,
    "client_seed" TEXT,
    "total_pool" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "house_edge" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "started_at" TIMESTAMP(3),
    "betting_ends_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_targets" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "side" "CardSide" NOT NULL,
    "card_id" TEXT NOT NULL,
    "hit_index" INTEGER,

    CONSTRAINT "round_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "side" "CardSide" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" DECIMAL(18,2),
    "idempotency_key" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_snapshots" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "ordered_cards" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deck_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replays" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fairness_proofs" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "server_seed_hash" TEXT NOT NULL,
    "server_seed" TEXT,
    "client_seed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "shuffled_deck_snapshot" TEXT[],
    "algorithm" TEXT NOT NULL DEFAULT 'HMAC-SHA256 Fisher-Yates',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "verifiable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealed_at" TIMESTAMP(3),

    CONSTRAINT "fairness_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "score" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "period" TEXT NOT NULL DEFAULT 'ALL_TIME',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_idx" ON "wallet_transactions"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_id_idx" ON "wallet_transactions"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_status_visibility_idx" ON "rooms"("status", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_room_id_player_id_key" ON "room_members"("room_id", "player_id");

-- CreateIndex
CREATE INDEX "rounds_room_id_status_idx" ON "rounds"("room_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "round_targets_round_id_side_key" ON "round_targets"("round_id", "side");

-- CreateIndex
CREATE UNIQUE INDEX "bets_idempotency_key_key" ON "bets"("idempotency_key");

-- CreateIndex
CREATE INDEX "bets_player_id_idx" ON "bets"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "bets_round_id_player_id_key" ON "bets"("round_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "deck_snapshots_round_id_key" ON "deck_snapshots"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "replays_round_id_key" ON "replays"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "fairness_proofs_round_id_key" ON "fairness_proofs"("round_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_sent_at_idx" ON "chat_messages"("room_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_profile_id_key" ON "leaderboards"("profile_id");

-- CreateIndex
CREATE INDEX "leaderboards_period_score_idx" ON "leaderboards"("period", "score" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_targets" ADD CONSTRAINT "round_targets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_snapshots" ADD CONSTRAINT "deck_snapshots_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replays" ADD CONSTRAINT "replays_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fairness_proofs" ADD CONSTRAINT "fairness_proofs_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
