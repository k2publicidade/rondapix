export type PlayerStatus = 'ONLINE' | 'OFFLINE' | 'IN_GAME' | 'SPECTATING';

export interface Player {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly status: PlayerStatus;
  readonly balance: number;
}

export interface PlayerProfile {
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly totalRounds: number;
  readonly wins: number;
  readonly losses: number;
  readonly totalWagered: number;
  readonly totalWon: number;
  readonly createdAt: Date;
}

export interface PlayerSession {
  readonly playerId: string;
  readonly socketId: string;
  readonly roomId: string | null;
  readonly connectedAt: Date;
}
