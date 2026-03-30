'use client';

import { create } from 'zustand';
import type { RoundState, Card, CardSide, RoundSettlement } from '@ronda/shared/types';
import type { Room, RoomMember, Player, ChatMessage } from '@ronda/shared/types';

interface RevealedCard {
  card: Card;
  index: number;
  isTarget: boolean;
  targetSide: CardSide | null;
}

interface GameState {
  room: Room | null;
  members: RoomMember[];
  players: Player[];
  roundState: RoundState | null;
  revealedCards: RevealedCard[];
  chatMessages: ChatMessage[];
  lastSettlement: RoundSettlement | null;
  bettingEndsAt: Date | null;

  setRoom: (room: Room) => void;
  setMembers: (members: RoomMember[]) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setRoundState: (state: RoundState | null) => void;
  addRevealedCard: (card: RevealedCard) => void;
  clearRevealedCards: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setSettlement: (s: RoundSettlement | null) => void;
  setBettingEndsAt: (d: Date | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  members: [],
  players: [],
  roundState: null,
  revealedCards: [],
  chatMessages: [],
  lastSettlement: null,
  bettingEndsAt: null,

  setRoom: (room) => set({ room }),
  setMembers: (members) => set({ members }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((s) => {
    if (s.players.some((p) => p.id === player.id)) return s;
    return { players: [...s.players, player] };
  }),
  removePlayer: (playerId) => set((s) => ({
    players: s.players.filter((p) => p.id !== playerId),
  })),
  setRoundState: (roundState) => set({ roundState }),
  addRevealedCard: (card) => set((s) => ({ revealedCards: [...s.revealedCards, card] })),
  clearRevealedCards: () => set({ revealedCards: [] }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setSettlement: (lastSettlement) => set({ lastSettlement }),
  setBettingEndsAt: (bettingEndsAt) => set({ bettingEndsAt }),
  reset: () =>
    set({
      room: null,
      members: [],
      players: [],
      roundState: null,
      revealedCards: [],
      chatMessages: [],
      lastSettlement: null,
      bettingEndsAt: null,
    }),
}));
