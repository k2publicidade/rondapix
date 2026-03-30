# Sistema de Fairness — Ronda Online

## Protocolo Commit-Reveal

O sistema garante que o resultado de cada rodada é imprevisível para todos os envolvidos,
inclusive o servidor, até o momento do reveal.

### Como Funciona

```
Antes da rodada:
  1. Servidor gera: serverSeed = random(32 bytes hex)
  2. Servidor publica: serverSeedHash = SHA256(serverSeed)
  3. Sistema gera: clientSeed = SHA256(roomId + nonce + random)

Durante a rodada:
  4. Apostas são feitas (serverSeed desconhecido por todos)

Após as apostas serem travadas:
  5. Shuffle executado: deterministicShuffle(deck, serverSeed, clientSeed, nonce)
  6. Cartas reveladas uma a uma

Após o fim da rodada:
  7. serverSeed revelado publicamente
  8. Qualquer pessoa pode verificar
```

### Algoritmo de Shuffle

Fisher-Yates com HMAC-SHA256:

```
Para i de (n-1) até 1:
  hmac = HMAC-SHA256(key=serverSeed, msg="${clientSeed}:${nonce}:${i}")
  randomValue = parseInt(hmac[0:8], 16)
  j = randomValue % (i + 1)
  swap(deck[i], deck[j])
```

### Verificação Independente

Qualquer pessoa com a prova pode verificar:

```typescript
import { verifyFairnessProof } from '@ronda/fairness';

const result = verifyFairnessProof(proof);
// result.valid === true se o resultado foi honesto
// result.details.seedHashMatch — hash bate com commit
// result.details.deckReproduced — deck pode ser reproduzido
```

### Exemplo em JavaScript (verificação externa)

```javascript
const crypto = require('crypto');

function verifyShot(serverSeed, clientSeed, nonce, serverSeedHash, expectedDeck) {
  // 1. Verificar hash
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  if (hash !== serverSeedHash) return { valid: false, reason: 'Hash inválido' };

  // 2. Reproduzir shuffle
  const deck = createStandardDeck(); // 36 cartas
  for (let i = deck.length - 1; i > 0; i--) {
    const hmac = crypto.createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}:${i}`)
      .digest('hex');
    const j = parseInt(hmac.slice(0, 8), 16) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // 3. Comparar com deck esperado
  const match = deck.every((c, i) => c.id === expectedDeck[i]);
  return { valid: match, reason: match ? 'OK' : 'Deck não confere' };
}
```

## Garantias de Segurança

| Propriedade | Garantia |
|-------------|----------|
| Imprevisibilidade | serverSeed com 256 bits de entropia |
| Não-manipulação | serverSeed commitado antes das apostas |
| Verificabilidade | Qualquer pessoa pode reproduzir o shuffle |
| Auditabilidade | Todas as provas salvas no banco de dados |
| Unicidade | Nonce único por rodada evita replay attacks |

## Limitações

- O `clientSeed` é gerado pelo servidor nesta versão social
- Em versões futuras, pode ser um hash dos IDs de todos os jogadores (multiplayer entropy)
- O servidor conhece o `serverSeed` antes de revelar — para maior segurança, usar HSM ou TEE
