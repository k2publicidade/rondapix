'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { connectSocket, disconnectSocket } from '../lib/socket-client';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  balance: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateBalance: (balance: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem('ronda_token', token);
        connectSocket(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('ronda_token');
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateBalance: (balance) => {
        const user = get().user;
        if (user) set({ user: { ...user, balance } });
      },
    }),
    {
      name: 'ronda-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.isAuthenticated = true;
          connectSocket(state.token);
        }
      },
    },
  ),
);
