import { describe, expect, it } from 'vitest';
import { createDeck } from '@ronda/game-engine';
import { deterministicShuffle } from '@ronda/game-engine';
import {
  createFairnessProofCommit,
  generateClientSeed,
  generateServerSeedCommit,
  revealFairnessProof,
  verifyFairnessProof,
} from '../src/index.js';

describe('generateServerSeedCommit', () => {
  it('gera seed e hash distintos', () => {
    const { serverSeed, serverSeedHash } = generateServerSeedCommit();
    expect(serverSeed).toHaveLength(64); // 32 bytes hex
    expect(serverSeedHash).toHaveLength(64); // SHA-256 hex
    expect(serverSeed).not.toBe(serverSeedHash);
  });

  it('cada chamada gera seeds únicos', () => {
    const a = generateServerSeedCommit();
    const b = generateServerSeedCommit();
    expect(a.serverSeed).not.toBe(b.serverSeed);
    expect(a.serverSeedHash).not.toBe(b.serverSeedHash);
  });
});

describe('generateClientSeed', () => {
  it('retorna string hex de 32 chars', () => {
    const seed = generateClientSeed('room-1', 1);
    expect(seed).toHaveLength(32);
    expect(seed).toMatch(/^[0-9a-f]+$/);
  });

  it('seeds diferentes para nonces diferentes', () => {
    const a = generateClientSeed('room-1', 1);
    const b = generateClientSeed('room-1', 2);
    expect(a).not.toBe(b);
  });
});

describe('FairnessProof lifecycle', () => {
  it('ciclo completo: commit → reveal → verify', () => {
    const { serverSeed, serverSeedHash } = generateServerSeedCommit();
    const clientSeed = generateClientSeed('room-test', 1);
    const nonce = 1;
    const roundId = 'round-test';

    // 1. Commit (antes da rodada)
    const commit = createFairnessProofCommit({
      roundId,
      serverSeedHash,
      clientSeed,
      nonce,
    });
    expect(commit.serverSeed).toBeNull();
    expect(commit.verifiable).toBe(false);

    // 2. Executa o shuffle
    const deck = createDeck();
    const shuffledDeck = deterministicShuffle(deck, serverSeed, clientSeed, nonce);

    // 3. Reveal (após a rodada)
    const proof = revealFairnessProof(commit, serverSeed, shuffledDeck);
    expect(proof.serverSeed).toBe(serverSeed);
    expect(proof.verifiable).toBe(true);

    // 4. Verificação
    const result = verifyFairnessProof(proof);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.seedHashMatch).toBe(true);
    expect(result.details.deckReproduced).toBe(true);
  });

  it('falha na verificação se server seed foi adulterado', () => {
    const { serverSeed, serverSeedHash } = generateServerSeedCommit();
    const clientSeed = generateClientSeed('room-test', 1);
    const nonce = 1;

    const commit = createFairnessProofCommit({
      roundId: 'r1',
      serverSeedHash,
      clientSeed,
      nonce,
    });

    const deck = createDeck();
    const shuffledDeck = deterministicShuffle(deck, serverSeed, clientSeed, nonce);
    const proof = revealFairnessProof(commit, 'WRONG-SERVER-SEED', shuffledDeck);

    const result = verifyFairnessProof(proof);
    expect(result.valid).toBe(false);
    expect(result.details.seedHashMatch).toBe(false);
  });

  it('falha se deck snapshot foi adulterado', () => {
    const { serverSeed, serverSeedHash } = generateServerSeedCommit();
    const clientSeed = generateClientSeed('room-test', 1);
    const nonce = 1;

    const commit = createFairnessProofCommit({
      roundId: 'r1',
      serverSeedHash,
      clientSeed,
      nonce,
    });

    const deck = createDeck();
    const shuffledDeck = deterministicShuffle(deck, serverSeed, clientSeed, nonce);
    const proof = revealFairnessProof(commit, serverSeed, shuffledDeck);

    // Adultera o snapshot
    const tampered = { ...proof, shuffledDeckSnapshot: [...proof.shuffledDeckSnapshot].reverse() };
    const result = verifyFairnessProof(tampered);
    expect(result.valid).toBe(false);
    expect(result.details.deckReproduced).toBe(false);
  });

  it('retorna erro para prova não revelada', () => {
    const commit = createFairnessProofCommit({
      roundId: 'r1',
      serverSeedHash: 'hash',
      clientSeed: 'seed',
      nonce: 1,
    });

    // Prova incompleta (serverSeed null)
    const result = verifyFairnessProof(commit as never);
    expect(result.valid).toBe(false);
  });
});
