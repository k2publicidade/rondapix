'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';

interface RoomItem {
  id: string;
  name: string;
  code: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
}

export default function LobbyPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; visibility: 'PUBLIC' | 'PRIVATE'; minBet: number; maxBet: number }>({ name: '', visibility: 'PUBLIC', minBet: 100, maxBet: 10000 });
  const [addBotOnCreate, setAddBotOnCreate] = useState(false);
  const [error, setError] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      const data = await api.rooms.list();
      setRooms(data);
    } catch {
      // ignora erros silenciosos no polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('ronda_token') : null;
    if (!isAuthenticated && !storedToken) { router.push('/login'); return; }
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, router, loadRooms]);

  async function handleJoinCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const room = await api.rooms.getByCode(joinCode.trim().toUpperCase());
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Sala não encontrada');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const room = await api.rooms.create(createForm);
      if (addBotOnCreate) {
        try {
          await api.rooms.addBot(room.id);
        } catch {
          // Bot addition is best-effort, don't block room creation
        }
      }
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar sala');
      setCreating(false);
    }
  }

  const statusLabel: Record<string, string> = {
    WAITING: 'Aguardando',
    IN_PROGRESS: 'Em jogo',
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      {/* ═══ HEADER PREMIUM ═══ */}
      <header className="relative border-b border-[#c9a84c]/10" style={{ background: 'linear-gradient(180deg, rgba(14,51,34,0.6), rgba(10,15,13,0.95))' }}>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <span className="text-[#c9a84c]">🃏 Ronda</span>
            <span className="text-[#1a5c3a]"> Pix</span>
          </h1>

          <div className="flex items-center gap-4">
            {/* Saldo como chip */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-[#e0dcc8]">{user?.username}</p>
              </div>
              <div className="chip count-animate">
                💰 {user?.balance?.toLocaleString('pt-BR')}
              </div>
            </div>

            <button
              onClick={logout}
              className="text-xs text-[#e0dcc8]/30 hover:text-[#c0392b] transition uppercase tracking-wider"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6 mt-2">
        {/* ═══ AÇÕES RÁPIDAS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 slide-in-up">
          {/* Entrar por código */}
          <div className="rounded-xl p-5 border border-[#c9a84c]/10" style={{ background: 'linear-gradient(145deg, rgba(14,51,34,0.4), rgba(10,15,13,0.6))' }}>
            <h3
              className="font-bold text-[#e0dcc8] mb-3 text-sm uppercase tracking-wider flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <span className="text-[#c9a84c]">🎫</span> Entrar por código
            </h3>
            <form onSubmit={handleJoinCode} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="input-premium flex-1 font-mono uppercase tracking-[0.3em] text-center text-lg"
              />
              <button
                type="submit"
                className="btn-casino-green px-5 py-3 text-sm whitespace-nowrap"
              >
                Entrar
              </button>
            </form>
          </div>

          {/* Criar sala */}
          <div className="rounded-xl p-5 border border-[#c9a84c]/10" style={{ background: 'linear-gradient(145deg, rgba(14,51,34,0.4), rgba(10,15,13,0.6))' }}>
            <h3
              className="font-bold text-[#e0dcc8] mb-3 text-sm uppercase tracking-wider flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <span className="text-[#c9a84c]">✨</span> Nova mesa
            </h3>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full btn-casino-gold py-4 text-base font-bold tracking-wide glow-gold"
            >
              CRIAR SALA
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#c0392b]/10 border border-[#c0392b]/20 rounded-lg px-4 py-3 slide-in-up">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ═══ LISTA DE SALAS ═══ */}
        <div className="slide-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold text-[#e0dcc8] flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <span className="text-[#1a5c3a]">♠</span>
              Mesas Abertas
              {!loading && (
                <span className="text-[#c9a84c]/40 font-normal text-sm ml-1">({rooms.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-[#e0dcc8]/20 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c3a] animate-pulse" />
              Ao vivo
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="flex justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
              <p className="text-[#e0dcc8]/30 text-sm">Carregando mesas...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-[#c9a84c]/10" style={{ background: 'rgba(14,51,34,0.15)' }}>
              {/* Cartas dançando */}
              <div className="flex justify-center gap-3 mb-6">
                <span className="dance-card text-4xl opacity-20 inline-block">🂡</span>
                <span className="dance-card text-4xl opacity-20 inline-block">🂱</span>
                <span className="dance-card text-4xl opacity-20 inline-block">🃁</span>
                <span className="dance-card text-4xl opacity-20 inline-block">🃑</span>
              </div>
              <p className="text-[#e0dcc8]/30 text-sm mb-1">Nenhuma mesa disponível</p>
              <p className="text-[#c9a84c]/30 text-xs">Crie a primeira e chame os parceiros!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room, idx) => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className={`w-full rounded-xl p-4 text-left transition-all duration-300 group border border-[#c9a84c]/5 hover:border-[#c9a84c]/30 slide-in-up stagger-${Math.min(idx + 1, 8)}`}
                  style={{ background: 'linear-gradient(145deg, rgba(14,51,34,0.3), rgba(10,15,13,0.5))' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Ícone de mesa */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(26,92,58,0.3)', border: '1px solid rgba(26,92,58,0.2)' }}>
                        🃏
                      </div>
                      <div>
                        <p className="font-semibold text-[#e0dcc8] group-hover:text-[#c9a84c] transition text-sm">
                          {room.name}
                        </p>
                        <p className="text-[10px] text-[#c9a84c]/30 font-mono tracking-widest mt-0.5">
                          {room.code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Jogadores */}
                      <div className="text-center hidden sm:block">
                        <div className="flex items-center gap-1 text-[#e0dcc8]/50 text-xs">
                          <span>👥</span>
                          <span>{room.currentPlayers}/{room.maxPlayers}</span>
                        </div>
                      </div>

                      {/* Apostas */}
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-[#c9a84c]/60 font-mono">
                          💰 {room.minBet.toLocaleString('pt-BR')}–{room.maxBet.toLocaleString('pt-BR')}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="text-right min-w-[90px]">
                        {room.status === 'WAITING' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#237a4e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#237a4e] animate-pulse" />
                            {statusLabel[room.status]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c0392b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />
                            {statusLabel[room.status] ?? room.status}
                          </span>
                        )}
                      </div>

                      {/* Seta */}
                      <span className="text-[#c9a84c]/20 group-hover:text-[#c9a84c]/60 group-hover:translate-x-1 transition-all text-sm">
                        →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═══ MODAL CRIAR SALA ═══ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-in">
          <div
            className="relative rounded-2xl p-6 w-full max-w-sm border-gold-gradient slide-in-up"
            style={{ background: 'linear-gradient(145deg, rgba(14,51,34,0.95), rgba(10,15,13,0.98))' }}
          >
            {/* Brilho no topo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent" />

            <h3
              className="text-xl font-bold text-[#e0dcc8] mb-5 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              🃏 Criar Nova Mesa
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                  Nome da sala
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  minLength={3}
                  maxLength={40}
                  className="input-premium"
                  placeholder="Mesa do Zé"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                    Aposta mín.
                  </label>
                  <input
                    type="number"
                    value={createForm.minBet}
                    onChange={(e) => setCreateForm((f) => ({ ...f, minBet: Number(e.target.value) }))}
                    min={10}
                    className="input-premium text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                    Aposta máx.
                  </label>
                  <input
                    type="number"
                    value={createForm.maxBet}
                    onChange={(e) => setCreateForm((f) => ({ ...f, maxBet: Number(e.target.value) }))}
                    min={10}
                    className="input-premium text-center font-mono"
                  />
                </div>
              </div>

              {/* Toggle Jogar contra Bot */}
              <div
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all"
                style={{
                  background: addBotOnCreate ? 'rgba(201,168,76,0.1)' : 'rgba(14,51,34,0.3)',
                  borderColor: addBotOnCreate ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)',
                }}
                onClick={() => setAddBotOnCreate(!addBotOnCreate)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-[#e0dcc8]">Jogar contra Bot</p>
                    <p className="text-[10px] text-[#e0dcc8]/40">Bot entra automaticamente na sala</p>
                  </div>
                </div>
                <div
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{
                    background: addBotOnCreate ? 'linear-gradient(135deg, #c9a84c, #a8893c)' : 'rgba(224,220,200,0.1)',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: addBotOnCreate ? '22px' : '2px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9a84c]/70 mb-1.5 uppercase tracking-wider">
                  Visibilidade
                </label>
                <select
                  value={createForm.visibility}
                  onChange={(e) => setCreateForm((f) => ({ ...f, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' }))}
                  className="input-premium cursor-pointer"
                >
                  <option value="PUBLIC">🌐 Pública</option>
                  <option value="PRIVATE">🔒 Privada</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-lg border border-[#c9a84c]/15 text-[#e0dcc8]/50 hover:text-[#e0dcc8] hover:border-[#c9a84c]/30 transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 btn-casino-green text-sm"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#e0dcc8]/30 border-t-[#e0dcc8] rounded-full animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    'Criar Mesa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
