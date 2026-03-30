'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedToken = localStorage.getItem('ronda_token');
      router.replace((isAuthenticated || storedToken) ? '/lobby' : '/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <main className="flex min-h-screen items-center justify-center felt-table relative overflow-hidden">
      {/* Vinheta escura nas bordas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />

      <div className="relative z-10 text-center space-y-8 slide-in-up">
        {/* Logo com cartas embaralhando */}
        <div className="relative inline-block">
          {/* Cartas atrás do logo */}
          <div className="flex justify-center gap-1 mb-4">
            <div className="shuffle-card w-12 h-16 rounded-lg bg-gradient-to-br from-[#c0392b] to-[#962d22] border border-[#e74c3c]/30 shadow-lg flex items-center justify-center text-white/80 text-xs font-bold">
              ♥
            </div>
            <div className="shuffle-card w-12 h-16 rounded-lg bg-gradient-to-br from-[#1a3a6b] to-[#142d54] border border-[#2980b9]/30 shadow-lg flex items-center justify-center text-white/80 text-xs font-bold">
              ♠
            </div>
            <div className="shuffle-card w-12 h-16 rounded-lg bg-gradient-to-br from-[#c0392b] to-[#962d22] border border-[#e74c3c]/30 shadow-lg flex items-center justify-center text-white/80 text-xs font-bold">
              ♦
            </div>
          </div>

          <h1 className="text-7xl font-black tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-[#c9a84c] drop-shadow-[0_0_25px_rgba(201,168,76,0.3)]">🃏 Ronda</span>
            <span className="text-[#1a5c3a] drop-shadow-[0_0_15px_rgba(26,92,58,0.3)]"> Pix</span>
          </h1>

          <p className="mt-3 text-[#c9a84c]/60 text-sm tracking-[0.3em] uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
            O jogo de cartas do subúrbio carioca
          </p>
        </div>

        {/* Loading animado */}
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
          <p className="pulse-text text-[#c9a84c]/50 text-sm tracking-widest uppercase">
            Carregando...
          </p>
        </div>
      </div>

      {/* Naipes sutis nos cantos */}
      <span className="absolute top-8 left-8 text-4xl text-[#c9a84c]/[0.04] select-none">♠</span>
      <span className="absolute top-8 right-8 text-4xl text-[#c0392b]/[0.04] select-none">♥</span>
      <span className="absolute bottom-8 left-8 text-4xl text-[#c0392b]/[0.04] select-none">♦</span>
      <span className="absolute bottom-8 right-8 text-4xl text-[#c9a84c]/[0.04] select-none">♣</span>
    </main>
  );
}
