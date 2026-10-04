'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const W = 640;
const H = 300;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = rng(31);
const DUST = Array.from({ length: 34 }, () => ({ x: Math.round(rand() * W), y: Math.round(rand() * H), r: +(0.6 + rand() * 1.2).toFixed(2), o: +(0.25 + rand() * 0.6).toFixed(2) }));

/**
 * A small night sky for one book: the book is the bright star in the middle and
 * the books it shares threads with orbit around it. Click one to go there.
 *
 * @param {{ id: string, title: string }} center
 * @param {{ id: string, title: string, type: string }[]} neighbors
 */
export default function MiniSky({ center, neighbors }) {
  const router = useRouter();
  const [hover, setHover] = useState(null);

  const list = neighbors.slice(0, 8);
  const cx = W / 2;
  const cy = H / 2 - 6;
  const points = list.map((n, i) => {
    const angle = -Math.PI / 2 + (i / list.length) * Math.PI * 2 + (list.length === 1 ? Math.PI / 3 : 0.2);
    const wobble = i % 2 ? 0.8 : 1;
    return { ...n, x: cx + Math.cos(angle) * 215 * wobble, y: cy + Math.sin(angle) * 100 * wobble };
  });

  return (
    <div className="mini-sky">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${center.title} and the books it is connected to`}>
        <defs>
          <radialGradient id="ms-star" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#FFD3E1" /><stop offset="1" stopColor="#F28BAE" />
          </radialGradient>
        </defs>
        {DUST.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFE9F0" opacity={d.o} />)}

        {points.map((p, i) => (
          <line key={`l-${p.id}`} className="draw" pathLength="1" x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke={hover === p.id ? '#fff' : '#F5C2D2'} strokeOpacity={hover === p.id ? 0.95 : p.type === 'manual' ? 0.8 : 0.4}
            strokeWidth={hover === p.id ? 2 : p.type === 'manual' ? 1.8 : 1.2} strokeLinecap="round" style={{ animationDelay: `${0.2 + i * 0.1}s` }} />
        ))}

        {points.map((p, i) => (
          <g key={p.id} className="bstar bstar-link" tabIndex={0} role="link" aria-label={`Open ${p.title}`}
            onClick={() => router.push(`/book/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/book/${p.id}`)}
            onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
            <circle cx={p.x} cy={p.y} r="26" fill="#F7A8C0" opacity={hover === p.id ? 0.4 : 0.14} className="halo" />
            <circle cx={p.x} cy={p.y} r="9" fill="url(#ms-star)" />
            <text x={p.x} y={p.y + 30} textAnchor="middle" fontSize="14" fontWeight="600" fill="#FFE9F0" style={{ fontFamily: 'var(--font-display)' }}>
              {p.title.length > 24 ? `${p.title.slice(0, 23)}…` : p.title}
            </text>
          </g>
        ))}

        <g>
          <circle cx={cx} cy={cy} r="38" fill="#F7A8C0" opacity=".18" className="halo-soft" />
          <circle cx={cx} cy={cy} r="15" fill="url(#ms-star)" />
          <text x={cx} y={cy + 40} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" style={{ fontFamily: 'var(--font-display)' }}>
            {center.title.length > 26 ? `${center.title.slice(0, 25)}…` : center.title}
          </text>
        </g>
      </svg>
    </div>
  );
}
