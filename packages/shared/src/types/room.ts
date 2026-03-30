export type RoomStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED';
export type RoomVisibility = 'PUBLIC' | 'PRIVATE';

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly hostId: string;
  readonly status: RoomStatus;
  readonly visibility: RoomVisibility;
  readonly maxPlayers: number;
  readonly minBet: number;
  readonly maxBet: number;
  readonly currentPlayers: number;
  readonly currentRoundId: string | null;
  readonly createdAt: Date;
}

export interface RoomMember {
  readonly playerId: string;
  readonly roomId: string;
  readonly isHost: boolean;
  readonly seatIndex: number | null;
  readonly joinedAt: Date;
}

export interface ChatMessage {
  readonly id: string;
  readonly roomId: string;
  readonly playerId: string;
  readonly username: string;
  readonly content: string;
  readonly sentAt: Date;
}
