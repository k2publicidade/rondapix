import type { Rank, Suit } from '@ronda/shared/types';

/**
 * Ronda usa um baralho de 36 cartas.
 * Implementação: A, 2-9, J, Q, K em 3 naipes = 36 cartas.
 * (Removemos o 10 de cada naipe para totalizar 36.)
 */
export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Total de cartas no baralho da Ronda */
export const DECK_SIZE = 36; // 9 ranks × 4 naipes = 36

/** Configurações padrão do jogo */
export const DEFAULT_HOUSE_EDGE = 0.05; // 5%
export const DEFAULT_MIN_BET = 10;
export const DEFAULT_MAX_BET = 10_000;
export const DEFAULT_BETTING_WINDOW_MS = 30_000;
export const DEFAULT_REVEAL_INTERVAL_MS = 800;
export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS_PER_ROOM = 8;

/** Prefixo de idempotência para apostas (cache Redis TTL) */
export const BET_IDEMPOTENCY_TTL_SECONDS = 300;
