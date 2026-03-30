import type { Card, CardSide, RoundPair } from './card.js';

// ----------------------------------------------------------------
// Estados da rodada (máquina de estados)
// ----------------------------------------------------------------

export type RoundStatus =
  | 'WAITING_FOR_PLAYERS'
  | 'ASSIGNING_CUTTER'
  | 'PAIR_REVEALED'
  | 'BETTING_OPEN'
  | 'BETTING_LOCKED'
  | 'SHUFFLING'
  | 'RUNNING_DECK'
  | 'ROUND_SETTLED'
  | 'ROUND_CANCELLED';

// ----------------------------------------------------------------
// Eventos da rodada (event sourcing)
// ----------------------------------------------------------------

export type RoundEventType =
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'CUTTER_ASSIGNED'
  | 'CUTTER_CHOSE_SIDE'
  | 'PAIR_GENERATED'
  | 'BET_PLACED'
  | 'BETTING_CLOSED'
  | 'DECK_SHUFFLED'
  | 'CARD_REVEALED'
  | 'TARGET_CARD_HIT'
  | 'ROUND_SETTLED'
  | 'ROUND_CANCELLED';

export interface RoundEvent {
  readonly type: RoundEventType;
  readonly roundId: string;
  readonly timestamp: Date;
  readonly payload: Record<string, unknown>;
  readonly sequence: number;
}

// ----------------------------------------------------------------
// Aposta
// ----------------------------------------------------------------

export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';

export interface Bet {
  readonly id: string;
  readonly playerId: string;
  readonly roundId: string;
  readonly side: CardSide;
  readonly amount: number;
  readonly status: BetStatus;
  readonly payout: number | null;
  readonly placedAt: Date;
}

// ----------------------------------------------------------------
// Estado da rodada (snapshot)
// ----------------------------------------------------------------

export interface RoundState {
  readonly id: string;
  readonly roomId: string;
  readonly status: RoundStatus;
  readonly sequence: number;

  /** Par de cartas reveladas */
  readonly pair: RoundPair | null;

  /** ID do jogador cortador */
  readonly cutterId: string | null;

  /** Lado escolhido pelo cortador */
  readonly cutterSide: CardSide | null;

  /** Apostas da rodada (mapa playerId → Bet) */
  readonly bets: Record<string, Bet>;

  /** Baralho embaralhado (apenas durante RUNNING_DECK) */
  readonly deck: Card[] | null;

  /** Índice atual do reveal (carta sendo virada) */
  readonly currentCardIndex: number;

  /** Carta vencedora */
  readonly winnerCard: Card | null;

  /** Lado vencedor */
  readonly winnerSide: CardSide | null;

  /** Seeds para fairness */
  readonly serverSeedHash: string | null;
  readonly clientSeed: string | null;
  readonly nonce: number;

  readonly startedAt: Date | null;
  readonly endedAt: Date | null;
  readonly events: RoundEvent[];
}

// ----------------------------------------------------------------
// Resultado da liquidação
// ----------------------------------------------------------------

export interface RoundSettlement {
  readonly roundId: string;
  readonly winnerSide: CardSide;
  readonly winnerCard: Card;
  readonly payouts: Array<{
    readonly playerId: string;
    readonly betId: string;
    readonly originalBet: number;
    readonly payout: number;
    readonly won: boolean;
  }>;
  readonly totalPool: number;
  readonly houseEdge: number;
}
