import { Body, Controller, Get, Param, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoomsService } from './rooms.service.js';
import { BotService } from '../game/bot.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly botService: BotService,
  ) {}

  @Get()
  listPublic() {
    return this.roomsService.listPublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.id, dto);
  }

  @Get('code/:code')
  getByCode(@Param('code') code: string) {
    return this.roomsService.getByCode(code);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.roomsService.getById(id);
  }

  @Post(':id/add-bot')
  @UseGuards(JwtAuthGuard)
  async addBot(@Request() req: any, @Param('id') id: string) {
    const room = await this.roomsService.getById(id);
    if (room.hostId !== req.user.id) {
      throw new ForbiddenException('Apenas o host pode adicionar bot');
    }
    const result = await this.botService.addBotToRoom(id);
    await this.roomsService.joinRoom(id, result.botId);
    return result;
  }
}