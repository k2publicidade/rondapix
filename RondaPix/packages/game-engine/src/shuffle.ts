import { createHash, createHmac } from 'node:crypto';
import type { Card } from '@ronda/shared/types';

/**
 * Resultado do embaralhamento determinístico.
 */
export interface ShuffleResult {
  /** Baralho embaralhado */
  deck: Card[];
  /** Hash do serverSeed (commitado antes de revelar) */
  serverSeedHash: string;
  /** Server seed revelado após a rodada */
  serverSeed: string;
  /** Client seed fornecido pelo sistema */
  clientSeed: string;
  /** Nonce da rodada */
  nonce: number;
}

/**
 * Gera um hash SHA-256 do serverSeed para commit antes da rodada.
 * O hash é publicado antes do baralho ser embaralhado — garantia de fairness.
 */
export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Embaralhamento determinístico usando Fisher-Yates com HMAC-SHA256.
 *
 * Algoritmo:
 * 1. Cria um HMAC-SHA256 usando serverSeed como chave
 * 2. Mensagem: `${clientSeed}:${nonce}:${position}`
 * 3. Converte o hash em número e usa como índice de troca
 *
 * Isso garante:
 * - Reprodutibilidade total com os mesmos seeds
 * - Não há como prever o resultado sem conhecer o serverSeed
 * - Verificável por qualquer pessoa após a rodada
 */
export function deterministicShuffle(
  deck: Card[],
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Card[] {
  const shuffled = [...deck];
  const n = shuffled.length;

  for (let i = n - 1; i > 0; i--) {
    const hmac = createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}:${i}`)
      .digest('hex');

    // Converte os primeiros 8 bytes do HMAC em um número (big-endian)
    const randomValue = parseInt(hmac.slice(0, 8), 16);
    const j = randomValue % (i + 1);

    // Troca segura sem risco de undefined
    const temp = shuffled[i];
    const jCard = shuffled[j];
    if (temp === undefined || jCard === undefined) {
      throw new Error(`Erro de shuffle: índice inválido ${i} ou ${j}`);
    }
    shuffled[i] = jCard;
    shuffled[j] = temp;
  }

  return shuffled;
}

/**
 * Gera uma prova de fairness verificável.
 * Retorna a string que qualquer pessoa pode usar para verificar o resultado.
 */
export function generateFairnessProof(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): string {
  return JSON.stringify({
    serverSeed,
    clientSeed,
    nonce,
    serverSeedHash: hashServerSeed(serverSeed),
    algorithm: 'HMAC-SHA256 Fisher-Yates',
    version: '1.0',
  });
}

/**
 * Verifica se um shuffleResult é válido reproduzindo o shuffle.
 */
export function verifyShuffle(
  originalDeck: Card[],
  shuffledDeck: Card[],
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedServerSeedHash: string,
): boolean {
  // Verifica se o hash do serverSeed bate com o que foi commitado
  const actualHash = hashServerSeed(serverSeed);
  if (actualHash !== expectedServerSeedHash) {
    return false;
  }

  // Reproduz o shuffle e compara
  const reproduced = deterministicShuffle(originalDeck, serverSeed, clientSeed, nonce);
  return reproduced.every((card, i) => card.id === shuffledDeck[i]?.id);
}
