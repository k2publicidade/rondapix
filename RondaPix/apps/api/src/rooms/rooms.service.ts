import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import type { Room } from '@ronda/shared';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function mapRoom(room: any, memberCount: number): Room {
  return {
    id: room.id,
    name: room.name,
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    visibility: room.visibility,
    maxPlayers: room.maxPlayers,
    minBet: Number(room.minBet),
    maxBet: Number(room.maxBet),
    currentPlayers: memberCount,
    currentRoundId: null,
    createdAt: room.createdAt,
  };
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const rooms = await this.prisma.room.findMany({
      where: { status: { in: ['WAITING', 'IN_PROGRESS'] }, visibility: 'PUBLIC' },
      include: { _count: { select: { members: { where: { leftAt: null } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rooms.map((r: any) => mapRoom(r, r._count.members));
  }

  async create(userId: string, dto: CreateRoomDto): Promise<Room> {
    if (dto.minBet > dto.maxBet) throw new BadRequestException('minBet > maxBet');

    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 20) throw new BadRequestException('Não foi possível gerar código único');
    } while (await this.prisma.room.findUnique({ where: { code } }));

    const room = await this.prisma.$transaction(async (tx: any) => {
      const newRoom = await tx.room.create({
        data: {
          name: dto.name,
          code,
          hostId: userId,
          visibility: dto.visibility,
          minBet: dto.minBet,
          maxBet: dto.maxBet,
        },
      });
      await tx.roomMember.create({
        data: { roomId: newRoom.id, playerId: userId, isHost: true, seatIndex: 0 },
      });
      return newRoom;
    });

    return mapRoom(room, 1);
  }

  async getById(roomId: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { members: { where: { leftAt: null } } } } },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return mapRoom(room, room._count.members);
  }

  async getByCode(code: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { members: { where: { leftAt: null } } } } },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return mapRoom(room, room._count.members);
  }

  async joinRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { where: { leftAt: null } },
        _count: { select: { members: { where: { leftAt: null } } } },
      },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === 'CLOSED') throw new BadRequestException('Sala fechada');

    const alreadyActive = room.members.find((m: any) => m.playerId === userId);
    if (alreadyActive) return mapRoom(room, room._count.members);

    if (room._count.members >= room.maxPlayers) {
      throw new BadRequestException('Sala cheia');
    }

    // Verifica se já existe registro (saiu antes) — reativa ao invés de criar novo
    const existingMember = await this.prisma.roomMember.findFirst({
      where: { roomId, playerId: userId },
    });

    const seatIndex = room._count.members;
    if (existingMember) {
      await this.prisma.roomMember.update({
        where: { id: existingMember.id },
        data: { leftAt: null, seatIndex },
      });
    } else {
      await this.prisma.roomMember.create({
        data: { roomId, playerId: userId, isHost: false, seatIndex },
      });
    }

    return mapRoom(room, room._count.members + 1);
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.prisma.roomMember.updateMany({
      where: { roomId, playerId: userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async getMembers(roomId: string) {
    return this.prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      include: {
        player: { include: { profile: true, wallet: true } },
      },
    });
  }

  async closeRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.hostId !== userId) throw new ForbiddenException('Apenas o host pode fechar a sala');
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
}
