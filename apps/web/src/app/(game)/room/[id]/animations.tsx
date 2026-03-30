'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   RONDA PIX — Sistema de Animacoes Profissional
   3D Transforms · Canvas Particles · Glass Morphism · Cinematico
   ═══════════════════════════════════════════════════════════════════ */

// ── Util: easing functions ──────────────────────────────────────
function easeOutExpo(t: number) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeOutBack(t: number) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// ── Util: lerp / clamp ──────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ── Gold / Theme colors ─────────────────────────────────────────
const GOLD = '#c9a84c';
const GOLD_LIGHT = '#e8d48b';
const GOLD_DARK = '#8a6d2b';
const GREEN = '#1a5c3a';
const GREEN_LIGHT = '#52b788';
const DEEP_BLACK = '#080c0a';

/* ═══════════════════════════════════════════════════════════════════
   CANVAS PARTICLE ENGINE — reutilizavel por todas as animacoes
   ═══════════════════════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotSpeed: number;
  shape: 'circle' | 'rect' | 'diamond' | 'star';
  gravity: number;
  life: number;
}

function createParticleCanvas(
  canvas: HTMLCanvasElement,
  config: {
    count: number;
    colors: string[];
    gravity?: number;
    spread?: number;
    speed?: number;
    originX?: number;
    originY?: number;
    shapes?: Particle['shape'][];
    sizeRange?: [number, number];
    decayRange?: [number, number];
    burst?: boolean;
  }
) {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const particles: Particle[] = [];
  const shapes = config.shapes ?? ['circle', 'rect', 'diamond'];
  const sizeRange = config.sizeRange ?? [3, 8];
  const decayRange = config.decayRange ?? [0.008, 0.02];

  for (let i = 0; i < config.count; i++) {
    const angle = config.burst
      ? (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.4
      : Math.random() * Math.PI * 2;
    const speed = (config.speed ?? 3) * (0.5 + Math.random() * 1.5);
    particles.push({
      x: config.originX ?? w / 2,
      y: config.originY ?? h / 2,
      vx: Math.cos(angle) * speed * (config.spread ?? 1),
      vy: Math.sin(angle) * speed * (config.spread ?? 1) - (config.burst ? 2 : 0),
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      color: config.colors[Math.floor(Math.random() * config.colors.length)] ?? GOLD,
      alpha: 0.9 + Math.random() * 0.1,
      decay: decayRange[0] + Math.random() * (decayRange[1] - decayRange[0]),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
      shape: shapes[Math.floor(Math.random() * shapes.length)] as Particle['shape'] ?? 'circle',
      gravity: config.gravity ?? 0.08,
      life: 1,
    });
  }

  let raf: number;
  let running = true;

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const aInner = a + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(aInner) * r * 0.4, cy + Math.sin(aInner) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.995;
      p.alpha -= p.decay;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      if (p.alpha <= 0) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      ctx.fillStyle = p.color;

      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'rect':
          ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case 'star':
          drawStar(ctx, 0, 0, p.size);
          break;
      }
      ctx.restore();
    }

    if (alive > 0) raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return () => { running = false; cancelAnimationFrame(raf); };
}

/* ═══════════════════════════════════════════════════════════════════
   3D CARD BACK — componente visual reutilizavel
   ═══════════════════════════════════════════════════════════════════ */
function Card3DBack({ style, scale = 1 }: { style?: React.CSSProperties; scale?: number }) {
  const w = 60 * scale;
  const h = 84 * scale;
  return (
    <div style={{
      width: w, height: h, borderRadius: 8 * scale, overflow: 'hidden',
      background: `linear-gradient(145deg, #1a3a2a 0%, #0d2418 50%, #0a1a12 100%)`,
      border: `1.5px solid rgba(201,168,76,0.25)`,
      boxShadow: `
        0 8px 32px rgba(0,0,0,0.6),
        0 2px 8px rgba(0,0,0,0.4),
        inset 0 1px 0 rgba(201,168,76,0.1),
        inset 0 -1px 0 rgba(0,0,0,0.3)
      `,
      flexShrink: 0,
      position: 'relative',
      ...style,
    }}>
      {/* Pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(201,168,76,0.03) 4px, rgba(201,168,76,0.03) 5px),
          repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(201,168,76,0.03) 4px, rgba(201,168,76,0.03) 5px)
        `,
      }} />
      {/* Inner border */}
      <div style={{
        position: 'absolute',
        inset: 4 * scale,
        border: `1px solid rgba(201,168,76,0.12)`,
        borderRadius: 4 * scale,
      }} />
      {/* Center emblem */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 60%)',
      }}>
        <div style={{
          width: 20 * scale, height: 20 * scale,
          borderRadius: '50%',
          border: `1px solid rgba(201,168,76,0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
        }}>
          <span style={{
            color: 'rgba(201,168,76,0.2)',
            fontSize: 11 * scale,
            fontWeight: 900,
            fontFamily: "'Playfair Display', serif",
          }}>R</span>
        </div>
      </div>
      {/* Top shine */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 40%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DECK CUT ANIMATION — 3D cinematico com perspectiva
   Duracao: 3.6s
   ═══════════════════════════════════════════════════════════════════ */
export function DeckCutAnimation({ onDone }: { onDone: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'enter' | 'shuffle' | 'cut' | 'exit'>('enter');

  useEffect(() => {
    // Phase transitions
    const t1 = setTimeout(() => setPhase('shuffle'), 300);
    const t2 = setTimeout(() => setPhase('cut'), 2000);
    const t3 = setTimeout(() => setPhase('exit'), 3000);
    timerRef.current = setTimeout(onDone, 3600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line

  // Spark particles during shuffle
  useEffect(() => {
    if (phase === 'shuffle' && canvasRef.current) {
      const cleanup = createParticleCanvas(canvasRef.current, {
        count: 30,
        colors: [GOLD, GOLD_LIGHT, GOLD_DARK, 'rgba(255,255,255,0.6)'],
        gravity: 0.02,
        spread: 0.8,
        speed: 1.5,
        shapes: ['circle', 'diamond', 'star'],
        sizeRange: [1.5, 4],
        decayRange: [0.005, 0.012],
        burst: false,
      });
      return cleanup;
    }
  }, [phase]);

  const isExiting = phase === 'exit';

  return (
    <div
      className="anim-overlay"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Ambient light rays */}
      <div className="anim-light-rays" />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
      />

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
        perspective: '1200px',
      }}>
        {/* 3D Deck stack with shuffle */}
        <div style={{
          position: 'relative',
          width: 200, height: 140,
          transformStyle: 'preserve-3d',
          transform: phase === 'enter'
            ? 'rotateX(25deg) rotateY(0deg) scale(0.8)'
            : phase === 'cut'
            ? 'rotateX(15deg) rotateY(0deg) scale(1)'
            : 'rotateX(20deg) rotateY(0deg) scale(0.95)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {/* Deck cards with 3D stacking */}
          {Array.from({ length: 8 }).map((_, i) => {
            const isShuffling = phase === 'shuffle';
            const isCutting = phase === 'cut';
            const half = i < 4;
            let tx = 0, ty = 0, rz = 0, tz = i * -2;

            if (isShuffling) {
              const offset = Math.sin((Date.now() / 200) + i * 0.8) * 15;
              tx = i % 2 === 0 ? -offset : offset;
              rz = i % 2 === 0 ? -3 : 3;
              ty = Math.abs(Math.sin((Date.now() / 300) + i)) * -8;
            }

            if (isCutting) {
              tx = half ? -40 : 40;
              ty = half ? -5 : 5;
              rz = half ? -2 : 2;
            }

            return (
              <div key={i} style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${tx}px) translateY(${ty}px) translateZ(${tz}px) rotateZ(${rz}deg)`,
                transition: isCutting
                  ? `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 40}ms`
                  : isShuffling
                  ? 'none'
                  : `transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${i * 60}ms`,
                animation: isShuffling ? `deckShuffle3D 0.6s ease-in-out infinite alternate ${i * 0.08}s` : 'none',
                filter: `brightness(${1 - i * 0.03})`,
              }}>
                <Card3DBack scale={0.9} />
              </div>
            );
          })}

          {/* Cut line glow */}
          {phase === 'cut' && (
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 2, height: 100,
              background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`,
              opacity: 0.4,
              animation: 'cutLineGlow 1s ease-in-out infinite alternate',
            }} />
          )}
        </div>

        {/* Title text */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <p className="anim-title-text" style={{
            opacity: phase === 'enter' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(15px)' : 'translateY(0)',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {phase === 'cut' ? 'Cortando o baralho' : 'Embaralhando'}
          </p>

          {/* Animated dots */}
          <div style={{
            display: 'flex', gap: 5, justifyContent: 'center', marginTop: 12,
            opacity: phase === 'enter' ? 0 : 0.7,
            transition: 'opacity 0.5s ease',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: GOLD,
                animation: `dotFloat 1.2s ease-in-out infinite ${i * 0.15}s`,
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Vignette */}
      <div className="anim-vignette" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHUFFLING TRANSITION — cards em 3D voando
   Duracao: 2.2s
   ═══════════════════════════════════════════════════════════════════ */
export function ShufflingTransition({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(false), 1700);
    const t2 = setTimeout(onDone, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line

  return (
    <div
      className="anim-overlay"
      style={{
        opacity: show ? 1 : 0,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(6,10,8,0.92)',
      }}
    >
      <div className="anim-light-rays" style={{ opacity: 0.3 }} />

      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
        perspective: '1000px',
      }}>
        {/* Cards fanning out in 3D */}
        <div style={{
          position: 'relative',
          width: 240, height: 120,
          transformStyle: 'preserve-3d',
          transform: 'rotateX(10deg)',
        }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i - 2.5) * 12;
            const yOff = Math.abs(i - 2.5) * 5;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: '50%', top: '50%',
                transform: `translate(-50%, -50%) rotateZ(${angle}deg) translateY(${yOff}px)`,
                animation: `cardFan3D 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.06}s both`,
                transformOrigin: 'center 200%',
              }}>
                <Card3DBack scale={0.8} />
              </div>
            );
          })}
        </div>

        {/* Horizontal light line */}
        <div style={{
          width: 180, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)`,
          animation: 'lineExpand 0.8s ease-out both',
        }} />

        <p className="anim-title-text" style={{ fontSize: 13, letterSpacing: '0.2em' }}>
          Revelando cartas
        </p>
      </div>

      <div className="anim-vignette" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VICTORY OVERLAY — explosao dourada cinematica
   Duracao: 4s
   ═══════════════════════════════════════════════════════════════════ */
export function VictoryOverlay({ amount, winnerSide, onDone }: {
  amount: number; winnerSide: string; onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'burst' | 'show' | 'exit'>('burst');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    const t3 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line

  // Confetti explosion
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      // Multi-burst: center + left + right
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cleanup1 = createParticleCanvas(canvas, {
        count: 60,
        colors: [GOLD, GOLD_LIGHT, GOLD_DARK, GREEN_LIGHT, '#fff', '#fbbf24', '#f59e0b'],
        gravity: 0.12,
        spread: 1.5,
        speed: 6,
        originX: w / 2,
        originY: h * 0.4,
        shapes: ['rect', 'diamond', 'star', 'circle'],
        sizeRange: [3, 9],
        decayRange: [0.006, 0.014],
        burst: true,
      });

      // Side bursts delayed
      const t = setTimeout(() => {
        if (!canvas.parentElement) return;
        createParticleCanvas(canvas, {
          count: 25,
          colors: [GOLD, GOLD_LIGHT, '#fff', GREEN_LIGHT],
          gravity: 0.1,
          spread: 1.2,
          speed: 4,
          originX: w * 0.2,
          originY: h * 0.5,
          shapes: ['diamond', 'star'],
          sizeRange: [2, 6],
          decayRange: [0.008, 0.016],
          burst: true,
        });
        createParticleCanvas(canvas, {
          count: 25,
          colors: [GOLD, GOLD_LIGHT, '#fff', GREEN_LIGHT],
          gravity: 0.1,
          spread: 1.2,
          speed: 4,
          originX: w * 0.8,
          originY: h * 0.5,
          shapes: ['diamond', 'star'],
          sizeRange: [2, 6],
          decayRange: [0.008, 0.016],
          burst: true,
        });
      }, 600);

      return () => { cleanup1(); clearTimeout(t); };
    }
  }, []);

  const isVisible = phase !== 'exit';

  return (
    <div
      className="anim-overlay"
      style={{
        background: 'rgba(4,16,8,0.9)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Radial gold burst — fullscreen */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 45%, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.08) 25%, rgba(201,168,76,0.03) 50%, transparent 75%)`,
        animation: phase === 'burst'
          ? 'victoryRadialBurst 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          : 'victoryRadialPulse 2s ease-in-out infinite',
      }} />

      {/* Light rays — fullscreen */}
      <div style={{
        position: 'absolute',
        inset: '-50%',
        opacity: phase === 'show' ? 0.15 : 0,
        transition: 'opacity 1s ease',
        background: `conic-gradient(
          from 0deg,
          transparent 0deg, rgba(201,168,76,0.3) 10deg, transparent 20deg,
          transparent 40deg, rgba(201,168,76,0.2) 50deg, transparent 60deg,
          transparent 80deg, rgba(201,168,76,0.25) 90deg, transparent 100deg,
          transparent 120deg, rgba(201,168,76,0.2) 130deg, transparent 140deg,
          transparent 160deg, rgba(201,168,76,0.3) 170deg, transparent 180deg,
          transparent 200deg, rgba(201,168,76,0.2) 210deg, transparent 220deg,
          transparent 240deg, rgba(201,168,76,0.25) 250deg, transparent 260deg,
          transparent 280deg, rgba(201,168,76,0.2) 290deg, transparent 300deg,
          transparent 320deg, rgba(201,168,76,0.3) 330deg, transparent 340deg,
          transparent 360deg
        )`,
        animation: 'slowRotate 8s linear infinite',
      }} />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}
      />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {/* Trophy with 3D effect */}
        <div style={{
          fontSize: 64,
          filter: 'drop-shadow(0 4px 20px rgba(201,168,76,0.5))',
          animation: phase !== 'burst' ? 'trophyEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both' : 'none',
          opacity: phase === 'burst' ? 0 : 1,
          transform: phase === 'burst' ? 'scale(0) rotateZ(-20deg)' : undefined,
        }}>
          <span role="img" aria-label="trophy">&#127942;</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 32,
          fontWeight: 900,
          fontFamily: "'Playfair Display', serif",
          letterSpacing: '0.04em',
          background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: phase !== 'burst'
            ? 'shimmerGold 2s linear infinite, victoryTitleEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both'
            : 'none',
          opacity: phase === 'burst' ? 0 : undefined,
          textShadow: 'none',
          filter: 'drop-shadow(0 2px 15px rgba(201,168,76,0.4))',
        }}>
          VOCE GANHOU!
        </h2>

        {/* Amount */}
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          fontFamily: "'Inter', monospace",
          color: GREEN_LIGHT,
          textShadow: `0 0 40px rgba(82,183,136,0.4), 0 2px 0 rgba(0,0,0,0.3)`,
          animation: phase === 'show'
            ? 'amountCountUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
            : 'none',
          opacity: phase === 'burst' ? 0 : undefined,
          letterSpacing: '-0.02em',
        }}>
          +R$ {amount.toLocaleString('pt-BR')}
        </div>

        {/* Winner side badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 8,
          opacity: phase === 'show' ? 1 : 0,
          transform: phase === 'show' ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s',
        }}>
          <div style={{
            width: 40, height: 1,
            background: `linear-gradient(90deg, transparent, rgba(201,168,76,0.3))`,
          }} />
          <span style={{
            color: `rgba(201,168,76,0.5)`,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Lado {winnerSide} venceu
          </span>
          <div style={{
            width: 40, height: 1,
            background: `linear-gradient(90deg, rgba(201,168,76,0.3), transparent)`,
          }} />
        </div>
      </div>

      <div className="anim-vignette" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DEFEAT OVERLAY — elegante, sutil, cinematico
   Duracao: 3s
   ═══════════════════════════════════════════════════════════════════ */
export function DefeatOverlay({ amount, winnerSide, onDone }: {
  amount: number; winnerSide: string; onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 300);
    const t2 = setTimeout(() => setPhase('exit'), 2400);
    const t3 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line

  // Subtle falling particles
  useEffect(() => {
    if (canvasRef.current) {
      return createParticleCanvas(canvasRef.current, {
        count: 15,
        colors: ['rgba(239,68,68,0.4)', 'rgba(239,68,68,0.2)', 'rgba(255,255,255,0.1)'],
        gravity: 0.04,
        spread: 2,
        speed: 0.8,
        shapes: ['circle'],
        sizeRange: [1, 3],
        decayRange: [0.004, 0.01],
        burst: false,
      });
    }
  }, []);

  const isVisible = phase !== 'exit';

  return (
    <div
      className="anim-overlay"
      style={{
        background: 'rgba(15,4,4,0.9)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Subtle red ambient — fullscreen */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 45%, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.04) 30%, transparent 65%)',
        animation: 'defeatPulse 3s ease-in-out infinite',
      }} />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
      />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        animation: phase === 'enter' ? 'none' : 'defeatShakeSubtle 0.5s ease-out both',
      }}>
        {/* Icon */}
        <div style={{
          fontSize: 52,
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(-20px) scale(0.8)' : 'translateY(0) scale(1)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 4px 15px rgba(239,68,68,0.3))',
        }}>
          <span role="img" aria-label="loss">&#128184;</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          fontFamily: "'Playfair Display', serif",
          color: '#ef4444',
          letterSpacing: '0.04em',
          textShadow: '0 0 30px rgba(239,68,68,0.3)',
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
        }}>
          Boa sorte na proxima
        </h2>

        {/* Amount */}
        <div style={{
          fontSize: 40,
          fontWeight: 900,
          fontFamily: "'Inter', monospace",
          color: '#f87171',
          textShadow: '0 0 20px rgba(248,113,113,0.3)',
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.9)' : 'scale(1)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s',
          letterSpacing: '-0.02em',
        }}>
          -R$ {amount.toLocaleString('pt-BR')}
        </div>

        {/* Side info */}
        <div style={{
          opacity: phase === 'show' ? 0.4 : 0,
          transition: 'opacity 0.5s ease 0.4s',
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
        }}>
          <div style={{ width: 30, height: 1, background: 'rgba(239,68,68,0.2)' }} />
          <span style={{
            color: 'rgba(248,113,113,0.4)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            Lado {winnerSide} venceu
          </span>
          <div style={{ width: 30, height: 1, background: 'rgba(239,68,68,0.2)' }} />
        </div>
      </div>

      <div className="anim-vignette" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15,4,4,0.6) 100%)' }} />
    </div>
  );
}
