import { Module, forwardRef } from '@nestjs/common';
import { GameGateway } from './game.gateway.js';
import { RoundService } from './round.service.js';
import { BotService } from './bot.service.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [forwardRef(() => RoomsModule), WalletModule, AuthModule],
  providers: [GameGateway, RoundService, BotService],
  exports: [GameGateway, RoundService, BotService],
})
export class GameModule {}
