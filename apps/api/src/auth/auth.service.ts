import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt.strategy.js';

const INITIAL_BALANCE = 1000; // Saldo inicial de boas-vindas em moedas virtuais

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { profile: { username: dto.username } }],
      },
    });
    if (existing) {
      throw new ConflictException('Email ou username já está em uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          profile: {
            create: { username: dto.username },
          },
          wallet: {
            create: {
              balance: INITIAL_BALANCE,
              transactions: {
                create: {
                  userId: '', // será preenchido abaixo via connect
                  type: 'BONUS',
                  amount: INITIAL_BALANCE,
                  balanceBefore: 0,
                  balanceAfter: INITIAL_BALANCE,
                  description: 'Bônus de boas-vindas',
                },
              },
            },
          },
        },
        include: { profile: true, wallet: true },
      });

      // Corrige userId na transação
      await tx.walletTransaction.updateMany({
        where: { walletId: newUser.wallet!.id, userId: '' },
        data: { userId: newUser.id },
      });

      return newUser;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true, wallet: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: { id: string; email: string; profile: { username: string } | null; wallet: { balance: unknown } | null }) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.profile?.username ?? '',
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.profile?.username,
        balance: Number(user.wallet?.balance ?? 0),
      },
    };
  }
}
