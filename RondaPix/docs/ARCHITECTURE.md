# Arquitetura — Ronda Online

## Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTES                              │
│   apps/web (Next.js 15)    apps/admin (Next.js 15)           │
│   localhost:3000            localhost:3002                    │
└─────────────┬──────────────────────────┬────────────────────┘
              │ HTTP + WebSocket          │ HTTP
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    apps/api (NestJS)                         │
│                    localhost:3001                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Auth     │ │ Rooms    │ │ Rounds   │ │ Wallet        │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Socket.IO Gateway (WebSockets)               │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────┬────────────────────────────┬────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐        ┌──────────────────────┐
│   PostgreSQL      │        │        Redis          │
│   (dados)         │        │   (cache + BullMQ)    │
└──────────────────┘        └──────────┬────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │   apps/worker         │
                             │   (BullMQ Workers)    │
                             └──────────────────────┘
```

## Pacotes Compartilhados

```
packages/
├── shared/          Tipos TypeScript e contratos de socket (sem dependências)
├── game-engine/     Engine pura da Ronda (funções puras, sem I/O)
├── fairness/        Commit-reveal e verificação de provas
├── ui/              Componentes React compartilhados (shadcn/ui)
└── config/          Configurações TS, ESLint, Prettier
```

## Princípios de Design

### Backend Autoritativo
Toda lógica de jogo é executada no servidor. O cliente apenas renderiza estado e envia inputs.

### Event Sourcing Parcial
Cada rodada mantém um log de eventos imutável (`RoundEvent[]`). Isso permite:
- Replay completo de qualquer rodada
- Auditoria de comportamento
- Depuração facilitada

### Máquina de Estados
`RoundStatus` segue um FSM estrito:
```
WAITING_FOR_PLAYERS
    → ASSIGNING_CUTTER
    → PAIR_REVEALED
    → BETTING_OPEN
    → BETTING_LOCKED
    → SHUFFLING
    → RUNNING_DECK
    → ROUND_SETTLED
    (qualquer estado) → ROUND_CANCELLED
```

### Fairness Verificável
Protocolo commit-reveal:
1. Servidor gera `serverSeed` e publica `SHA256(serverSeed)` antes da rodada
2. Sistema gera `clientSeed` derivado de entropia
3. Após a rodada, `serverSeed` é revelado
4. Qualquer pessoa pode reproduzir o shuffle com os seeds

### Transações Atômicas
Apostas e payouts usam transações PostgreSQL + versionamento otimista da wallet para evitar race conditions.

## Fluxo de uma Rodada

```
1. Sala com N jogadores aguardando
2. Sistema seleciona cortador aleatoriamente
3. Sistema gera par de cartas (sideA, sideB)
4. Cortador escolhe A ou B
5. Janela de apostas abre (30s)
6. Apostas são bloqueadas
7. Server seed commitado (hash publicado)
8. Shuffle determinístico executado
9. Cartas reveladas uma a uma (800ms cada)
10. Primeira carta-alvo encontrada = vencedor
11. Apostas liquidadas
12. Server seed revelado
13. Replay salvo
```

## Tecnologias

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Frontend | Next.js 15 + React 19 | App Router, SSR, performance |
| UI | Tailwind + shadcn/ui | Componentes headless, tipados |
| Backend | NestJS | Modular, testável, decorators |
| Realtime | Socket.IO | Salas, reconexão, namespace |
| ORM | Prisma | Type-safe, migrations, seeds |
| Banco | PostgreSQL 16 | ACID, JSON, Decimal |
| Cache/Queue | Redis + BullMQ | Jobs async, idempotência |
| Monorepo | Turborepo + pnpm | Cache, builds paralelos |
| Testes | Vitest + Jest | Fast, ESM-native |
