import { describe, expect, it } from 'vitest';
import { createDeck, decksAreEqual, makeCard, pickPair, validateDeck } from '../src/deck.js';
import { DECK_SIZE } from '../src/constants.js';

describe('createDeck', () => {
  it('cria um baralho com 36 cartas', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(DECK_SIZE);
  });

  it('não contém cartas duplicadas', () => {
    const deck = createDeck();
    const ids = deck.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(DECK_SIZE);
  });

  it('cada carta tem id no formato "rank-suit"', () => {
    const deck = createDeck();
    for (const card of deck) {
      expect(card.id).toBe(`${card.rank}-${card.suit}`);
    }
  });

  it('contém 9 ranks por naipe', () => {
    const deck = createDeck();
    const bySuit: Record<string, number> = {};
    for (const card of deck) {
      bySuit[card.suit] = (bySuit[card.suit] ?? 0) + 1;
    }
    expect(Object.values(bySuit)).toEqual([9, 9, 9, 9]);
  });
});

describe('validateDeck', () => {
  it('valida baralho correto', () => {
    const deck = createDeck();
    const result = validateDeck(deck);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detecta baralho com tamanho errado', () => {
    const deck = createDeck().slice(0, 30);
    const result = validateDeck(deck);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Tamanho'))).toBe(true);
  });

  it('detecta carta duplicada', () => {
    const deck = createDeck();
    deck[1] = deck[0]!; // duplica a primeira carta
    const result = validateDeck(deck);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicada'))).toBe(true);
  });
});

describe('makeCard', () => {
  it('cria carta com propriedades corretas', () => {
    const card = makeCard('hearts', 'A');
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('A');
    expect(card.id).toBe('A-hearts');
  });
});

describe('decksAreEqual', () => {
  it('retorna true para baralhos iguais', () => {
    const a = createDeck();
    const b = createDeck();
    expect(decksAreEqual(a, b)).toBe(true);
  });

  it('retorna false para baralhos em ordens diferentes', () => {
    const a = createDeck();
    const b = [...a].reverse();
    expect(decksAreEqual(a, b)).toBe(false);
  });

  it('retorna false para baralhos de tamanhos diferentes', () => {
    const a = createDeck();
    const b = a.slice(0, 10);
    expect(decksAreEqual(a, b)).toBe(false);
  });
});

describe('pickPair', () => {
  it('retorna par de cartas distintas', () => {
    const deck = createDeck();
    const pair = pickPair(deck, 0, 1);
    expect(pair.sideA).not.toEqual(pair.sideB);
  });

  it('lança erro para índices iguais', () => {
    const deck = createDeck();
    expect(() => pickPair(deck, 5, 5)).toThrow('Índices do par devem ser distintos');
  });

  it('lança erro para índice fora do baralho', () => {
    const deck = createDeck();
    expect(() => pickPair(deck, 0, 100)).toThrow('Índice fora do intervalo');
  });
});
