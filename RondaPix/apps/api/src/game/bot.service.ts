import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

const BOT_BALANCE = 50_000;
const BOT_LOW_BALANCE = 5_000;

const BOT_PROFILES = [
  { email: 'bot1@ronda.internal', username: 'RondaBot_Ze',     display: '🤖 RondaBot_Zé' },
  { email: 'bot2@ronda.internal', username: 'RondaBot_Maria',  display: '🤖 RondaBot_Maria' },
  { email: 'bot3@ronda.internal', username: 'RondaBot_Pardal', display: '🤖 RondaBot_Pardal' },
] as const;

const CHAT_PHRASES = [
  'boa sorte a todos 🃏',
  'vai no A! 🔥',
  'B tá quente hoje',
  'caramba, que rodada!',
  'tô dentro 💰',
  'nossa sorte virou',
];

interface BotInstance {
  userId: string;
  username: string;
  display: string;
  roomId: string | null;
  roundCount: number;
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private readonly bots = new Map<string, BotInstance>();
  private readonly roomBots = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    this.logger.log('[onModuleInit] Inicializando bots...');
    this.ensureBotUsers().catch(err =>
      this.logger.warn(`[onModuleInit] Falha: ${err.message}`),
    );
  }

  private async ensureBotUsers(): Promise<void> {
    for (const profile of BOT_PROFILES) {
      try {
        this.logger.log(`[ensureBotUsers] Verificando ${profile.username}...`);
        let user = await this.prisma.user.findUnique({
          where: { email: profile.email },
          include: { profile: true, wallet: true },
        });

        if (!user) {
          this.logger.log(`[ensureBotUsers] Criando ${profile.username}...`);
          const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 4);

          const newUser = await this.prisma.user.create({
            data: {
              email: profile.email,
              passwordHash,
              profile: { create: { username: profile.username } },
              wallet:  { create: { balance: BOT_BALANCE } },
            },
            include: { profile: true, wallet: true },
          });

          await this.prisma.walletTransaction.create({
            data: {
              walletId: newUser.wallet!.id,
              userId: newUser.id,
              type: 'BONUS',
              amount: BOT_BALANCE,
              balanceBefore: 0,
              balanceAfter: BOT_BALANCE,
              description: 'Saldo inicial do bot',
            },
          });

          user = newUser;
          this.logger.log(`[ensureBotUsers] Bot criado: ${profile.username} (${user.id})`);
        } else {
          this.logger.log(`[ensureBotUsers] Bot já existe: ${profile.username} (${user.id})`);
        }

        this.bots.set(user.id, {
          userId: user.id,
          username: profile.username,
          display: profile.display,
          roomId: null,
          roundCount: 0,
        });
      } catch (err: any) {
        this.logger.error(`[ensureBotUsers] Erro em ${profile.username}: ${err.message}`);
      }
    }
    this.logger.log(`[ensureBotUsers] ${this.bots.size} bots prontos`);
  }

  // ---- Queries ----

  getBotsInRoom(roomId: string): number {
    return this.roomBots.get(roomId)?.size ?? 0;
  }

  getBotIdsInRoom(roomId: string): string[] {
    const set = this.roomBots.get(roomId);
    return set ? [...set] : [];
  }

  isBot(userId: string): boolean {
    return this.bots.has(userId);
  }

  getBotDisplay(userId: string): string | null {
    return this.bots.get(userId)?.display ?? null;
  }

  // ---- Room lifecycle (sem socket — join direto via DB) ----

  private getAvailableBot(): BotInstance | null {
    for (const bot of this.bots.values()) {
      if (!bot.roomId) return bot;
    }
    return null;
  }

  /**
   * Registra um bot na sala. O controller/gateway deve chamar
   * roomsService.joinRoom() e emitir player:seated separadamente.
   */
  async addBotToRoom(roomId: string): Promise<{ botId: string; username: string; display: string }> {
    this.logger.log(`[addBotToRoom] Solicitação para sala ${roomId}`);

    if (this.getBotsInRoom(roomId) >= 3) {
      throw new Error('Máximo de 3 bots por sala');
    }

    if (this.bots.size === 0) {
      this.logger.log('[addBotToRoom] Bots não inicializados, tentando agora...');
      await this.ensureBotUsers();
    }

    const bot = this.getAvailableBot();
    if (!bot) throw new Error('Nenhum bot disponível');

    this.logger.log(`[addBotToRoom] Bot selecionado: ${bot.display} (${bot.userId})`);
    await this.ensureBotBalance(bot.userId);

    bot.roomId = roomId;
    bot.roundCount = 0;

    if (!this.roomBots.has(roomId)) this.roomBots.set(roomId, new Set());
    this.roomBots.get(roomId)!.add(bot.userId);

    this.logger.log(`[addBotToRoom] Bot ${bot.display} registrado na sala ${roomId} ✓`);
    return { botId: bot.userId, username: bot.username, display: bot.display };
  }

  removeBotFromRoom(roomId: string, botId?: string): void {
    const botsInRoom = this.roomBots.get(roomId);
    if (!botsInRoom) return;

    const ids = botId ? [botId] : [...botsInRoom];
    for (const id of ids) {
      const bot = this.bots.get(id);
      if (bot) {
        this.logger.log(`[removeBotFromRoom] Removendo ${bot.display} da sala ${roomId}`);
        bot.roomId = null;
        bot.roundCount = 0;
      }
      botsInRoom.delete(id);
    }
    if (botsInRoom.size === 0) this.roomBots.delete(roomId);
  }

  // ---- Bot AI decision (chamado pelo round service) ----

  decideBotAction(
    botId: string,
    event: 'pairRevealed' | 'bettingOpened' | 'settled',
    data: any,
    minBet: number,
    maxBet: number,
  ): { action: string; payload: any; delayMs: number } | null {
    const bot = this.bots.get(botId);
    if (!bot || !bot.roomId) return null;

    switch (event) {
      case 'pairRevealed': {
        bot.roundCount++;
        this.logger.debug(`[decide] ${bot.display} pairRevealed (round #${bot.roundCount})`);
        if (data.cutterId === bot.userId) {
          const side = Math.random() < 0.5 ? 'A' : 'B';
          this.logger.debug(`[decide] ${bot.display} vai cortar: lado ${side}`);
          return {
            action: 'chooseSide',
            payload: { roundId: data.roundId, side },
            delayMs: 2_000 + Math.random() * 2_000,
          };
        }
        return null;
      }

      case 'bettingOpened': {
        const side = data.poolA >= data.poolB
          ? (Math.random() < 0.6 ? 'A' : 'B')
          : (Math.random() < 0.6 ? 'B' : 'A');
        const amount = Math.max(minBet, Math.min(maxBet, Math.round(BOT_BALANCE * (0.1 + Math.random() * 0.2))));
        const key = `bot-${botId}-${data.roundId}-${Date.now()}`;
        this.logger.debug(`[decide] ${bot.display} vai apostar ${amount} no lado ${side}`);
        return {
          action: 'placeBet',
          payload: { roundId: data.roundId, side, amount, idempotencyKey: key },
          delayMs: 1_000 + Math.random() * 2_000,
        };
      }

      case 'settled': {
        if (bot.roundCount % 3 === 0) {
          const msg = CHAT_PHRASES[Math.floor(Math.random() * CHAT_PHRASES.length)];
          return {
            action: 'chat',
            payload: { roomId: bot.roomId, content: msg },
            delayMs: 1_000 + Math.random() * 2_000,
          };
        }
        return null;
      }
    }
  }

  // ---- Balance ----

  private async ensureBotBalance(userId: string): Promise<void> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      this.logger.warn(`[ensureBotBalance] Wallet não encontrada para ${userId}`);
      return;
    }

    const balance = Number(wallet.balance);
    if (balance >= BOT_LOW_BALANCE) return;

    const topUp = BOT_BALANCE - balance;
    this.logger.log(`[ensureBotBalance] Recarregando ${userId}: ${balance} → ${BOT_BALANCE} (+${topUp})`);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: BOT_BALANCE, version: { increment: 1 } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: 'BONUS',
        amount: topUp,
        balanceBefore: balance,
        balanceAfter: BOT_BALANCE,
        description: 'Recarga automática do bot',
      },
    });
    this.logger.log(`[ensureBotBalance] Bot ${userId} recarregado ✓`);
  }
}
