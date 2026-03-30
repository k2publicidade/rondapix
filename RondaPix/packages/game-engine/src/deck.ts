import type { Card, Rank, Suit } from '@ronda/shared/types';
import { DECK_SIZE, RANKS, SUITS } from './constants.js';

/**
 * Cria um baralho de 36 cartas em ordem canônica.
 * Ordem: naipe × rank (spades A-K, hearts A-K, diamonds A-K, clubs A-K, sem o 10)
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(suit, rank));
    }
  }

  if (deck.length !== DECK_SIZE) {
    throw new Error(`Deck inválido: esperado ${DECK_SIZE} cartas, obtido ${deck.length}`);
  }

  return deck;
}

/**
 * Cria uma carta com ID canônico.
 */
export function makeCard(suit: Suit, rank: Rank): Card {
  return {
    suit,
    rank,
    id: `${rank}-${suit}`,
  };
}

/**
 * Verifica se dois baralhos são idênticos (mesmas cartas na mesma ordem).
 */
export function decksAreEqual(a: Card[], b: Card[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((card, i) => card.id === b[i]?.id);
}

/**
 * Verifica se um baralho é completo e sem duplicatas.
 */
export function validateDeck(deck: Card[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (deck.length !== DECK_SIZE) {
    errors.push(`Tamanho incorreto: ${deck.length} (esperado ${DECK_SIZE})`);
  }

  const seen = new Set<string>();
  for (const card of deck) {
    if (seen.has(card.id)) {
      errors.push(`Carta duplicada: ${card.id}`);
    }
    seen.add(card.id);
  }

  const expected = createDeck().map((c) => c.id);
  const missing = expected.filter((id) => !seen.has(id));
  for (const id of missing) {
    errors.push(`Carta ausente: ${id}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Gera um par aleatório de cartas distintas a partir do deck.
 * As cartas escolhidas são retornadas — o deck original não é mutado.
 */
export function pickPair(deck: Card[], indexA: number, indexB: number): { sideA: Card; sideB: Card } {
  if (indexA === indexB) {
    throw new Error('Índices do par devem ser distintos');
  }
  const sideA = deck[indexA];
  const sideB = deck[indexB];
  if (!sideA || !sideB) {
    throw new Error(`Índice fora do intervalo: ${indexA}, ${indexB} (deck size: ${deck.length})`);
  }
  return { sideA, sideB };
}
