import { Module, forwardRef } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { RoomsController } from './rooms.controller.js';
import { GameModule } from '../game/game.module.js';

@Module({
  imports: [forwardRef(() => GameModule)],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
