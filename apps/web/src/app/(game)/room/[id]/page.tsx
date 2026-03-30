'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth.store';
import { useGameStore } from '../../../../store/game.store';
import { getSocket } from '../../../../lib/socket-client';
import { api } from '../../../../lib/api-client';
import { VictoryOverlay, DefeatOverlay, DeckCutAnimation, ShufflingTransition } from './animations';

// ── Card rendering ───────────────────────────────────────────────
const SUIT_SYMBOL: Record<string, string> = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
const SUIT_CLASS: Record<string, string> = {
  spades: 'text-zinc-800',
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-zinc-800',
};

function parseCardId(id: string): { rank: string; suit: string } {
  if (!id || !id.includes('-')) return { rank: '?', suit: '' };
  const idx = id.indexOf('-');
  return { rank: id.slice(0, idx), suit: id.slice(idx + 1) };
}

function PlayingCard({
  cardId,
  size = 'md',
  highlight = false,
  highlightColor = '',
  badge = '',
  animated = false,
  animDelay = 0,
}: {
  cardId: string;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  highlightColor?: string;
  badge?: string;
  animated?: boolean;
  animDelay?: number;
}) {
  const { rank, suit } = parseCardId(cardId);
  const symbol = SUIT_SYMBOL[suit] ?? '\u2663';
  const color = SUIT_CLASS[suit] ?? 'text-zinc-800';

  const dims = {
    sm: { w: 54, h: 74, rank: 'text-[11px]', suit: 'text-[10px]', center: 'text-xl', mt: '-mt-0.5' },
    md: { w: 68, h: 94, rank: 'text-sm', suit: 'text-xs', center: 'text-3xl', mt: '-mt-0.5' },
    lg: { w: 84, h: 116, rank: 'text-base', suit: 'text-sm', center: 'text-4xl', mt: '-mt-1' },
  }[size];

  return (
    <div className="relative inline-block" style={animated ? { animationDelay: `${animDelay}ms` } : undefined}>
      <div
        className={`card-reveal relative overflow-hidden select-none transition-all duration-300
          ${highlight ? `${highlightColor || 'ring-amber-400'} ring-2 shadow-lg scale-110 z-10 card-target-hit` : 'shadow-md hover:shadow-lg hover:-translate-y-0.5'}
          ${animated ? 'card-reveal' : ''}`}
        style={{
          width: dims.w,
          height: dims.h,
          background: 'linear-gradient(145deg, #ffffff 0%, #f5f2ea 40%, #ede8dc 100%)',
          border: highlight ? undefined : '1px solid rgba(0,0,0,0.12)',
          borderRadius: size === 'sm' ? 6 : 8,
        }}
      >
        {animated && (
          <div className="card-reveal-inner" style={{ animationDelay: `${animDelay}ms` }}>
            {/* card inner content rendered below instead */}
          </div>
        )}
        {/* Top-left */}
        <div className={`absolute top-[3px] left-[4px] leading-none font-black ${color}`}>
          <div className={dims.rank}>{rank}</div>
          <div className={`${dims.suit} ${dims.mt}`}>{symbol}</div>
        </div>
        {/* Center suit large */}
        <div className={`absolute inset-0 flex items-center justify-center ${color}`}>
          <span className={dims.center} style={{ opacity: 0.2 }}>{symbol}</span>
        </div>
        {/* Center rank */}
        <div className={`absolute inset-0 flex items-center justify-center ${color}`}>
          <span className={size === 'sm' ? 'text-lg font-black' : size === 'md' ? 'text-2xl font-black' : 'text-3xl font-black'} style={{ opacity: 0.9 }}>
            {rank}
          </span>
        </div>
        {/* Bottom-right */}
        <div className={`absolute bottom-[3px] right-[4px] leading-none font-black ${color} rotate-180`}>
          <div className={dims.rank}>{rank}</div>
          <div className={`${dims.suit} ${dims.mt}`}>{symbol}</div>
        </div>
        {/* Shine overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.02) 100%)' }} />
      </div>
      {badge && (
        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black text-white z-20 pop-in
          ${badge === 'A' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-orange-500 shadow-orange-500/50'} shadow-lg`}>
          {badge}
        </div>
      )}
    </div>
  );
}

// ── Card back (for idle decoration) ──
function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg overflow-hidden shadow-lg ${className}`}
      style={{ width: 52, height: 72,
        background: 'repeating-conic-gradient(#1a3a2a 0% 25%, #0d1f16 0% 50%) 0 0 / 8px 8px',
        border: '2px solid rgba(201,168,76,0.3)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)',
      }}>
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)' }}>
        <span className="text-amber-500/20 text-lg font-black">R</span>
      </div>
    </div>
  );
}

// ── Countdown timer ──
function BettingTimer({ endsAt }: { endsAt: Date }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const pct = Math.min(100, (remaining / 30) * 100);
  const urgent = remaining <= 5;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-amber-200/40">Tempo</span>
        <span className={`font-mono text-xl font-black tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
          {remaining}<span className="text-xs ml-0.5 opacity-50">s</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-red-500 shadow-red-500/30 shadow-sm' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main game page ──
export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const store = useGameStore();
  const {
    room, players, roundState, revealedCards,
    chatMessages, lastSettlement, bettingEndsAt,
    setRoom, setMembers, setPlayers, addPlayer, removePlayer,
    setRoundState, addRevealedCard, clearRevealedCards,
    addChatMessage, setSettlement, setBettingEndsAt,
  } = store;

  const [betSide, setBetSide] = useState<'A' | 'B' | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [chatInput, setChatInput] = useState('');
  const [betError, setBetError] = useState('');
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [connected, setConnected] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [botToast, setBotToast] = useState('');
  const [showVictory, setShowVictory] = useState<{ amount: number; side: string } | null>(null);
  const [showDefeat, setShowDefeat] = useState<{ amount: number; side: string } | null>(null);
  const [showDeckCut, setShowDeckCut] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Buffers: segura TODOS os eventos de round durante animações
  const pendingEventsRef = useRef<Array<{ event: string; data: any }>>([]);
  const pendingCardsRef = useRef<any[]>([]);
  const deckCutActiveRef = useRef(false);
  const shuffleActiveRef = useRef(false);
  // Referências para handlers (usados no replay)
  const handlersRef = useRef<Record<string, (d: any) => void>>({});

  // Quando deck cut termina → replay todos os eventos pendentes em ordem
  const onDeckCutDone = useCallback(() => {
    deckCutActiveRef.current = false;
    setShowDeckCut(false);
    // Replay eventos acumulados durante a animação
    const events = pendingEventsRef.current;
    pendingEventsRef.current = [];
    for (const { event, data } of events) {
      handlersRef.current[event]?.(data);
    }
  }, []);

  // Quando shuffle termina → aplica cards pendentes em sequência
  const onShuffleDone = useCallback(() => {
    shuffleActiveRef.current = false;
    setShowShuffle(false);
    const pending = pendingCardsRef.current;
    pendingCardsRef.current = [];
    pending.forEach((d, i) => {
      setTimeout(() => addRevealedCard(d), i * 80);
    });
  }, []); // eslint-disable-line

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ── Socket ──
  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('ronda_token') : null;
    if (!isAuthenticated && !storedToken) { router.push('/login'); return; }
    const socket = getSocket();
    if (!socket.connected && storedToken) { socket.auth = { token: storedToken }; socket.connect(); }
    setConnected(socket.connected);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:joined', (d: any) => {
      setRoom(d.room); setMembers(d.members); setPlayers(d.players);
      if (d.roundState) { setRoundState(d.roundState); }
      // NÃO ativar DeckCut aqui — animação só acontece ao iniciar rodada
    });
    socket.on('player:seated', (d) => {
      addPlayer(d.player);
      setBotToast(`${d.player?.username ?? 'Jogador'} entrou na sala`);
      setTimeout(() => setBotToast(''), 3000);
    });
    socket.on('player:left', (d) => removePlayer(d.playerId));

    // Entrar na sala DEPOIS de registrar todos os listeners
    socket.emit('room:join', { roomId }, (r: any) => { if (!r?.success) router.push('/lobby'); });

    // Handlers reais de round — serão chamados diretamente OU via replay após deck cut
    const roundHandlers: Record<string, (d: any) => void> = {
      'round:stateSync': (d) => setRoundState(d),
      'round:pairRevealed': () => { clearRevealedCards(); setHasPlacedBet(false); setSettlement(null); setBettingEndsAt(null); setBetSide(null); },
      'round:bettingOpened': (d) => setBettingEndsAt(new Date(d.endsAt)),
      'round:bettingLocked': () => { setBettingEndsAt(null); shuffleActiveRef.current = true; setShowShuffle(true); },
      'round:cardRevealed': (d) => {
        const cardData = { card: d.card, index: d.index, isTarget: d.isTargetCard, targetSide: d.targetSide };
        if (shuffleActiveRef.current) { pendingCardsRef.current.push(cardData); }
        else { addRevealedCard(cardData); }
      },
      'round:settled': (d) => {
        setSettlement(d.settlement);
        const myPayout = d.settlement.payouts?.find((p: any) => p.playerId === useAuthStore.getState().user?.id);
        if (myPayout) {
          if (myPayout.won) { setShowVictory({ amount: myPayout.payout, side: d.settlement.winnerSide }); }
          else { setShowDefeat({ amount: myPayout.originalBet, side: d.settlement.winnerSide }); }
        }
        setTimeout(() => setRoundState(null), 6000);
      },
      'round:statusChanged': (d) => { if (d.status === 'WAITING_FOR_PLAYERS' || d.status === 'ROUND_CANCELLED') { clearRevealedCards(); setHasPlacedBet(false); setSettlement(null); setBettingEndsAt(null); setRoundState(null); } },
    };
    handlersRef.current = roundHandlers;

    // Wrapper: bufferiza durante deck cut, executa diretamente caso contrário
    for (const [event, handler] of Object.entries(roundHandlers)) {
      socket.on(event as any, (d: any) => {
        if (deckCutActiveRef.current) { pendingEventsRef.current.push({ event, data: d }); }
        else { handler(d); }
      });
    }
    socket.on('chat:message', addChatMessage);
    socket.on('wallet:updated', (d) => useAuthStore.getState().updateBalance(d.balance));
    return () => {
      socket.emit('room:leave', () => {});
      ['connect','disconnect','room:joined','player:seated','player:left','round:stateSync','round:pairRevealed','round:bettingOpened','round:bettingLocked','round:cardRevealed','round:settled','round:statusChanged','chat:message','wallet:updated'].forEach(e => socket.off(e as any));
    };
  }, [isAuthenticated, roomId]); // eslint-disable-line

  // ── Handlers ──
  function handlePlaceBet() {
    if (!betSide || hasPlacedBet || !roundState) return;
    setBetError('');
    getSocket().emit('round:placeBet', { roundId: roundState.id, side: betSide, amount: betAmount, idempotencyKey: `${user?.id}-${roundState.id}-${crypto.randomUUID()}` }, (r) => {
      if (r.success) setHasPlacedBet(true); else setBetError(r.error.message);
    });
  }
  function handleChooseSide(side: 'A' | 'B') { if (roundState) getSocket().emit('round:chooseSide', { roundId: roundState.id, side }, () => {}); }
  function handleStartRound() {
    // Limpa estado da rodada anterior para não mostrar cartas velhas
    setRoundState(null);
    clearRevealedCards();
    setSettlement(null);
    deckCutActiveRef.current = true;
    pendingEventsRef.current = [];
    setShowDeckCut(true);
    getSocket().emit('round:start', (r) => {
      if (!r?.success) { console.error('Erro:', r?.error?.message); deckCutActiveRef.current = false; setShowDeckCut(false); }
    });
  }
  function handleSendChat(e: React.FormEvent) { e.preventDefault(); if (!chatInput.trim() || !roomId) return; getSocket().emit('chat:send', { roomId, content: chatInput.trim() }, () => {}); setChatInput(''); }
  async function handleAddBot() {
    if (!roomId || addingBot) return;
    setAddingBot(true);
    try {
      const result = await api.rooms.addBot(roomId);
      setBotToast((result.username ?? 'Bot') + ' entrou!');
    } catch (err) {
      setBotToast('Erro ao adicionar bot');
    } finally {
      setAddingBot(false);
      setTimeout(() => setBotToast(''), 3500);
    }
  }
  const isCutter = roundState?.cutterId === user?.id;
  const pair = roundState?.pair;
  const status = roundState?.status;
  const isHost = room?.hostId === user?.id;
  const isRunning = status === 'RUNNING_DECK';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#080c0a' }}>
      {/* ═══ HEADER ═══ */}
      <header className="shrink-0 px-5 py-2.5 flex items-center justify-between border-b border-amber-900/15"
        style={{ background: 'linear-gradient(180deg, rgba(17,26,20,0.98) 0%, rgba(10,15,13,0.98) 100%)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/lobby')} className="text-amber-200/30 hover:text-amber-200 text-sm transition-colors duration-200">&larr;</button>
          <div className="w-px h-4 bg-amber-900/20" />
          <span className="font-semibold text-amber-100/80 text-sm tracking-wide">{room?.name ?? '...'}</span>
          {room?.code && (
            <span className="text-[9px] font-mono bg-amber-950/40 text-amber-400/40 px-1.5 py-0.5 rounded border border-amber-900/15 tracking-wider">{room.code}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isHost && players.length < 4 && (
            <button onClick={handleAddBot} disabled={addingBot}
              className="px-2.5 py-1 text-[10px] font-bold rounded-md border border-amber-700/25 bg-amber-900/15 text-amber-400/70 hover:bg-amber-800/25 hover:text-amber-300 transition-all disabled:opacity-30">
              {addingBot ? '...' : '+ Bot'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-red-400'}`} />
            <span className="text-[11px] text-white/30">{user?.username}</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-900/15">
            <span className="text-xs font-black text-amber-400 font-mono tabular-nums">{user?.balance?.toLocaleString('pt-BR')}</span>
            <span className="text-[10px] text-amber-600 font-bold">R$</span>
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Game Table ── */}
        <div className="flex-1 felt-table flex flex-col items-center overflow-y-auto relative">
          {/* Streak decoration */}
          {isRunning && <div className="absolute inset-0 streak-line pointer-events-none" />}

          <div className="flex flex-col items-center flex-1 py-6 px-4 w-full max-w-3xl mx-auto">

            {/* ─── IDLE STATE ─── */}
            {!roundState && !lastSettlement && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 slide-in-up">
                <div className="flex gap-3">
                  {[0, 1, 2].map(i => <CardBack key={i} className={`dance-card float-idle`} />)}
                </div>
                <div className="text-center space-y-3">
                  <p className="text-amber-200/40 text-sm">
                    {isHost ? 'Pronto para iniciar' : 'Aguardando o host...'}
                  </p>
                  {isHost && (
                    <button onClick={handleStartRound}
                      className="btn-casino-gold text-sm px-10 py-3 rounded-xl glow-gold">
                      Iniciar Rodada
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── PAIR DISPLAY ─── */}
            {pair && !showDeckCut && (
              <div className="mb-6 slide-in-up">
                <p className="text-center text-[9px] uppercase tracking-[0.25em] text-amber-400/30 mb-4 font-bold">Par da Rodada</p>
                <div className="flex items-end gap-8">
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">Lado A</span>
                    <PlayingCard cardId={pair.sideA.id} size="lg"
                      highlight={roundState?.winnerSide === 'A'} highlightColor="ring-blue-400 shadow-blue-400/30" />
                  </div>
                  <div className="flex flex-col items-center gap-2 pb-8">
                    <span className="text-2xl font-black text-white/[0.06]">VS</span>
                    {roundState?.cutterSide && (
                      <div className="text-[9px] text-amber-300/40 bg-amber-900/15 px-2 py-0.5 rounded-full border border-amber-900/15 pop-in">
                        corte {roundState.cutterSide}
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400/70">Lado B</span>
                    <PlayingCard cardId={pair.sideB.id} size="lg"
                      highlight={roundState?.winnerSide === 'B'} highlightColor="ring-orange-400 shadow-orange-400/30" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── REVEALED CARDS ─── */}
            {revealedCards.length > 0 && !showDeckCut && (
              <div className="w-full mb-5">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-900/20" />
                  <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold px-2">
                    {revealedCards.length} / 36
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-900/20" />
                </div>
                <div className="flex gap-1.5 flex-wrap justify-center">
                  {revealedCards.map((rc, i) => (
                    <div key={i} className="card-reveal" style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="card-reveal-inner" style={{ animationDelay: `${i * 30}ms` }}>
                        <PlayingCard
                          cardId={rc.card?.id ?? '?-?'}
                          size="sm"
                          highlight={rc.isTarget}
                          highlightColor={rc.targetSide === 'A' ? 'ring-blue-400 shadow-blue-400/40' : 'ring-orange-400 shadow-orange-400/40'}
                          badge={rc.isTarget ? (rc.targetSide ?? '') : ''}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── STATUS / ACTIONS ─── */}
            {!showDeckCut && <div className="flex flex-col items-center gap-4 w-full max-w-sm game-transition">
              {/* Status text */}
              <div className="text-center text-sm py-1 game-transition">
                {status === 'PAIR_REVEALED' && isCutter && <span className="text-amber-300 font-semibold animate-pulse">Escolha seu lado</span>}
                {status === 'PAIR_REVEALED' && !isCutter && <span className="text-white/30">Aguardando cortador...</span>}
                {status === 'BETTING_OPEN' && !hasPlacedBet && <span className="text-amber-300">Faca sua aposta</span>}
                {status === 'BETTING_OPEN' && hasPlacedBet && <span className="text-emerald-400 pop-in">Aposta confirmada</span>}
                {status === 'BETTING_LOCKED' && <span className="text-amber-200/40 animate-pulse">Embaralhando...</span>}
                {status === 'SHUFFLING' && <span className="text-amber-200/40 animate-pulse">Embaralhando...</span>}
                {status === 'RUNNING_DECK' && <span className="text-amber-300 font-semibold animate-pulse">Virando cartas...</span>}
                {status === 'ROUND_SETTLED' && <span className="shimmer-gold font-black text-lg">Rodada encerrada!</span>}
                {status === 'ROUND_CANCELLED' && <span className="text-red-400/60 text-xs">Rodada cancelada</span>}
              </div>

              {/* Cutter choice */}
              {status === 'PAIR_REVEALED' && isCutter && pair && (
                <div className="flex gap-3 bounce-in">
                  <button onClick={() => handleChooseSide('A')}
                    className="group px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 border-2 border-blue-500/30 bg-blue-950/30 text-blue-300 hover:bg-blue-600 hover:border-blue-400 hover:text-white hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0">
                    <span className="group-hover:scale-110 inline-block transition-transform">Lado A</span>
                  </button>
                  <button onClick={() => handleChooseSide('B')}
                    className="group px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 border-2 border-orange-500/30 bg-orange-950/30 text-orange-300 hover:bg-orange-600 hover:border-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-600/20 hover:-translate-y-0.5 active:translate-y-0">
                    <span className="group-hover:scale-110 inline-block transition-transform">Lado B</span>
                  </button>
                </div>
              )}

              {/* Start round after settlement */}
              {!roundState && lastSettlement && isHost && (
                <button onClick={handleStartRound} className="btn-casino-gold text-sm px-8 py-2.5 rounded-xl glow-gold pop-in">
                  Nova Rodada
                </button>
              )}

              {/* ─── BETTING PANEL ─── */}
              {status === 'BETTING_OPEN' && !hasPlacedBet && pair && (
                <div className="w-full rounded-2xl p-5 slide-in-up border border-amber-900/15 backdrop-blur-sm"
                  style={{ background: 'linear-gradient(160deg, rgba(12,20,15,0.97) 0%, rgba(8,12,10,0.99) 100%)' }}>
                  {bettingEndsAt && <div className="mb-5"><BettingTimer endsAt={bettingEndsAt} /></div>}

                  {/* Side selection */}
                  <div className="flex gap-2.5 mb-5">
                    <button onClick={() => setBetSide('A')}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 border-2 ${
                        betSide === 'A'
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20 -translate-y-0.5'
                          : 'bg-transparent border-blue-900/30 text-blue-400/40 hover:border-blue-600/50 hover:text-blue-300'}`}>
                      Lado A
                    </button>
                    <button onClick={() => setBetSide('B')}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 border-2 ${
                        betSide === 'B'
                          ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-600/20 -translate-y-0.5'
                          : 'bg-transparent border-orange-900/30 text-orange-400/40 hover:border-orange-600/50 hover:text-orange-300'}`}>
                      Lado B
                    </button>
                  </div>

                  {/* Chip amounts */}
                  <div className="mb-4">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-amber-200/25 mb-2 block font-bold">Valor</span>
                    <div className="flex gap-2 mb-3">
                      {[50, 100, 250, 500, 1000].map((v, i) => (
                        <button key={v} onClick={() => setBetAmount(v)}
                          className={`flex-1 py-2 text-xs rounded-lg font-mono font-bold transition-all duration-200 ${
                            betAmount === v
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 -translate-y-0.5 chip-bounce'
                              : 'bg-white/[0.03] text-amber-200/35 hover:bg-white/[0.06] border border-white/[0.04]'}`}
                          style={betAmount === v ? { animationDelay: `${i * 50}ms` } : undefined}>
                          {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                    <input type="number" value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      min={room?.minBet ?? 10}
                      max={Math.min(room?.maxBet ?? 10000, user?.balance ?? 0)}
                      className="w-full px-3 py-2.5 bg-black/30 border border-amber-900/15 rounded-lg text-amber-100 font-mono text-sm focus:outline-none focus:border-amber-600/40 focus:ring-1 focus:ring-amber-600/15 transition-all"
                    />
                  </div>

                  {betError && <p className="text-red-400 text-xs mb-2 pop-in">{betError}</p>}

                  <button onClick={handlePlaceBet} disabled={!betSide}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed
                      bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0">
                    Apostar {betAmount.toLocaleString('pt-BR')} R$
                  </button>
                </div>
              )}

              {/* ─── SETTLEMENT ─── */}
              {lastSettlement && (
                <div className="w-full rounded-2xl p-6 text-center bounce-in border border-amber-500/15 relative overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, rgba(12,20,15,0.97) 0%, rgba(8,12,10,0.99) 100%)' }}>
                  <div className="confetti-burst" />
                  <p className="shimmer-gold text-xl font-black mb-1">
                    Lado {lastSettlement.winnerSide} venceu!
                  </p>
                  <p className="text-[11px] text-white/30 mb-4 font-mono">
                    {lastSettlement.winnerCard?.id ?? '?'}
                  </p>
                  {lastSettlement.payouts
                    .filter((p) => p.playerId === user?.id)
                    .map((p) => (
                      <div key={p.playerId} className={`text-2xl font-black pop-in ${p.won ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p.won ? '+' : '-'}{(p.won ? p.payout : p.originalBet).toLocaleString('pt-BR')} R$
                      </div>
                    ))}
                </div>
              )}
            </div>}

            {/* ─── PLAYERS ─── */}
            <div className="mt-auto pt-6 w-full">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {players.map((p) => {
                  const isMe = p.id === user?.id;
                  const isCut = p.id === roundState?.cutterId;
                  return (
                    <div key={p.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 ${
                        isCut
                          ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300 shadow-sm shadow-amber-500/5'
                          : 'bg-white/[0.02] border border-white/[0.05] text-white/35'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isMe ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-white/15'}`} />
                      {p.username}
                      {isCut && <span className="text-amber-400 ml-0.5">&#9986;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CHAT ═══ */}
        <div className="w-60 flex flex-col border-l border-white/[0.03]" style={{ background: 'rgba(8,12,10,0.95)' }}>
          <div className="px-3 py-2.5 border-b border-white/[0.03]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/20 font-bold">Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {chatMessages.length === 0 && <p className="text-[10px] text-white/10 text-center mt-8">Sem mensagens</p>}
            {chatMessages.map((msg, i) => (
              <div key={msg.id ?? i} className="fade-in">
                <span className={`text-[10px] font-bold ${msg.playerId === user?.id ? 'text-amber-400/80' : 'text-emerald-500/50'}`}>
                  {msg.username}
                </span>
                <span className="text-[10px] text-white/30 ml-1">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="p-2 border-t border-white/[0.03]">
            <div className="flex gap-1.5">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mensagem..." maxLength={200}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-[10px] bg-white/[0.02] border border-white/[0.04] rounded-lg text-white/50 placeholder:text-white/10 focus:outline-none focus:border-amber-900/30 transition-colors"
              />
              <button type="submit"
                className="px-2.5 py-1.5 text-[10px] font-bold bg-amber-900/20 text-amber-400/40 rounded-lg hover:bg-amber-800/30 hover:text-amber-300/60 transition-all">
                &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ═══ ANIMATION OVERLAYS ═══ */}
      {showVictory && (
        <VictoryOverlay
          amount={showVictory.amount}
          winnerSide={showVictory.side}
          onDone={() => setShowVictory(null)}
        />
      )}
      {showDefeat && (
        <DefeatOverlay
          amount={showDefeat.amount}
          winnerSide={showDefeat.side}
          onDone={() => setShowDefeat(null)}
        />
      )}
      {showDeckCut && (
        <DeckCutAnimation onDone={onDeckCutDone} />
      )}
      {showShuffle && (
        <ShufflingTransition onDone={onShuffleDone} />
      )}

      {/* ═══ TOAST ═══ */}
      {botToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-xs font-semibold z-50 border border-amber-900/30 shadow-2xl pop-in"
          style={{ background: 'linear-gradient(135deg, rgba(14,51,34,0.98), rgba(10,15,13,0.99))', color: '#c9a84c' }}>
          {botToast}
        </div>
      )}
    </div>
  );
}
