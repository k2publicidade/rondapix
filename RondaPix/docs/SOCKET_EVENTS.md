# Eventos de Socket.IO — Ronda Online

Todos os contratos estão tipados em `packages/shared/src/contracts/socket-events.ts`.

## Servidor → Cliente

| Evento | Quando | Payload |
|--------|--------|---------|
| `room:joined` | Jogador entra na sala | Room, members, players, roundState |
| `room:state` | Reconexão | Estado completo atual |
| `player:seated` | Jogador senta | player, member |
| `player:left` | Jogador sai | playerId, newHostId |
| `round:statusChanged` | Transição de status | roundId, status |
| `round:pairRevealed` | Par revelado | roundId, pair, cutterId |
| `round:cutterChose` | Cortador escolheu | roundId, cutterId, side |
| `round:bettingOpened` | Apostas abertas | roundId, endsAt, windowSeconds |
| `round:betPlaced` | Aposta registrada | roundId, bet, totalPoolA, totalPoolB |
| `round:bettingLocked` | Apostas fechadas | roundId, totalBets, pools |
| `round:shuffleCommitted` | Hash publicado | roundId, serverSeedHash, clientSeed, nonce |
| `round:cardRevealed` | Carta virada | roundId, card, index, isTargetCard |
| `round:winnerDeclared` | Vencedor definido | roundId, winnerCard, winnerSide |
| `round:settled` | Rodada liquidada | roundId, settlement, serverSeed |
| `round:replayReady` | Replay disponível | roundId, replayId |
| `chat:message` | Nova mensagem | ChatMessage |
| `wallet:updated` | Saldo alterado | balance, lockedBalance |
| `system:error` | Erro de sistema | code, message, context |
| `system:ping` | Keep-alive | — |

## Cliente → Servidor

| Evento | Descrição | Callback |
|--------|-----------|---------|
| `room:join` | Entrar em sala | Result<{ room, session }> |
| `room:leave` | Sair da sala | Result<void> |
| `room:create` | Criar sala | Result<{ room }> |
| `room:requestState` | Pedir estado (reconexão) | Result<RoundState> |
| `round:chooseSide` | Cortador escolhe lado | Result<void> |
| `round:placeBet` | Fazer aposta | Result<{ bet, newBalance }> |
| `chat:send` | Enviar mensagem | Result<ChatMessage> |
| `system:pong` | Resposta ao ping | — |

## Padrão de Callback

```typescript
type SocketResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `UNAUTHORIZED` | Não autenticado |
| `ROOM_NOT_FOUND` | Sala não existe |
| `ROOM_FULL` | Sala lotada |
| `ROUND_NOT_ACTIVE` | Rodada não está ativa |
| `BETTING_CLOSED` | Janela de apostas encerrada |
| `ALREADY_BET` | Já apostou nesta rodada |
| `INSUFFICIENT_BALANCE` | Saldo insuficiente |
| `NOT_CUTTER` | Não é o cortador desta rodada |
| `INVALID_AMOUNT` | Valor de aposta inválido |
| `IDEMPOTENCY_CONFLICT` | Aposta duplicada (mesma chave) |
