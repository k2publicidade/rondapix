# Esquema do Banco de Dados — Ronda Online

## Diagrama de Entidades

```
users (1) ──── (1) profiles
users (1) ──── (1) wallets
wallets (1) ──── (N) wallet_transactions

users (1) ──── (N) rooms [host]
rooms (1) ──── (N) room_members
room_members (N) ──── (1) users

rooms (1) ──── (N) rounds
rounds (1) ──── (N) bets
rounds (1) ──── (1) deck_snapshots
rounds (1) ──── (1) replays
rounds (1) ──── (1) fairness_proofs
rounds (1) ──── (N) round_targets

rooms (1) ──── (N) chat_messages
profiles (1) ──── (1) leaderboards
users (1) ──── (N) audit_logs
```

## Tabelas Principais

### `users`
Autenticação e identidade base.
- `id`: CUID (UUID v4 alternativo)
- `email`: único, índice
- `password_hash`: bcrypt
- `deleted_at`: soft delete

### `profiles`
Dados públicos e estatísticas.
- `username`: único, exibido no jogo
- `total_rounds`, `wins`, `losses`: agregados
- `total_wagered`, `total_won`: valores financeiros históricos

### `wallets`
Saldo de moedas virtuais.
- `balance`: saldo disponível
- `locked_balance`: saldo reservado para apostas em aberto
- `version`: versionamento otimista (previne race conditions)

### `wallet_transactions`
Histórico imutável de movimentações.
- `idempotency_key`: garante exactly-once em operações distribuídas
- `balance_before`/`balance_after`: snapshot do saldo no momento

### `rounds`
Estado de uma rodada completa.
- `server_seed_hash`: publicado antes da rodada
- `server_seed`: revelado após a rodada
- `nonce`: incrementa por rodada na sala
- `cutter_side`: lado escolhido pelo cortador

### `bets`
Apostas individuais.
- `idempotency_key`: previne apostas duplicadas
- Constraint única `(round_id, player_id)`: 1 aposta por jogador

### `fairness_proofs`
Prova verificável do resultado.
- `shuffled_deck_snapshot`: array com IDs das 36 cartas em ordem
- `verifiable`: false até o servidor revelar o seed

## Convenções

- Timestamps: `created_at`, `updated_at`, `deleted_at` (soft delete quando aplicável)
- Valores monetários: `DECIMAL(18, 2)` para precisão
- IDs: CUID via `@default(cuid())`
- snake_case no banco, camelCase no código TypeScript
- Todos os índices explicitamente declarados no schema

## Índices

```sql
-- Desempenho crítico em produção
CREATE INDEX idx_rounds_room_status ON rounds(room_id, status);
CREATE INDEX idx_bets_player ON bets(player_id);
CREATE INDEX idx_chat_room_time ON chat_messages(room_id, sent_at);
CREATE INDEX idx_leaderboard_period_score ON leaderboards(period, score DESC);
CREATE INDEX idx_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
```
