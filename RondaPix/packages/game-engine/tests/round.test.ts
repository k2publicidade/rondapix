import type { Bet } from '@ronda/shared/types';
import { describe, expect, it } from 'vitest';
import { createDeck, makeCard } from '../src/deck.js';
import {
  InvalidTransitionError,
  assignCutter,
  cancelRound,
  createInitialRoundState,
  cutterChooseSide,
  getTotalPool,
  lockBetting,
  placeBet,
  revealNextCard,
  revealPair,
  settleRound,
  setShuffledDeck,
  startShuffle,
} from '../src/round.js';
import { deterministicShuffle } from '../src/shuffle.js';

const ROUND_ID = 'round-test-1';
const ROOM_ID = 'room-test-1';
const SERVER_SEED_HASH = 'abc123hash';
const PLAYER_A = 'player-a';
const PLAYER_B = 'player-b';

function makeBet(override: Partial<Bet> = {}): Bet {
  return {
    id: `bet-${Date.now()}`,
    playerId: PLAYER_A,
    roundId: ROUND_ID,
    side: 'A',
    amount: 100,
    status: 'PENDING',
    payout: null,
    placedAt: new Date(),
    ...override,
  };
}

describe('createInitialRoundState', () => {
  it('cria estado inicial correto', () => {
    const state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    expect(state.status).toBe('WAITING_FOR_PLAYERS');
    expect(state.pair).toBeNull();
    expect(state.bets).toEqual({});
    expect(state.sequence).toBe(0);
    expect(state.events).toHaveLength(0);
  });
});

describe('assignCutter', () => {
  it('transição WAITING → ASSIGNING_CUTTER', () => {
    const state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    const next = assignCutter(state, PLAYER_A);
    expect(next.status).toBe('ASSIGNING_CUTTER');
    expect(next.cutterId).toBe(PLAYER_A);
  });

  it('lança erro em estado inválido', () => {
    const state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    const assigning = assignCutter(state, PLAYER_A);
    // Tentar atribuir cortador de novo deve falhar
    expect(() => assignCutter(assigning, PLAYER_B)).toThrow(InvalidTransitionError);
  });
});

describe('revealPair', () => {
  it('transição para PAIR_REVEALED', () => {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    const next = revealPair(state, pair, PLAYER_A);
    expect(next.status).toBe('PAIR_REVEALED');
    expect(next.pair).toEqual(pair);
    expect(next.events.some((e) => e.type === 'PAIR_GENERATED')).toBe(true);
  });
});

describe('cutterChooseSide', () => {
  function stateAtPairRevealed() {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    return revealPair(state, pair, PLAYER_A);
  }

  it('cortador escolhe lado A e abre apostas', () => {
    const state = stateAtPairRevealed();
    const next = cutterChooseSide(state, PLAYER_A, 'A');
    expect(next.status).toBe('BETTING_OPEN');
    expect(next.cutterSide).toBe('A');
  });

  it('lança erro se não for o cortador', () => {
    const state = stateAtPairRevealed();
    expect(() => cutterChooseSide(state, PLAYER_B, 'A')).toThrow('não é o cortador');
  });
});

describe('placeBet', () => {
  function bettingOpenState() {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    state = revealPair(state, pair, PLAYER_A);
    return cutterChooseSide(state, PLAYER_A, 'A');
  }

  it('registra aposta no estado', () => {
    const state = bettingOpenState();
    const bet = makeBet({ playerId: PLAYER_B, side: 'B' });
    const next = placeBet(state, bet);
    expect(next.bets[PLAYER_B]).toEqual(bet);
  });

  it('é idempotente: mesma aposta não duplica', () => {
    const state = bettingOpenState();
    const bet = makeBet({ playerId: PLAYER_B, side: 'B' });
    const once = placeBet(state, bet);
    const twice = placeBet(once, bet);
    expect(Object.keys(twice.bets)).toHaveLength(1);
  });

  it('lança erro fora de BETTING_OPEN', () => {
    const state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    const bet = makeBet();
    expect(() => placeBet(state, bet)).toThrow(InvalidTransitionError);
  });
});

describe('lockBetting → startShuffle → setShuffledDeck', () => {
  it('executa pipeline de embaralhamento', () => {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    state = revealPair(state, pair, PLAYER_A);
    state = cutterChooseSide(state, PLAYER_A, 'A');
    state = lockBetting(state);
    expect(state.status).toBe('BETTING_LOCKED');

    state = startShuffle(state, 'client-seed-xyz');
    expect(state.status).toBe('SHUFFLING');

    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, 'server-seed', 'client-seed-xyz', 1);
    state = setShuffledDeck(state, shuffled);
    expect(state.status).toBe('RUNNING_DECK');
    expect(state.deck).toHaveLength(36);
  });
});

describe('revealNextCard', () => {
  function runningDeckState() {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const sideA = makeCard('hearts', 'A');
    const sideB = makeCard('spades', 'K');
    const pair = { sideA, sideB };
    state = revealPair(state, pair, PLAYER_A);
    state = cutterChooseSide(state, PLAYER_A, 'A');
    state = lockBetting(state);
    state = startShuffle(state, 'client-seed');
    // Deck com o A de copas na posição 10, K de espadas na posição 20
    const deck = createDeck();
    state = setShuffledDeck(state, deck);
    return { state, deck, sideA, sideB };
  }

  it('revela cartas em sequência', () => {
    const { state } = runningDeckState();
    const { nextState, revealedCard } = revealNextCard(state);
    expect(revealedCard).toBeDefined();
    expect(nextState.currentCardIndex).toBe(1);
  });

  it('detecta quando carta alvo é revelada', () => {
    let { state, deck, sideA } = runningDeckState();

    // Avança até encontrar a carta alvo A de copas
    let found = false;
    for (let i = 0; i < deck.length && !found; i++) {
      const { nextState, isTarget, winnerSide } = revealNextCard(state);
      state = nextState;
      if (isTarget) {
        found = true;
        expect(winnerSide).toBe('A'); // A de copas = sideA
      }
    }
    expect(found).toBe(true);
  });
});

describe('settleRound', () => {
  it('distribui payouts corretamente', () => {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    state = revealPair(state, pair, PLAYER_A);
    state = cutterChooseSide(state, PLAYER_A, 'A');

    // 2 apostas: PLAYER_A em A (100), PLAYER_B em B (200)
    const betA = makeBet({ id: 'bet-a', playerId: PLAYER_A, side: 'A', amount: 100 });
    const betB = makeBet({ id: 'bet-b', playerId: PLAYER_B, side: 'B', amount: 200 });
    state = placeBet(state, betA);
    state = placeBet(state, betB);
    state = lockBetting(state);
    state = startShuffle(state, 'cs');
    state = setShuffledDeck(state, createDeck());

    // Simula vencedor: lado A
    state = { ...state, winnerCard: pair.sideA, winnerSide: 'A' };

    const { settlement } = settleRound(state, 0.05);
    const payoutA = settlement.payouts.find((p) => p.playerId === PLAYER_A);
    const payoutB = settlement.payouts.find((p) => p.playerId === PLAYER_B);

    expect(payoutA?.won).toBe(true);
    expect(payoutA?.payout).toBeGreaterThan(100); // ganhou mais do que apostou
    expect(payoutB?.won).toBe(false);
    expect(payoutB?.payout).toBe(0);
    expect(settlement.totalPool).toBe(300);
  });
});

describe('getTotalPool', () => {
  it('calcula pool por lado', () => {
    let state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    state = assignCutter(state, PLAYER_A);
    const pair = { sideA: makeCard('hearts', 'A'), sideB: makeCard('spades', 'K') };
    state = revealPair(state, pair, PLAYER_A);
    state = cutterChooseSide(state, PLAYER_A, 'A');
    state = placeBet(state, makeBet({ playerId: PLAYER_A, side: 'A', amount: 100 }));
    state = placeBet(state, makeBet({ playerId: PLAYER_B, side: 'B', amount: 150 }));

    const pool = getTotalPool(state);
    expect(pool.sideA).toBe(100);
    expect(pool.sideB).toBe(150);
    expect(pool.total).toBe(250);
  });
});

describe('cancelRound', () => {
  it('cancela rodada em qualquer estado', () => {
    const state = createInitialRoundState({ id: ROUND_ID, roomId: ROOM_ID, serverSeedHash: SERVER_SEED_HASH, nonce: 1 });
    const cancelled = cancelRound(state, 'Sem jogadores suficientes');
    expect(cancelled.status).toBe('ROUND_CANCELLED');
    expect(cancelled.endedAt).not.toBeNull();
  });
});
