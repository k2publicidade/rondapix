'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.register(form);
      login(res.accessToken, res.user);
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center felt-table relative overflow-hidden p-4">
      {/* Vinheta radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,92,58,0.15)_0%,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Naipes nos cantos */}
      <span className="absolute top-6 left-6 text-5xl text-[#c9a84c]/[0.05] select-none pointer-events-none">♠</span>
      <span className="absolute top-6 right-6 text-5xl text-[#c0392b]/[0.05] select-none pointer-events-none">♥</span>
      <span className="absolute bottom-6 left-6 text-5xl text-[#c0392b]/[0.05] select-none pointer-events-none">♦</span>
      <span className="absolute bottom-6 right-6 text-5xl text-[#c9a84c]/[0.05] select-none pointer-events-none">♣</span>

      <div className="w-full max-w-sm relative z-10 slide-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-black tracking-tight mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <span className="text-[#c9a84c] drop-shadow-[0_0_20px_rgba(201,168,76,0.25)]">🃏 Ronda</span>
            <span className="text-[#1a5c3a]"> Pix</span>
          </h1>
          <p
            className="text-[#c9a84c]/50 text-xs tracking-[0.25em] uppercase"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Crie sua conta e ganhe 1.000 moedas
          </p>
        </div>

        {/* Card de registro */}
        <div className="relative rounded-2xl p-6 border-gold-gradient" style={{ background: 'linear-gradient(145deg, rgba(14,51,34,0.9), rgba(10,15,13,0.95))' }}>
          {/* Brilho sutil no topo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent" />

          <h2
            className="text-xl font-bold text-[#e0dcc8] mb-6 text-center"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Criar Conta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-premium"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                Username{' '}
                <span className="text-[#e0dcc8]/25 font-normal normal-case tracking-normal">(letras, números, _)</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_]+$"
                className="input-premium"
                placeholder="jogador_pro"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                Senha{' '}
                <span className="text-[#e0dcc8]/25 font-normal normal-case tracking-normal">(mín. 8 caracteres)</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={8}
                className="input-premium"
                placeholder="********"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#c0392b]/10 border border-[#c0392b]/20 rounded-lg px-3 py-2.5">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-casino-gold text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0a0f0d]/30 border-t-[#0a0f0d] rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c9a84c]/10" />
            <span className="text-[#c9a84c]/20 text-xs">♠ ♥ ♦ ♣</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c9a84c]/10" />
          </div>

          <p className="text-center text-sm text-[#e0dcc8]/40">
            Já tem conta?{' '}
            <Link href="/login" className="text-[#c9a84c] hover:text-[#e0c76a] transition font-semibold">
              Entrar
            </Link>
          </p>
        </div>

        {/* Footer sutil */}
        <p className="text-center text-[10px] text-[#c9a84c]/15 mt-6 tracking-widest uppercase">
          Aposte com responsabilidade
        </p>
      </div>
    </div>
  );
}
