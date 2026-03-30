import type { Bet, Card, CardSide, ChatMessage, RoundPair, RoundSettlement, RoundState, RoundStatus } from '../types/index.js';
import type { Player, PlayerSession } from '../types/player.js';
import type { Room, RoomMember } from '../types/room.js';

// ----------------------------------------------------------------
// Eventos emitidos pelo SERVIDOR para o cliente
// ----------------------------------------------------------------

export interface ServerToClientEvents {
  /** Confirmação de entrada na sala */
  'room:joined': (data: {
    room: Room;
    members: RoomMember[];
    players: Player[];
    roundState: RoundState | null;
  }) => void;

  /** Estado completo atual da sala (para reconexão) */
  'room:state': (data: {
    room: Room;
    members: RoomMember[];
    players: Player[];
    roundState: RoundState | null;
  }) => void;

  /** Jogador sentou/entrou */
  'player:seated': (data: { player: Player; member: RoomMember }) => void;

  /** Jogador saiu da sala */
  'player:left': (data: { playerId: string; newHostId: string | null }) => void;

  /** Status da rodada mudou */
  'round:statusChanged': (data: { roundId: string; status: RoundStatus }) => void;

  /** Par de cartas revelado para a rodada */
  'round:pairRevealed': (data: {
    roundId: string;
    pair: RoundPair;
    cutterId: string;
    cutterUsername: string;
  }) => void;

  /** Cortador escolheu um lado */
  'round:cutterChose': (data: {
    roundId: string;
    cutterId: string;
    side: CardSide;
  }) => void;

  /** Janela de apostas aberta */
  'round:bettingOpened': (data: {
    roundId: string;
    endsAt: string; // ISO timestamp
    windowSeconds: number;
  }) => void;

  /** Nova aposta registrada */
  'round:betPlaced': (data: {
    roundId: string;
    bet: Omit<Bet, 'amount'> & { amount: 'hidden' | number };
    totalPoolA: number;
    totalPoolB: number;
  }) => void;

  /** Apostas fechadas */
  'round:bettingLocked': (data: {
    roundId: string;
    totalBets: number;
    totalPoolA: number;
    totalPoolB: number;
  }) => void;

  /** Commit do shuffle (hash do server seed) */
  'round:shuffleCommitted': (data: {
    roundId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }) => void;

  /** Uma carta foi virada no reveal */
  'round:cardRevealed': (data: {
    roundId: string;
    card: Card;
    index: number;
    totalCards: number;
    isTargetCard: boolean;
    targetSide: CardSide | null;
  }) => void;

  /** Vencedor declarado (antes da liquidação) */
  'round:winnerDeclared': (data: {
    roundId: string;
    winnerCard: Card;
    winnerSide: CardSide;
  }) => void;

  /** Rodada liquidada — inclui payouts */
  'round:settled': (data: {
    roundId: string;
    settlement: RoundSettlement;
    serverSeed: string; // revelado após a rodada
  }) => void;

  /** Sincronização completa do estado da rodada */
  'round:stateSync': (data: RoundState) => void;

  /** Replay disponível */
  'round:replayReady': (data: { roundId: string; replayId: string }) => void;

  /** Mensagem de chat */
  'chat:message': (data: ChatMessage) => void;

  /** Erro de sistema */
  'system:error': (data: { code: string; message: string; context?: Record<string, unknown> }) => void;

  /** Saldo atualizado (após aposta/payout) */
  'wallet:updated': (data: { balance: number; lockedBalance: number }) => void;

  /** Ping para manter conexão */
  'system:ping': () => void;
}

// ----------------------------------------------------------------
// Eventos emitidos pelo CLIENTE para o servidor
// ----------------------------------------------------------------

export interface ClientToServerEvents {
  /** Entrar em uma sala */
  'room:join': (
    data: { roomId: string } | { roomCode: string },
    callback: (result: SocketResult<{ room: Room; session: PlayerSession }>) => void,
  ) => void;

  /** Sair da sala */
  'room:leave': (callback: (result: SocketResult<void>) => void) => void;

  /** Criar uma sala */
  'room:create': (
    data: { name: string; visibility: 'PUBLIC' | 'PRIVATE'; minBet: number; maxBet: number },
    callback: (result: SocketResult<{ room: Room }>) => void,
  ) => void;

  /** Host inicia a rodada */
  'round:start': (
    callback: (result: SocketResult<void>) => void,
  ) => void;

  /** Cortador escolhe um lado */
  'round:chooseSide': (
    data: { roundId: string; side: CardSide },
    callback: (result: SocketResult<void>) => void,
  ) => void;

  /** Jogador faz uma aposta */
  'round:placeBet': (
    data: { roundId: string; side: CardSide; amount: number; idempotencyKey: string },
    callback: (result: SocketResult<{ bet: Bet; newBalance: number }>) => void,
  ) => void;

  /** Solicitar estado atual (reconexão) */
  'room:requestState': (
    data: { roomId: string },
    callback: (result: SocketResult<RoundState | null>) => void,
  ) => void;

  /** Enviar mensagem de chat */
  'chat:send': (
    data: { roomId: string; content: string },
    callback: (result: SocketResult<ChatMessage>) => void,
  ) => void;

  /** Pong de resposta ao ping */
  'system:pong': () => void;
}

// ----------------------------------------------------------------
// Eventos de namespace (salas de socket)
// ----------------------------------------------------------------

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  username: string;
  roomId: string | null;
}

// ----------------------------------------------------------------
// Tipo helper para callbacks de socket
// ----------------------------------------------------------------

export type SocketResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
