import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { RoomsService } from '../rooms/rooms.service.js';
import { RoundService } from './round.service.js';
import { BotService } from './bot.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  SocketResult,
  CardSide,
  RoundState,
} from '@ronda/shared';

type RondaSocket = Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>;

@WebSocketGateway({
  cors: {
    origin: (process.env['CORS_ORIGIN'] ?? 'http://localhost:3000').split(',').map(s => s.trim()),
    credentials: true,
  },
  namespace: '/',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly roomsService: RoomsService,
    private readonly roundService: RoundService,
    private readonly botService: BotService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: RondaSocket) {
    try {
      const token =
        client.handshake.auth?.['token'] ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; username: string }>(token);
      client.data.playerId = payload.sub;
      client.data.username = payload.username;
      client.data.roomId = null;

      this.logger.log(`Conectado: ${payload.username} (${client.id})`);
    } catch (err: any) {
      this.logger.error(`Falha na autenticação WebSocket: ${err.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: RondaSocket) {
    if (client.data.roomId) {
      await this.roomsService.leaveRoom(client.data.roomId, client.data.playerId);
      this.emitToRoom(client.data.roomId, 'player:left', {
        playerId: client.data.playerId,
        newHostId: null,
      });
    }
    this.logger.log(`Desconectado: ${client.data.username}`);
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private emitToRoom(roomId: string, event: string, data: unknown) {
    this.server.to(`room:${roomId}`).emit(event as any, data);
  }

  private makeEmitter(roomId: string) {
    return (event: string, data: unknown) => {
      this.emitToRoom(roomId, event, data);
      // Após settle, envia saldo atualizado para cada jogador
      if (event === 'round:settled') {
        this.broadcastBalances(roomId);
      }
    };
  }

  private async broadcastBalances(roomId: string) {
    const sockets = await this.server.in(`room:${roomId}`).fetchSockets();
    for (const s of sockets) {
      const playerId = (s.data as any)?.playerId;
      if (!playerId) continue;
      try {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: playerId } });
        if (wallet) {
          s.emit('wallet:updated', { balance: Number(wallet.balance), lockedBalance: Number(wallet.lockedBalance) });
        }
      } catch {}
    }
  }

  private ok<T>(data: T): SocketResult<T> {
    return { success: true, data };
  }

  private err(code: string, message: string): SocketResult<never> {
    return { success: false, error: { code, message } };
  }

  // ----------------------------------------------------------------
  // Room events — NestJS return-value pattern for acks
  // ----------------------------------------------------------------

  @SubscribeMessage('room:create')
  async onRoomCreate(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { name: string; visibility: 'PUBLIC' | 'PRIVATE'; minBet: number; maxBet: number },
  ): Promise<SocketResult<any>> {
    try {
      const room = await this.roomsService.create(client.data.playerId, data);
      client.join(`room:${room.id}`);
      client.data.roomId = room.id;
      return this.ok({ room });
    } catch (e: any) {
      return this.err('CREATE_ROOM_FAILED', e.message);
    }
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roomId?: string; roomCode?: string },
  ): Promise<SocketResult<any>> {
    try {
      this.logger.log(`room:join: data=${JSON.stringify(data)}, player=${client.data.playerId}`);

      let room;
      if ('roomCode' in data && data.roomCode) {
        room = await this.roomsService.getByCode(data.roomCode);
      } else if ('roomId' in data && data.roomId) {
        room = await this.roomsService.getById(data.roomId!);
      } else {
        return this.err('INVALID_DATA', 'roomId ou roomCode obrigatório');
      }
      this.logger.log(`room:join: room found: ${room.name} (${room.id})`);

      await this.roomsService.joinRoom(room.id, client.data.playerId);
      client.join(`room:${room.id}`);
      client.data.roomId = room.id;
      this.logger.log(`room:join: joined room, getting members`);

      const members = await this.roomsService.getMembers(room.id);
      const roundState = this.roundService.getActiveRound(room.id);
      this.logger.log(`room:join: ${members.length} members, roundState=${!!roundState}`);

      // Avisa outros que um jogador entrou
      client.to(`room:${room.id}`).emit('player:seated' as any, {
        player: {
          id: client.data.playerId,
          username: client.data.username,
          avatarUrl: null,
          status: 'ONLINE' as const,
          balance: 0,
        },
        member: members.find((m: any) => m.playerId === client.data.playerId),
      });

      // Envia estado completo ao jogador que entrou (via evento separado)
      client.emit('room:joined', {
        room,
        members: members.map((m: any) => ({
          playerId: m.playerId,
          roomId: m.roomId,
          isHost: m.isHost,
          seatIndex: m.seatIndex,
          joinedAt: m.joinedAt,
        })),
        players: members.map((m: any) => ({
          id: m.playerId,
          username: m.player.profile?.username ?? m.playerId,
          avatarUrl: m.player.profile?.avatarUrl ?? null,
          status: 'ONLINE' as const,
          balance: Number(m.player.wallet?.balance ?? 0),
        })),
        roundState,
      });

      this.logger.log(`room:join: success for ${client.data.username}`);
      return this.ok({
        room,
        session: {
          playerId: client.data.playerId,
          socketId: client.id,
          roomId: room.id,
          connectedAt: new Date(),
        },
      });
    } catch (e: any) {
      const msg = e?.response?.message ?? e?.message ?? String(e);
      this.logger.error(`room:join falhou: ${msg}`, e.stack);
      return this.err('JOIN_ROOM_FAILED', msg);
    }
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(
    @ConnectedSocket() client: RondaSocket,
  ): Promise<SocketResult<void>> {
    try {
      if (client.data.roomId) {
        await this.roomsService.leaveRoom(client.data.roomId, client.data.playerId);
        this.emitToRoom(client.data.roomId, 'player:left', {
          playerId: client.data.playerId,
          newHostId: null,
        });
        client.leave(`room:${client.data.roomId}`);
        client.data.roomId = null;
      }
      return this.ok(undefined);
    } catch (e: any) {
      return this.err('LEAVE_ROOM_FAILED', e.message);
    }
  }

  @SubscribeMessage('room:requestState')
  async onRequestState(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<SocketResult<any>> {
    try {
      const roundState = this.roundService.getActiveRound(data.roomId);
      return this.ok(roundState);
    } catch (e: any) {
      return this.err('STATE_ERROR', e.message);
    }
  }

  // ----------------------------------------------------------------
  // Round events
  // ----------------------------------------------------------------

  @SubscribeMessage('round:chooseSide')
  async onChooseSide(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roundId: string; side: CardSide },
  ): Promise<SocketResult<void>> {
    try {
      if (!client.data.roomId) return this.err('NOT_IN_ROOM', 'Não está em uma sala');
      await this.roundService.handleCutterChooseSide(
        client.data.roomId,
        client.data.playerId,
        data.side,
        this.makeEmitter(client.data.roomId),
      );
      // Após cortador humano escolher, agendar apostas dos bots
      this.scheduleBotBets(client.data.roomId);
      return this.ok(undefined);
    } catch (e: any) {
      return this.err('CHOOSE_SIDE_FAILED', e.message);
    }
  }

  @SubscribeMessage('round:placeBet')
  async onPlaceBet(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roundId: string; side: CardSide; amount: number; idempotencyKey: string },
  ): Promise<SocketResult<any>> {
    try {
      if (!client.data.roomId) return this.err('NOT_IN_ROOM', 'Não está em uma sala');
      const result = await this.roundService.handlePlaceBet(
        client.data.roomId,
        client.data.playerId,
        data.side,
        data.amount,
        data.idempotencyKey,
        this.makeEmitter(client.data.roomId),
      );
      // Atualiza saldo do jogador
      client.emit('wallet:updated', {
        balance: result.newBalance,
        lockedBalance: 0,
      });
      return this.ok(result);
    } catch (e: any) {
      return this.err('BET_FAILED', e.message);
    }
  }

  // ----------------------------------------------------------------
  // Chat events
  // ----------------------------------------------------------------

  @SubscribeMessage('chat:send')
  async onChatSend(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roomId: string; content: string },
  ): Promise<SocketResult<any>> {
    try {
      if (!data.content?.trim()) return this.err('EMPTY_MESSAGE', 'Mensagem vazia');

      const message = await this.prisma.chatMessage.create({
        data: {
          roomId: data.roomId,
          playerId: client.data.playerId,
          username: client.data.username,
          content: data.content.slice(0, 200),
        },
      });

      const chatMsg = {
        id: message.id,
        roomId: message.roomId,
        playerId: message.playerId,
        username: message.username,
        content: message.content,
        sentAt: message.sentAt,
      };

      this.emitToRoom(data.roomId, 'chat:message', chatMsg);
      return this.ok(chatMsg);
    } catch (e: any) {
      return this.err('CHAT_FAILED', e.message);
    }
  }

  // ----------------------------------------------------------------
  // Bot management
  // ----------------------------------------------------------------

  @SubscribeMessage('room:addBot')
  async onAddBot(
    @ConnectedSocket() client: RondaSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<SocketResult<any>> {
    try {
      if (!client.data.roomId) return this.err('NOT_IN_ROOM', 'Nao esta em uma sala');
      const room = await this.roomsService.getById(data.roomId);
      if (room.hostId !== client.data.playerId) {
        return this.err('FORBIDDEN', 'Apenas o host pode adicionar bot');
      }
      if (this.botService.getBotsInRoom(data.roomId) >= 3) {
        return this.err('MAX_BOTS', 'Maximo de 3 bots por sala');
      }

      const bot = await this.botService.addBotToRoom(data.roomId);
      await this.roomsService.joinRoom(data.roomId, bot.botId);

      // Notifica outros jogadores
      this.emitToRoom(data.roomId, 'player:seated', {
        player: {
          id: bot.botId,
          username: bot.display,
          avatarUrl: null,
          status: 'ONLINE' as const,
          balance: 0,
        },
        member: null,
      });

      return this.ok({ botId: bot.botId, username: bot.display });
    } catch (e: any) {
      return this.err('ADD_BOT_FAILED', e.message);
    }
  }

  // ----------------------------------------------------------------
  // Admin: iniciar rodada (só o host)
  // ----------------------------------------------------------------

  @SubscribeMessage('round:start')
  async onRoundStart(
    @ConnectedSocket() client: RondaSocket,
  ): Promise<SocketResult<void>> {
    try {
      if (!client.data.roomId) return this.err('NOT_IN_ROOM', 'Não está em uma sala');
      const room = await this.roomsService.getById(client.data.roomId);
      if (room.hostId !== client.data.playerId) {
        return this.err('FORBIDDEN', 'Apenas o host pode iniciar a rodada');
      }
      this.logger.log(`round:start: roomId=${client.data.roomId}, host=${client.data.username}`);
      const state = await this.roundService.startNewRound(client.data.roomId, this.makeEmitter(client.data.roomId));
      // Envia estado completo da rodada para todos na sala
      this.emitToRoom(client.data.roomId, 'round:stateSync', state);

      // Se o cortador é um bot, auto-escolhe lado
      if (state.cutterId && this.botService.isBot(state.cutterId)) {
        this.logger.log(`round:start: cortador é bot ${state.cutterId}, auto-escolhendo lado`);
        this.scheduleBotCutterChoice(client.data.roomId, state);
      }

      return this.ok(undefined);
    } catch (e: any) {
      this.logger.error(`round:start falhou: ${e.message}`, e.stack);
      return this.err('START_ROUND_FAILED', e.message);
    }
  }

  // ----------------------------------------------------------------
  // Bot AI integration
  // ----------------------------------------------------------------

  private scheduleBotCutterChoice(roomId: string, state: RoundState) {
    const cutterId = state.cutterId!;
    const delay = 1500 + Math.random() * 2000;
    setTimeout(async () => {
      try {
        const side = Math.random() < 0.5 ? 'A' : 'B';
        this.logger.log(`[BOT] ${cutterId} escolheu lado ${side} na sala ${roomId}`);
        await this.roundService.handleCutterChooseSide(
          roomId,
          cutterId,
          side as CardSide,
          this.makeEmitter(roomId),
        );
        // Após cutter escolher, agendar apostas dos bots
        this.scheduleBotBets(roomId);
      } catch (e: any) {
        this.logger.error(`[BOT] Erro ao escolher lado: ${e.message}`);
      }
    }, delay);
  }

  private scheduleBotBets(roomId: string) {
    const botsInRoom = this.botService.getBotIdsInRoom(roomId);
    for (const botId of botsInRoom) {
      const delay = 2000 + Math.random() * 5000;
      setTimeout(async () => {
        try {
          const currentState = this.roundService.getActiveRound(roomId);
          if (!currentState || currentState.status !== 'BETTING_OPEN') return;
          if (currentState.bets[botId]) return; // já apostou

          const room = await this.roomsService.getById(roomId);
          const side = Math.random() < 0.5 ? 'A' : 'B';
          const minBet = room.minBet;
          const maxBet = room.maxBet;
          const amount = Math.max(minBet, Math.min(maxBet, Math.round(minBet + Math.random() * (maxBet - minBet) * 0.5)));
          const idempotencyKey = `bot-${botId}-${currentState.id}-${Date.now()}`;

          this.logger.log(`[BOT] ${botId} apostando ${amount} no lado ${side}`);
          await this.roundService.handlePlaceBet(
            roomId,
            botId,
            side as CardSide,
            amount,
            idempotencyKey,
            this.makeEmitter(roomId),
          );
        } catch (e: any) {
          this.logger.error(`[BOT] Erro ao apostar: ${e.message}`);
        }
      }, delay);
    }
  }

}
