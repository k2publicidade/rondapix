import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Carteira não encontrada');
    return { balance: Number(wallet.balance), lockedBalance: Number(wallet.lockedBalance) };
  }

  async lockForBet(userId: string, amount: number, roundId: string, idempotencyKey: string): Promise<void> {
    const existing = await this.prisma.walletTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return;

    await this.prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new BadRequestException('Carteira não encontrada');

      const balance = Number(wallet.balance);
      if (balance < amount) throw new BadRequestException('Saldo insuficiente');

      await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: { decrement: amount },
          lockedBalance: { increment: amount },
          version: { increment: 1 },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'BET_PLACED',
          amount,
          balanceBefore: balance,
          balanceAfter: balance - amount,
          referenceId: roundId,
          idempotencyKey,
          description: `Aposta na rodada ${roundId}`,
        },
      });
    });
  }

  async settleBets(
    payouts: Array<{ userId: string; roundId: string; betAmount: number; payout: number; won: boolean }>,
  ): Promise<void> {
    for (const p of payouts) {
      await this.prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
        if (!wallet) return;

        const lockedBalance = Number(wallet.lockedBalance);
        const currentBalance = Number(wallet.balance);

        if (p.won) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              lockedBalance: { decrement: p.betAmount },
              balance: { increment: p.payout },
              version: { increment: 1 },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: p.userId,
              type: 'BET_WON',
              amount: p.payout,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + p.payout,
              referenceId: p.roundId,
              description: `Prêmio da rodada ${p.roundId}`,
            },
          });
        } else {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              lockedBalance: { decrement: Math.min(p.betAmount, lockedBalance) },
              version: { increment: 1 },
            },
          });
        }
      });
    }
  }

  async refundBets(
    refunds: Array<{ userId: string; roundId: string; amount: number }>,
  ): Promise<void> {
    for (const r of refunds) {
      await this.prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: r.userId } });
        if (!wallet) return;

        const currentBalance = Number(wallet.balance);
        const lockedBalance = Number(wallet.lockedBalance);

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: r.amount },
            lockedBalance: { decrement: Math.min(r.amount, lockedBalance) },
            version: { increment: 1 },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: r.userId,
            type: 'BET_REFUNDED',
            amount: r.amount,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + r.amount,
            referenceId: r.roundId,
            description: `Reembolso da rodada cancelada ${r.roundId}`,
          },
        });
      });
    }
  }
}
