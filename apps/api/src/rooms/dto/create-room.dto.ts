import { IsString, MinLength, MaxLength, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  name!: string;

  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility!: 'PUBLIC' | 'PRIVATE';

  @IsNumber()
  @Min(10)
  minBet!: number;

  @IsNumber()
  @Min(10)
  @Max(100000)
  maxBet!: number;
}
