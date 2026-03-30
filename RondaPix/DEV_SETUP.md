# RondaPix — Setup de Desenvolvimento

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker Desktop

## 1. Instalar dependências

```bash
pnpm install
```

## 2. Subir infraestrutura (PostgreSQL + Redis)

```bash
pnpm docker:up
```

Aguarde ~5s para o banco inicializar.

## 3. Criar tabelas e gerar Prisma Client

```bash
pnpm db:migrate
```

> Na primeira vez, informe um nome para a migration (ex: `init`)

## 4. Popular banco com dados de teste

```bash
pnpm db:seed
```

Usuários criados:
- `admin@ronda.local` / `admin123`
- `joao@ronda.local` / `senha123`
- `maria@ronda.local` / `senha123`

## 5. Iniciar em modo desenvolvimento

Em dois terminais separados:

**Terminal 1 — API (porta 3001):**
```bash
pnpm --filter @ronda/api dev
```

**Terminal 2 — Frontend (porta 3000):**
```bash
pnpm --filter @ronda/web dev
```

Ou ambos com Turbo:
```bash
pnpm dev
```

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |

## Comandos úteis

```bash
# Typecheck de todos os pacotes
pnpm typecheck

# Derrubar infraestrutura Docker
pnpm docker:down

# Prisma Studio (UI do banco)
pnpm db:studio

# Build de produção
pnpm build
```
