'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BowDefs, BowPaths } from './ornaments';

/**
 * The BookVerse world: a pink moon over a house where a girl reads by a lit
 * window while a cat watches from the roof. Your books are the stars above,
 * joined by threads. Reacts to the pointer and to scrolling.
 */

const W = 1200;
const H = 700;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = rng(7);
const X0 = -1100;
const SPAN = 3400;
// Only every third star twinkles: it reads the same and costs far less to animate.
const FAR = Array.from({ length: 170 }, (_, i) => ({
  x: Math.round(X0 + rand() * SPAN), y: Math.round(rand() * 470), r: +(0.5 + rand() * 0.9).toFixed(2), d: +(rand() * 6).toFixed(1), t: +(2.5 + rand() * 4).toFixed(1), tw: i % 3 === 0,
}));
const NEAR = Array.from({ length: 44 }, (_, i) => ({
  x: Math.round(X0 + rand() * SPAN), y: Math.round(rand() * 420), r: +(1.2 + rand() * 1.5).toFixed(2), d: +(rand() * 6).toFixed(1), t: +(3 + rand() * 4).toFixed(1), tw: i % 2 === 0,
}));
const PETALS = Array.from({ length: 9 }, (_, i) => ({
  x: 80 + Math.round(rand() * 1000), d: +(i * 1.7).toFixed(1), t: +(11 + rand() * 7).toFixed(1), s: +(0.7 + rand() * 0.8).toFixed(2),
}));

/** Where book stars sit: central ones first so they survive narrow screens. */
const SLOTS = [[540, 110], [450, 190], [630, 205], [360, 120], [690, 300], [430, 290], [300, 235], [225, 150], [135, 250], [120, 90], [255, 60]];

/** The signed-in home keeps the left clear for the greeting, so stars cluster right of it. */
const COMPACT_SLOTS = [[560, 130], [470, 205], [640, 215], [390, 140], [690, 300], [330, 235], [430, 290], [560, 50], [420, 55], [620, 300], [300, 150]];

/** Pearl garland sagging along the eave of the roof. */
const GARLAND = Array.from({ length: 14 }, (_, i) => {
  const t = (i + 0.5) / 14;
  return { x: 388 + t * 244, y: 478 + Math.sin(Math.PI * t) * 9, d: +(i * 0.35).toFixed(2) };
});

export default function NightScene({ stars = [], edges = [], hrefFor, mode = 'full', label = 'A night sky over a cottage' }) {
  const router = useRouter();
  const root = useRef(null);
  const compact = mode === 'compact';
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H });
  const [hover, setHover] = useState(null);
  const [lamp, setLamp] = useState(true);

  const slots = compact ? COMPACT_SLOTS : SLOTS;
  const placed = useMemo(
    () => stars.slice(0, slots.length).map((s, i) => ({ ...s, x: slots[i][0], y: slots[i][1], r: 7 + (i % 3) * 1.5 })),
    [stars, slots]
  );
  const byId = useMemo(() => new Map(placed.map((s) => [s.id, s])), [placed]);
  const links = useMemo(() => {
    // One thread per pair of books, even when they share a tag and a hand-drawn link.
    const pairs = new Map();
    for (const e of edges) {
      if (!byId.has(e.source) || !byId.has(e.target)) continue;
      const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
      const prev = pairs.get(key);
      pairs.set(key, { a: byId.get(e.source), b: byId.get(e.target), manual: e.type === 'manual' || Boolean(prev?.manual) });
    }
    if (pairs.size) return [...pairs.values()];
    return placed.slice(1).map((s, i) => ({ a: placed[i], b: s, manual: false }));
  }, [edges, byId, placed]);

  // Crop the 1200x700 scene to the container so the house and moon stay in frame.
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const ratio = width / Math.max(height, 1);
      const h = compact ? 600 : H;
      const y = compact ? 60 : 0;
      if (ratio < 1) {
        // phones: keep the house and the moon in frame
        const w = Math.max(470, h * ratio);
        return setView({ x: Math.min(Math.max(600 - w / 2, 0), W - w), y, w, h });
      }
      // wider screens: park the house right of the headline copy
      const w = Math.min(h * ratio, 3000);
      setView({ x: 510 - (compact ? 0.72 : 0.64) * w, y, w, h });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact]);

  // Stop all the ambient animation while the scene is off screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? 'false' : 'true';
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pointer and scroll drive CSS variables directly, so React never re-renders.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    const set = (name, value) => el.style.setProperty(name, value);

    const onMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        set('--px', (nx * 2 - 1).toFixed(3));
        set('--py', (ny * 2 - 1).toFixed(3));
        set('--mx', `${(nx * 100).toFixed(1)}%`);
        set('--my', `${(ny * 100).toFixed(1)}%`);
      });
    };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
      set('--sy', progress.toFixed(3));
    };
    el.addEventListener('pointermove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const go = (star) => hrefFor && router.push(hrefFor(star));
  const tip = hover && byId.get(hover);

  return (
    <div ref={root} className={`scene ${lamp ? '' : 'lamp-off'}`}>
      <div className="scene-spot" aria-hidden="true" />
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMax slice" role="img" aria-label={label}>
        <defs>
          <BowDefs />
          <radialGradient id="moon-fill" cx="38%" cy="34%" r="75%">
            <stop offset="0" stopColor="#FFF1F5" /><stop offset=".45" stopColor="#F9B5CB" /><stop offset="1" stopColor="#E0709A" />
          </radialGradient>
          <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#F7A8C0" stopOpacity=".5" /><stop offset=".5" stopColor="#F7A8C0" stopOpacity=".14" /><stop offset="1" stopColor="#F7A8C0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="win-glow" cx="50%" cy="60%" r="70%">
            <stop offset="0" stopColor="#FFE7B0" /><stop offset=".6" stopColor="#FFB877" /><stop offset="1" stopColor="#F58A5B" />
          </radialGradient>
          <radialGradient id="star-fill" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#FFD3E1" /><stop offset="1" stopColor="#F28BAE" />
          </radialGradient>
          <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFC98A" stopOpacity=".35" /><stop offset="1" stopColor="#FFC98A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1330" /><stop offset="1" stopColor="#170a1b" />
          </linearGradient>
        </defs>

        {/* far stars */}
        <g className="par" style={{ '--depth': 4 }}>
          {FAR.map((s, i) => (
            <circle key={i} className={s.tw ? 'tw' : undefined} cx={s.x} cy={s.y} r={s.r} fill="#FFE9F0" opacity={s.tw ? undefined : 0.55} style={s.tw ? { animationDelay: `${s.d}s`, animationDuration: `${s.t}s` } : undefined} />
          ))}
        </g>
        {/* near stars */}
        <g className="par" style={{ '--depth': 9 }}>
          {NEAR.map((s, i) => (
            <circle key={i} className={s.tw ? 'tw' : undefined} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.tw ? undefined : 0.8} style={s.tw ? { animationDelay: `${s.d}s`, animationDuration: `${s.t}s` } : undefined} />
          ))}
        </g>

        {/* shooting stars */}
        <g aria-hidden="true">
          <line className="shoot" x1="300" y1="60" x2="250" y2="86" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: '3s' }} />
          <line className="shoot" x1="780" y1="40" x2="730" y2="66" stroke="#FFD3E1" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: '11s' }} />
        </g>

        {/* moon */}
        <g className="par moon" style={{ '--depth': 14 }}>
          <circle cx="790" cy="150" r="190" fill="url(#moon-glow)" className="moon-glow" />
          <circle cx="790" cy="150" r="82" fill="url(#moon-fill)" />
          <g fill="#C9507C" opacity=".32">
            <ellipse cx="765" cy="128" rx="20" ry="14" /><ellipse cx="808" cy="166" rx="24" ry="17" /><ellipse cx="770" cy="182" rx="12" ry="9" />
            <ellipse cx="824" cy="120" rx="9" ry="7" /><ellipse cx="748" cy="160" rx="7" ry="5" />
          </g>
        </g>

        {/* constellation of your books */}
        <g className="par" style={{ '--depth': 11 }}>
          {links.map((l, i) => {
            const lit = hover && (l.a.id === hover || l.b.id === hover);
            return (
              <line key={`${l.a.id}-${l.b.id}`} className="draw" pathLength="1" x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y}
                stroke={lit ? '#fff' : l.manual ? '#FFD3E1' : '#F5C2D2'} strokeOpacity={lit ? 0.95 : l.manual ? 0.8 : 0.42}
                strokeWidth={lit ? 2 : l.manual ? 1.8 : 1.1} strokeLinecap="round" style={{ animationDelay: `${0.4 + i * 0.12}s` }} />
            );
          })}
          {placed.map((s, i) => (
            <g key={s.id} className={`bstar ${hrefFor ? 'bstar-link' : ''}`} tabIndex={hrefFor ? 0 : -1} role={hrefFor ? 'link' : undefined}
              aria-label={s.title} onClick={() => go(s)} onKeyDown={(e) => e.key === 'Enter' && go(s)}
              onPointerEnter={() => setHover(s.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <circle cx={s.x} cy={s.y} r={s.r * 3.2} fill="#F7A8C0" opacity={hover === s.id ? 0.4 : 0.16} className="halo" />
              <circle cx={s.x} cy={s.y} r={s.r * 1.6} fill="transparent" />
              <circle cx={s.x} cy={s.y} r={s.r} fill="url(#star-fill)" />
            </g>
          ))}
          {tip && (
            <g pointerEvents="none">
              <rect x={tip.x - (tip.title.length * 4.4 + 14)} y={tip.y - tip.r - 38} width={tip.title.length * 8.8 + 28} height="26" rx="13" fill="#FFF7F8" />
              <text x={tip.x} y={tip.y - tip.r - 20} textAnchor="middle" fontSize="14" fontWeight="600" fill="#761634" style={{ fontFamily: 'var(--font-body)' }}>{tip.title}</text>
            </g>
          )}
        </g>

        {/* distant hills */}
        <rect x="-1200" y="560" width="1201" height="200" fill="#2a1330" />
        <rect x="1199" y="508" width="1201" height="260" fill="#170a1b" />
        <path d="M0 560C160 500 330 520 470 556C640 600 780 520 960 536C1080 546 1150 520 1200 508V700H0Z" fill="url(#hill-back)" />

        {/* trees */}
        <g fill="#150a18">
          <rect x="735" y="520" width="10" height="130" /><circle cx="740" cy="500" r="50" /><circle cx="708" cy="524" r="36" /><circle cx="774" cy="528" r="38" />
          <rect x="296" y="560" width="8" height="90" /><circle cx="300" cy="540" r="34" /><circle cx="324" cy="562" r="24" />
        </g>

        {/* the house */}
        <g className="par" style={{ '--depth': 3 }}>
          <path d="M355 472L510 365L665 472Z" fill="#1d0e21" />
          <path d="M355 472L510 365L665 472" fill="none" stroke="#3b1c3f" strokeWidth="2" />
          <rect x="590" y="395" width="26" height="52" fill="#1d0e21" />
          <rect x="586" y="390" width="34" height="8" rx="2" fill="#2a1430" />
          <rect x="380" y="470" width="260" height="152" fill="#22112a" />

          {/* garland of pearls */}
          <g>{GARLAND.map((g, i) => (
            <circle key={i} className="tw" cx={g.x} cy={g.y} r="3.4" fill="#FBF1EC" style={{ animationDelay: `${g.d}s`, animationDuration: '3.6s' }} />
          ))}</g>

          {/* the lit window: tap to turn the lamp off */}
          <g className="win" role="button" tabIndex={0} aria-pressed={lamp} aria-label="Reading lamp. Press to toggle."
            onClick={() => setLamp((v) => !v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLamp((v) => !v)}>
            <rect x="404" y="494" width="102" height="94" rx="4" fill="#150a18" />
            <rect className="win-light" x="410" y="500" width="90" height="82" rx="2" fill="url(#win-glow)" />
            {/* the girl */}
            <g className="girl">
              <path d="M428 582Q430 557 455 553Q480 557 482 582Z" fill="#2a1228" />
              <circle cx="455" cy="540" r="11" fill="#2a1228" />
              <circle cx="455" cy="527" r="6" fill="#2a1228" />
              <path d="M440 566L455 562L470 566V578L455 574L440 578Z" fill="#FFF3E0" />
              <path d="M455 562V574" stroke="#E7C9A3" strokeWidth="1" />
              <rect className="flip" x="455" y="562" width="15" height="14" fill="#FFF8EE" />
            </g>
            {/* curtains tied with bows */}
            <path d="M410 500H426C422 524 424 556 426 582H410Z" fill="#D8527A" opacity=".9" />
            <path d="M500 500H484C488 524 486 556 484 582H500Z" fill="#D8527A" opacity=".9" />
            <g transform="translate(409 536) scale(.42)"><BowPaths /></g>
            <g transform="translate(473 536) scale(.42)"><BowPaths /></g>
            <path d="M410 512H500" stroke="#150a18" strokeWidth="3" />
          </g>
          <rect x="520" y="506" width="34" height="42" rx="3" fill="#150a18" /><rect x="524" y="510" width="26" height="34" rx="2" fill="#3a2040" />

          {/* door with a silk bow */}
          <rect x="566" y="540" width="46" height="82" rx="3" fill="#3a1233" />
          <circle cx="602" cy="584" r="2.4" fill="#F7C9A0" />
          <g transform="translate(578 518) scale(.62)"><BowPaths sway /></g>

          {/* chimney smoke */}
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} className="smoke" cx="603" cy="388" r={9 + i * 2} fill="#cfa8c4" style={{ animationDelay: `${i * 1.8}s` }} />
          ))}

          {/* the cat */}
          <g transform="translate(546 392)">
            <path className="tail" d="M17 -6C32 -12 34 -30 24 -34" fill="none" stroke="#0c0610" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="2" cy="-12" rx="19" ry="14" fill="#0c0610" />
            <circle cx="-10" cy="-31" r="11" fill="#0c0610" />
            <path d="M-19 -37L-17 -50L-10 -41Z M-1 -37L-3 -50L-10 -41Z" fill="#0c0610" />
            <g className="blink" fill="#C7F59B"><circle cx="-14" cy="-32" r="1.8" /><circle cx="-6" cy="-32" r="1.8" /></g>
          </g>
        </g>

        {/* foreground hill */}
        <rect x="-1200" y="646" width="1201" height="120" fill="#0d050f" />
        <rect x="1199" y="606" width="1201" height="160" fill="#0d050f" />
        <path d="M0 646C220 596 420 640 610 626C820 610 1000 640 1200 606V700H0Z" fill="#0d050f" />
        <polygon className="spill" points="410,628 500,628 560,700 360,700" fill="url(#spill)" />

        {/* drifting petals */}
        <g aria-hidden="true">
          {PETALS.map((p, i) => (
            <ellipse key={i} className="petal" cx={p.x} cy="-10" rx={5 * p.s} ry={3 * p.s} fill="#F9B5CB" style={{ animationDelay: `${p.d}s`, animationDuration: `${p.t}s` }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
