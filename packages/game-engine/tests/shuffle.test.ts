import { describe, expect, it } from 'vitest';
import { createDeck } from '../src/deck.js';
import { deterministicShuffle, hashServerSeed, verifyShuffle } from '../src/shuffle.js';

const SERVER_SEED = 'test-server-seed-abc123';
const CLIENT_SEED = 'test-client-seed-xyz789';
const NONCE = 1;

describe('hashServerSeed', () => {
  it('retorna hash hex de 64 chars', () => {
    const hash = hashServerSeed(SERVER_SEED);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('é determinístico para o mesmo input', () => {
    expect(hashServerSeed(SERVER_SEED)).toBe(hashServerSeed(SERVER_SEED));
  });

  it('produz hashes diferentes para seeds diferentes', () => {
    expect(hashServerSeed('seed1')).not.toBe(hashServerSeed('seed2'));
  });
});

describe('deterministicShuffle', () => {
  it('retorna baralho com mesmo tamanho', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    expect(shuffled).toHaveLength(deck.length);
  });

  it('contém as mesmas cartas (apenas reordenadas)', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(originalIds).toEqual(shuffledIds);
  });

  it('é determinístico — mesmo resultado para mesmos inputs', () => {
    const deck = createDeck();
    const a = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const b = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('produz resultados diferentes para nonces diferentes', () => {
    const deck = createDeck();
    const a = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, 1);
    const b = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, 2);
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('produz resultados diferentes para client seeds diferentes', () => {
    const deck = createDeck();
    const a = deterministicShuffle(deck, SERVER_SEED, 'client-seed-1', NONCE);
    const b = deterministicShuffle(deck, SERVER_SEED, 'client-seed-2', NONCE);
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('não muta o deck original', () => {
    const deck = createDeck();
    const originalOrder = deck.map((c) => c.id);
    deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    expect(deck.map((c) => c.id)).toEqual(originalOrder);
  });

  it('distribui cartas de forma não-trivial (não deixa tudo no lugar)', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const samePositions = deck.filter((c, i) => c.id === shuffled[i]?.id).length;
    // Num shuffle de 36 cartas, espera-se que ~1/36 fique no lugar (~1)
    // Se mais de 30% ficou no lugar, algo está errado
    expect(samePositions).toBeLessThan(deck.length * 0.3);
  });
});

describe('verifyShuffle', () => {
  it('retorna true para shuffle correto', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const expectedHash = hashServerSeed(SERVER_SEED);

    const valid = verifyShuffle(deck, shuffled, SERVER_SEED, CLIENT_SEED, NONCE, expectedHash);
    expect(valid).toBe(true);
  });

  it('retorna false se o serverSeed não bate com o hash', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const wrongHash = hashServerSeed('wrong-seed');

    const valid = verifyShuffle(deck, shuffled, SERVER_SEED, CLIENT_SEED, NONCE, wrongHash);
    expect(valid).toBe(false);
  });

  it('retorna false se o baralho embaralhado foi alterado', () => {
    const deck = createDeck();
    const shuffled = deterministicShuffle(deck, SERVER_SEED, CLIENT_SEED, NONCE);
    const tampered = [...shuffled];
    const tmp = tampered[0];
    tampered[0] = tampered[1]!;
    tampered[1] = tmp!;

    const expectedHash = hashServerSeed(SERVER_SEED);
    const valid = verifyShuffle(deck, tampered, SERVER_SEED, CLIENT_SEED, NONCE, expectedHash);
    expect(valid).toBe(false);
  });
});
