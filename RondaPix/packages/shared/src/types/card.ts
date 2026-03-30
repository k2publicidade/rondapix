/**
 * Representa um naipe do baralho da Ronda.
 * O baralho usa 36 cartas: A, 2, 3, 4, 5, 6, 7, J, Q, K em 3 naipes + alguns especiais.
 * Simplificação: usamos baralho padrão 36 cartas (A-9 em 4 naipes).
 */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  /** Identificador único composto: "A-spades", "K-hearts", etc. */
  readonly id: string;
}

export type CardSide = 'A' | 'B';

export interface RoundPair {
  readonly sideA: Card;
  readonly sideB: Card;
}

/** Índice da carta no baralho embaralhado (0-35) */
export type DeckIndex = number;
