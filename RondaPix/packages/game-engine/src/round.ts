import type { Bet, BetStatus, Card, CardSide, RoundEvent, RoundPair, RoundSettlement, RoundState, RoundStatus } from '@ronda/shared/types';
import { DEFAULT_HOUSE_EDGE } from './constants.js';

// ----------------------------------------------------------------
// Criação de estado inicial
// ----------------------------------------------------------------

export function createInitialRoundState(params: {
  id: string;
  roomId: string;
  serverSeedHash: string;
  nonce: number;
}): RoundState {
  return {
    id: params.id,
    roomId: params.roomId,
    status: 'WAITING_FOR_PLAYERS',
    sequence: 0,
    pair: null,
    cutterId: null,
    cutterSide: null,
    bets: {},
    deck: null,
    currentCardIndex: 0,
    winnerCard: null,
    winnerSide: null,
    serverSeedHash: params.serverSeedHash,
    clientSeed: null,
    nonce: params.nonce,
    startedAt: null,
    endedAt: null,
    events: [],
  };
}

// ----------------------------------------------------------------
// Transições de estado (funções puras — sem efeitos colaterais)
// ----------------------------------------------------------------

/** Adiciona evento ao estado e incrementa sequência */
function appendEvent(state: RoundState, event: Omit<RoundEvent, 'sequence'>): RoundState {
  const seq = state.sequence + 1;
  return {
    ...state,
    sequence: seq,
    events: [
      ...state.events,
      { ...event, sequence: seq },
    ],
  };
}

/** Atualiza status da rodada */
function withStatus(state: RoundState, status: RoundStatus): RoundState {
  return { ...state, status };
}

// ----------------------------------------------------------------
// Transições públicas
// ----------------------------------------------------------------

export function revealPair(
  state: RoundState,
  pair: RoundPair,
  cutterId: string,
): RoundState {
  if (state.status !== 'WAITING_FOR_PLAYERS' && state.status !== 'ASSIGNING_CUTTER') {
    throw new InvalidTransitionError(state.status, 'PAIR_REVEALED');
  }

  let next = withStatus(state, 'PAIR_REVEALED');
  next = { ...next, pair, cutterId, startedAt: new Date() };
  return appendEvent(next, {
    type: 'PAIR_GENERATED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { pair, cutterId },
  });
}

export function assignCutter(state: RoundState, cutterId: string): RoundState {
  if (state.status !== 'WAITING_FOR_PLAYERS') {
    throw new InvalidTransitionError(state.status, 'ASSIGNING_CUTTER');
  }

  let next = withStatus(state, 'ASSIGNING_CUTTER');
  next = { ...next, cutterId };
  return appendEvent(next, {
    type: 'CUTTER_ASSIGNED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { cutterId },
  });
}

export function cutterChooseSide(
  state: RoundState,
  playerId: string,
  side: CardSide,
): RoundState {
  if (state.status !== 'PAIR_REVEALED') {
    throw new InvalidTransitionError(state.status, 'BETTING_OPEN (cutter chose)');
  }
  if (state.cutterId !== playerId) {
    throw new Error(`Jogador ${playerId} não é o cortador`);
  }

  let next: RoundState = { ...state, cutterSide: side };
  next = withStatus(next, 'BETTING_OPEN');
  return appendEvent(next, {
    type: 'CUTTER_CHOSE_SIDE',
    roundId: state.id,
    timestamp: new Date(),
    payload: { playerId, side },
  });
}

export function placeBet(
  state: RoundState,
  bet: Bet,
): RoundState {
  if (state.status !== 'BETTING_OPEN') {
    throw new InvalidTransitionError(state.status, 'BET_PLACED');
  }
  if (state.bets[bet.playerId]) {
    // Idempotência: mesma aposta já existe, retorna estado sem mudança
    return state;
  }

  const next: RoundState = {
    ...state,
    bets: { ...state.bets, [bet.playerId]: bet },
  };
  return appendEvent(next, {
    type: 'BET_PLACED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { bet },
  });
}

export function lockBetting(state: RoundState): RoundState {
  if (state.status !== 'BETTING_OPEN') {
    throw new InvalidTransitionError(state.status, 'BETTING_LOCKED');
  }

  let next = withStatus(state, 'BETTING_LOCKED');
  return appendEvent(next, {
    type: 'BETTING_CLOSED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { betCount: Object.keys(state.bets).length },
  });
}

export function startShuffle(
  state: RoundState,
  clientSeed: string,
): RoundState {
  if (state.status !== 'BETTING_LOCKED') {
    throw new InvalidTransitionError(state.status, 'SHUFFLING');
  }

  let next = withStatus(state, 'SHUFFLING');
  next = { ...next, clientSeed };
  return appendEvent(next, {
    type: 'DECK_SHUFFLED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { clientSeed },
  });
}

export function setShuffledDeck(state: RoundState, deck: Card[]): RoundState {
  if (state.status !== 'SHUFFLING') {
    throw new InvalidTransitionError(state.status, 'RUNNING_DECK');
  }

  return withStatus({ ...state, deck, currentCardIndex: 0 }, 'RUNNING_DECK');
}

export function revealNextCard(state: RoundState): {
  nextState: RoundState;
  revealedCard: Card;
  isTarget: boolean;
  winnerSide: CardSide | null;
} {
  if (state.status !== 'RUNNING_DECK') {
    throw new InvalidTransitionError(state.status, 'CARD_REVEALED');
  }
  if (!state.deck || !state.pair) {
    throw new Error('Deck ou par não definido');
  }

  const card = state.deck[state.currentCardIndex];
  if (!card) {
    throw new Error(`Carta no índice ${state.currentCardIndex} não existe`);
  }

  const isTargetA = card.id === state.pair.sideA.id;
  const isTargetB = card.id === state.pair.sideB.id;
  const isTarget = isTargetA || isTargetB;
  const winnerSide: CardSide | null = isTargetA ? 'A' : isTargetB ? 'B' : null;

  let next = appendEvent(
    { ...state, currentCardIndex: state.currentCardIndex + 1 },
    {
      type: 'CARD_REVEALED',
      roundId: state.id,
      timestamp: new Date(),
      payload: { card, index: state.currentCardIndex, isTarget },
    },
  );

  if (isTarget) {
    next = appendEvent(
      { ...next, winnerCard: card, winnerSide },
      {
        type: 'TARGET_CARD_HIT',
        roundId: state.id,
        timestamp: new Date(),
        payload: { card, side: winnerSide },
      },
    );
  }

  return { nextState: next, revealedCard: card, isTarget, winnerSide };
}

// ----------------------------------------------------------------
// Liquidação
// ----------------------------------------------------------------

export function settleRound(
  state: RoundState,
  houseEdge: number = DEFAULT_HOUSE_EDGE,
): { nextState: RoundState; settlement: RoundSettlement } {
  if (!state.winnerSide || !state.winnerCard) {
    throw new Error('Rodada não tem vencedor definido');
  }

  const bets = Object.values(state.bets);
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);

  // Payout simples: vencedor ganha 2x a aposta (dobro), perdedor perde tudo
  const payouts = bets.map((bet) => {
    const won = bet.side === state.winnerSide;
    const payout = won ? bet.amount * 2 : 0;

    return {
      playerId: bet.playerId,
      betId: bet.id,
      originalBet: bet.amount,
      payout,
      won,
    };
  });

  // Atualiza status das apostas no estado
  const updatedBets: Record<string, Bet> = {};
  for (const bet of bets) {
    const result = payouts.find((p) => p.betId === bet.id);
    const status: BetStatus = result?.won ? 'WON' : 'LOST';
    updatedBets[bet.playerId] = { ...bet, status, payout: result?.payout ?? 0 };
  }

  const settlement: RoundSettlement = {
    roundId: state.id,
    winnerSide: state.winnerSide,
    winnerCard: state.winnerCard,
    payouts,
    totalPool,
    houseEdge,
  };

  let next: RoundState = {
    ...state,
    bets: updatedBets,
    status: 'ROUND_SETTLED',
    endedAt: new Date(),
  };
  next = appendEvent(next, {
    type: 'ROUND_SETTLED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { settlement },
  });

  return { nextState: next, settlement };
}

export function cancelRound(state: RoundState, reason: string): RoundState {
  let next = withStatus(state, 'ROUND_CANCELLED');
  next = { ...next, endedAt: new Date() };
  return appendEvent(next, {
    type: 'ROUND_CANCELLED',
    roundId: state.id,
    timestamp: new Date(),
    payload: { reason },
  });
}

// ----------------------------------------------------------------
// Utilitários de consulta (read-only)
// ----------------------------------------------------------------

export function getBetsByPlayer(state: RoundState): Map<string, Bet> {
  return new Map(Object.entries(state.bets));
}

export function getTotalPool(state: RoundState): { sideA: number; sideB: number; total: number } {
  const bets = Object.values(state.bets);
  const sideA = bets.filter((b) => b.side === 'A').reduce((s, b) => s + b.amount, 0);
  const sideB = bets.filter((b) => b.side === 'B').reduce((s, b) => s + b.amount, 0);
  return { sideA, sideB, total: sideA + sideB };
}

// ----------------------------------------------------------------
// Erros tipados
// ----------------------------------------------------------------

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: RoundStatus,
    public readonly to: string,
  ) {
    super(`Transição inválida: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}
