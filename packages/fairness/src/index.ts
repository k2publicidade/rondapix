import { createHash, randomBytes } from 'node:crypto';
import type { Card } from '@ronda/shared/types';
import { createDeck, deterministicShuffle, hashServerSeed, verifyShuffle } from '@ronda/game-engine';

// ----------------------------------------------------------------
// Geração de seeds
// ----------------------------------------------------------------

/**
 * Gera um server seed aleatório e seu hash para commit.
 * O hash é publicado ANTES da rodada começar.
 * O seed é revelado DEPOIS que a rodada termina.
 */
export function generateServerSeedCommit(): { serverSeed: string; serverSeedHash: string } {
  const serverSeed = randomBytes(32).toString('hex');
  const serverSeedHash = hashServerSeed(serverSeed);
  return { serverSeed, serverSeedHash };
}

/**
 * Gera um client seed baseado em entropia mista (timestamp + random).
 * Em produção pode ser derivado de inputs de múltiplos jogadores.
 */
export function generateClientSeed(roomId: string, roundNonce: number): string {
  const entropy = randomBytes(16).toString('hex');
  return createHash('sha256')
    .update(`${roomId}:${roundNonce}:${entropy}`)
    .digest('hex')
    .slice(0, 32);
}

// ----------------------------------------------------------------
// Prova de fairness
// ----------------------------------------------------------------

export interface FairnessProof {
  roundId: string;
  serverSeedHash: string;
  serverSeed: string | null; // null antes da revelação
  clientSeed: string;
  nonce: number;
  shuffledDeckSnapshot: string[]; // IDs das cartas em ordem
  algorithm: string;
  version: string;
  verifiable: boolean;
  createdAt: string;
}

export interface FairnessVerificationResult {
  valid: boolean;
  errors: string[];
  details: {
    seedHashMatch: boolean;
    deckReproduced: boolean;
  };
}

/**
 * Cria um registro de prova de fairness (antes de revelar o seed).
 */
export function createFairnessProofCommit(params: {
  roundId: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}): Omit<FairnessProof, 'shuffledDeckSnapshot' | 'serverSeed'> & {
  shuffledDeckSnapshot: null;
  serverSeed: null;
} {
  return {
    roundId: params.roundId,
    serverSeedHash: params.serverSeedHash,
    serverSeed: null,
    clientSeed: params.clientSeed,
    nonce: params.nonce,
    shuffledDeckSnapshot: null,
    algorithm: 'HMAC-SHA256 Fisher-Yates',
    version: '1.0',
    verifiable: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Completa a prova de fairness após a rodada (revela o server seed).
 */
export function revealFairnessProof(
  commit: ReturnType<typeof createFairnessProofCommit>,
  serverSeed: string,
  shuffledDeck: Card[],
): FairnessProof {
  return {
    ...commit,
    serverSeed,
    shuffledDeckSnapshot: shuffledDeck.map((c) => c.id),
    verifiable: true,
  };
}

/**
 * Verifica uma prova de fairness completa.
 * Qualquer pessoa com a prova pode verificar o resultado.
 */
export function verifyFairnessProof(proof: FairnessProof): FairnessVerificationResult {
  const errors: string[] = [];

  if (!proof.verifiable || !proof.serverSeed) {
    return {
      valid: false,
      errors: ['Prova ainda não foi revelada (serverSeed ausente)'],
      details: { seedHashMatch: false, deckReproduced: false },
    };
  }

  // Verifica se o hash do serverSeed bate com o commit
  const actualHash = hashServerSeed(proof.serverSeed);
  const seedHashMatch = actualHash === proof.serverSeedHash;
  if (!seedHashMatch) {
    errors.push(`Hash do server seed não confere: esperado ${proof.serverSeedHash}, obtido ${actualHash}`);
  }

  // Reproduz o shuffle e verifica se o deck bate
  const originalDeck = createDeck();
  const reproduced = deterministicShuffle(
    originalDeck,
    proof.serverSeed,
    proof.clientSeed,
    proof.nonce,
  );
  const reproducedIds = reproduced.map((c) => c.id);
  const deckReproduced = reproducedIds.every((id, i) => id === proof.shuffledDeckSnapshot[i]);

  if (!deckReproduced) {
    errors.push('Deck embaralhado não pôde ser reproduzido com os seeds fornecidos');
  }

  return {
    valid: errors.length === 0,
    errors,
    details: { seedHashMatch, deckReproduced },
  };
}

export { hashServerSeed, verifyShuffle };
