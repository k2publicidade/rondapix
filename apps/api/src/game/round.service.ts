import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import {
  createDeck,
  pickPair,
  deterministicShuffle,
  hashServerSeed,
  createInitialRoundState,
  revealPair,
  assignCutter,
  cutterChooseSide,
  placeBet as placeBetEngine,
  lockBetting,
  startShuffle,
  setShuffledDeck,
  revealNextCard,
  settleRound,
  cancelRound,
} from '@ronda/game-engine';
import { generateClientSeed } from '@ronda/fairness';
import type { RoundState, CardSide, Bet } from '@ronda/shared';

function sumBets(bets: Record<string, Bet>): { A: number; B: number; total: number } {
  return Object.values(bets as Record<string, Bet>).reduce<{ A: number; B: number; total: number }>(
    (acc, b: Bet) => {
      if (b.side === 'A') acc.A += b.amount;
      else acc.B += b.amount;
      acc.total += b.amount;
      return acc;
    },
    { A: 0, B: 0, total: 0 },
  );
}

/** In-memory state para rodadas ativas (por roomId) */
const activeRounds = new Map<string, RoundState>();
/** Guarda o server seed em memória até revelar após a rodada */
const activeServerSeeds = new Map<string, string>();

const BETTING_WINDOW_MS = 30_000;
const CARD_REVEAL_INTERVAL_MS = 400;

export type RoundEventEmitter = (event: string, data: unknown) => void;

@Injectable()
export class RoundService {
  private readonly logger = new Logger(RoundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  getActiveRound(roomId: string): RoundState | null {
    return activeRounds.get(roomId) ?? null;
  }

  async startNewRound(roomId: string, emit: RoundEventEmitter): Promise<RoundState> {
    // Gera seeds de fairness
    const serverSeed = randomBytes(32).toString('hex');
    const serverSeedHash = hashServerSeed(serverSeed);

    // Seleciona cortador (rotaciona por número de rodadas)
    const members = await this.prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      include: { player: { include: { profile: true } } },
      orderBy: { seatIndex: 'asc' },
    });
    if (members.length < 2) throw new Error('Sala precisa de pelo menos 2 jogadores');

    const roundCount = await this.prisma.round.count({ where: { roomId } });
    const cutterMember = members[roundCount % members.length]!;

    // Cria round no banco
    const dbRound = await this.prisma.round.create({
      data: { roomId, serverSeedHash, nonce: roundCount + 1, sequence: 0 },
    });

    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'IN_PROGRESS' } });

    // Estado inicial
    let state = createInitialRoundState({
      id: dbRound.id,
      roomId,
      serverSeedHash,
      nonce: roundCount + 1,
    });

    // Par de cartas
    const deck = createDeck();
    const pairIndexA = Math.floor(Math.random() * 36);
    let pairIndexB = Math.floor(Math.random() * 35);
    if (pairIndexB >= pairIndexA) pairIndexB++;
    const { sideA, sideB } = pickPair(deck, pairIndexA, pairIndexB);

    state = assignCutter(state, cutterMember.playerId);
    state = revealPair(state, { sideA, sideB }, cutterMember.playerId);

    // Persiste
    await this.prisma.round.update({
      where: { id: dbRound.id },
      data: {
        cutterId: cutterMember.playerId,
        sideACardId: sideA.id,
        sideBCardId: sideB.id,
        status: 'PAIR_REVEALED',
        startedAt: new Date(),
      },
    });
    await this.prisma.roundTarget.createMany({
      data: [
        { roundId: dbRound.id, side: 'A', cardId: sideA.id },
        { roundId: dbRound.id, side: 'B', cardId: sideB.id },
      ],
    });

    activeRounds.set(roomId, state);
    activeServerSeeds.set(dbRound.id, serverSeed); // mantém seed secreto até o fim

    emit('round:statusChanged', { roundId: state.id, status: state.status });
    emit('round:pairRevealed', {
      roundId: state.id,
      pair: { sideA, sideB },
      cutterId: cutterMember.playerId,
      cutterUsername: cutterMember.player.profile?.username ?? cutterMember.playerId,
    });

    return state;
  }

  async handleCutterChooseSide(
    roomId: string,
    playerId: string,
    side: CardSide,
    emit: RoundEventEmitter,
  ): Promise<void> {
    const state = activeRounds.get(roomId);
    if (!state) throw new Error('Nenhuma rodada ativa');

    const newState = cutterChooseSide(state, playerId, side);
    activeRounds.set(roomId, newState);

    const bettingEndsAt = new Date(Date.now() + BETTING_WINDOW_MS);
    await this.prisma.round.update({
      where: { id: state.id },
      data: { cutterSide: side, status: 'BETTING_OPEN', bettingEndsAt },
    });

    emit('round:cutterChose', { roundId: state.id, cutterId: playerId, side });
    emit('round:stateSync', newState);
    emit('round:bettingOpened', {
      roundId: state.id,
      endsAt: bettingEndsAt.toISOString(),
      windowSeconds: BETTING_WINDOW_MS / 1000,
    });

    setTimeout(() => this.closeBettingAndRun(roomId, emit), BETTING_WINDOW_MS);
  }

  async handlePlaceBet(
    roomId: string,
    playerId: string,
    side: CardSide,
    amount: number,
    idempotencyKey: string,
    emit: RoundEventEmitter,
  ): Promise<{ bet: Bet; newBalance: number }> {
    const state = activeRounds.get(roomId);
    if (!state) throw new Error('Nenhuma rodada ativa');
    if (state.status !== 'BETTING_OPEN') throw new Error('Apostas não estão abertas');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Sala não encontrada');
    if (amount < Number(room.minBet) || amount > Number(room.maxBet)) {
      throw new Error(`Aposta fora dos limites: min=${room.minBet} max=${room.maxBet}`);
    }

    await this.walletService.lockForBet(playerId, amount, state.id, idempotencyKey);

    const bet: Bet = {
      id: idempotencyKey,
      playerId,
      roundId: state.id,
      side,
      amount,
      status: 'PENDING',
      payout: null,
      placedAt: new Date(),
    };

    await this.prisma.bet.upsert({
      where: { idempotencyKey },
      create: { roundId: state.id, playerId, side, amount, idempotencyKey, status: 'PENDING' },
      update: {},
    });

    const newState = placeBetEngine(state, bet);
    activeRounds.set(roomId, newState);

    const pools = sumBets(newState.bets);

    emit('round:betPlaced', {
      roundId: state.id,
      bet: { ...bet, amount: 'hidden' as const },
      totalPoolA: pools.A,
      totalPoolB: pools.B,
    });

    const balance = await this.walletService.getBalance(playerId);
    return { bet, newBalance: balance.balance };
  }

  async closeBettingAndRun(roomId: string, emit: RoundEventEmitter): Promise<void> {
    const state = activeRounds.get(roomId);
    if (!state || state.status !== 'BETTING_OPEN') return;

    // Sem apostas → cancela
    if (Object.keys(state.bets).length === 0) {
      activeRounds.delete(roomId);
      activeServerSeeds.delete(state.id);
      await this.prisma.round.update({
        where: { id: state.id },
        data: { status: 'ROUND_CANCELLED', endedAt: new Date() },
      });
      await this.prisma.room.update({ where: { id: roomId }, data: { status: 'WAITING' } });
      emit('round:statusChanged', { roundId: state.id, status: 'ROUND_CANCELLED' });
      return;
    }

    const serverSeed = activeServerSeeds.get(state.id)!;
    const clientSeed = generateClientSeed(roomId, state.nonce);

    let locked = lockBetting(state);
    let shuffling = startShuffle(locked, clientSeed);

    const pools = sumBets(shuffling.bets);

    emit('round:bettingLocked', {
      roundId: state.id,
      totalBets: Object.keys(shuffling.bets).length,
      totalPoolA: pools.A,
      totalPoolB: pools.B,
    });

    // Embaralha com seeds determinísticos
    const deck = createDeck();
    const shuffledDeck = deterministicShuffle(deck, serverSeed, clientSeed, shuffling.nonce);
    let runState = setShuffledDeck(shuffling, shuffledDeck);
    activeRounds.set(roomId, runState);

    await this.prisma.round.update({
      where: { id: state.id },
      data: {
        status: 'RUNNING_DECK',
        clientSeed,
        totalPool: sumBets(runState.bets).total,
      },
    });
    await this.prisma.deckSnapshot.create({
      data: { roundId: state.id, orderedCards: shuffledDeck.map((c) => c.id) },
    });

    emit('round:shuffleCommitted', {
      roundId: state.id,
      serverSeedHash: runState.serverSeedHash,
      clientSeed,
      nonce: runState.nonce,
    });

    await this.runDeck(roomId, serverSeed, emit);
  }

  private async runDeck(roomId: string, serverSeed: string, emit: RoundEventEmitter): Promise<void> {
    const totalCards = createDeck().length;

    for (let i = 0; i < totalCards; i++) {
      await new Promise<void>((r) => setTimeout(r, CARD_REVEAL_INTERVAL_MS));

      const state = activeRounds.get(roomId);
      if (!state || state.status !== 'RUNNING_DECK') return;

      const { nextState, revealedCard, isTarget, winnerSide } = revealNextCard(state);
      activeRounds.set(roomId, nextState);

      emit('round:cardRevealed', {
        roundId: state.id,
        card: revealedCard,
        index: i,
        totalCards,
        isTargetCard: isTarget,
        targetSide: winnerSide,
      });

      if (isTarget) {
        emit('round:winnerDeclared', { roundId: state.id, winnerCard: revealedCard, winnerSide });
        await this.settle(roomId, serverSeed, emit);
        return;
      }
    }
  }

  private async settle(roomId: string, serverSeed: string, emit: RoundEventEmitter): Promise<void> {
    const state = activeRounds.get(roomId);
    if (!state || !state.winnerSide) return;

    const { nextState, settlement } = settleRound(state);
    activeRounds.delete(roomId);
    activeServerSeeds.delete(state.id);

    await this.prisma.round.update({
      where: { id: state.id },
      data: {
        status: 'ROUND_SETTLED',
        winnerCardId: state.winnerCard?.id,
        winnerSide: state.winnerSide,
        endedAt: new Date(),
        serverSeed,
      },
    });

    for (const bet of Object.values(nextState.bets as Record<string, Bet>)) {
      await this.prisma.bet.updateMany({
        where: { roundId: state.id, playerId: (bet as Bet).playerId },
        data: { status: (bet as Bet).status, payout: (bet as Bet).payout ?? 0, settledAt: new Date() },
      });
    }

    await this.walletService.settleBets(
      settlement.payouts.map((p: any) => ({
        userId: p.playerId,
        roundId: state.id,
        betAmount: p.originalBet,
        payout: p.payout,
        won: p.won,
      })),
    );

    await this.prisma.fairnessProof.upsert({
      where: { roundId: state.id },
      create: {
        roundId: state.id,
        serverSeedHash: state.serverSeedHash ?? '',
        serverSeed,
        clientSeed: state.clientSeed ?? '',
        nonce: state.nonce,
        shuffledDeckSnapshot: state.deck?.map((c) => c.id) ?? [],
        verifiable: true,
        revealedAt: new Date(),
      },
      update: { serverSeed, verifiable: true, revealedAt: new Date() },
    });

    await this.prisma.replay.upsert({
      where: { roundId: state.id },
      create: { roundId: state.id, events: nextState.events as any },
      update: { events: nextState.events as any },
    });

    // Reseta sala para WAITING para permitir nova rodada
    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'WAITING' } });

    emit('round:settled', { roundId: state.id, settlement, serverSeed });
    emit('round:replayReady', { roundId: state.id, replayId: state.id });
  }

  async cancelActiveRound(roomId: string, reason: string, emit: RoundEventEmitter): Promise<void> {
    const state = activeRounds.get(roomId);
    if (!state) return;

    const refunds = Object.values(state.bets as Record<string, Bet>).map((b: Bet) => ({
      userId: b.playerId,
      roundId: state.id,
      amount: b.amount,
    }));
    if (refunds.length > 0) await this.walletService.refundBets(refunds);

    activeRounds.delete(roomId);
    activeServerSeeds.delete(state.id);
    await this.prisma.round.update({
      where: { id: state.id },
      data: { status: 'ROUND_CANCELLED', endedAt: new Date() },
    });
    // Reseta sala para WAITING
    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'WAITING' } });
    emit('round:statusChanged', { roundId: state.id, status: 'ROUND_CANCELLED' });
  }
}
