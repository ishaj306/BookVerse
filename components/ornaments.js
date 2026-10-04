/** Decorative pieces: silk bows, ribbon rules, pearls, reading glasses. */

/** Gradient definitions for the silk bow. Include once inside an <svg><defs>. */
export function BowDefs() {
  return (
    <>
      <linearGradient id="silk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F9B5CB" />
        <stop offset=".55" stopColor="#D8527A" />
        <stop offset="1" stopColor="#8E1E43" />
      </linearGradient>
      <linearGradient id="silk-deep" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#D8527A" />
        <stop offset="1" stopColor="#6E1535" />
      </linearGradient>
    </>
  );
}

/** The bow drawing itself (viewBox 0 0 64 52): satin loops, a knot, long curling tails. */
export function BowPaths({ sway = false }) {
  return (
    <>
      {/* tails sit behind the loops */}
      <g className={sway ? 'bow-tail bow-tail-l' : undefined}>
        <path d="M30 26C27 34 34 38 27 49L23.5 45.5 20.5 50C19 41 25 36 25 32C25 29 27 27 30 26Z" fill="url(#silk-deep)" />
        <path d="M27.5 31C26.5 36 29 39 25 45" stroke="#fff" strokeOpacity=".28" strokeWidth=".8" fill="none" strokeLinecap="round" />
      </g>
      <g className={sway ? 'bow-tail bow-tail-r' : undefined}>
        <path d="M34 26C37 34 30 38 37 49L40.5 45.5 43.5 50C45 41 39 36 39 32C39 29 37 27 34 26Z" fill="url(#silk-deep)" />
        <path d="M36.5 31C37.5 36 35 39 39 45" stroke="#fff" strokeOpacity=".28" strokeWidth=".8" fill="none" strokeLinecap="round" />
      </g>
      {/* loops */}
      <path d="M32 21C25 5 8 -1 3 9C-1 18 8 30 22 28C27 27 30 24 32 21Z" fill="url(#silk)" />
      <path d="M32 21C39 5 56 -1 61 9C65 18 56 30 42 28C37 27 34 24 32 21Z" fill="url(#silk)" />
      {/* folds + highlights */}
      <path d="M31 21C24 14 14 11 8 14" stroke="#8E1E43" strokeOpacity=".55" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M33 21C40 14 50 11 56 14" stroke="#8E1E43" strokeOpacity=".55" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M12 8C17 5 22 7 25 12" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M52 8C47 5 42 7 39 12" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M9 21C13 25 19 26 24 25" stroke="#fff" strokeOpacity=".25" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M55 21C51 25 45 26 40 25" stroke="#fff" strokeOpacity=".25" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* knot */}
      <rect x="27.5" y="15.5" width="9" height="12" rx="4" fill="url(#silk-deep)" />
      <path d="M29 18C31 19 33 19 35 18M29 22C31 23 33 23 35 22" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" fill="none" strokeLinecap="round" />
    </>
  );
}

export function Bow({ width = 56, className = '', sway = false }) {
  return (
    <svg className={className} aria-hidden="true" width={width} height={Math.round(width * 0.8125)} viewBox="0 0 64 52">
      <defs><BowDefs /></defs>
      <BowPaths sway={sway} />
    </svg>
  );
}

export function Glasses({ width = 84 }) {
  return (
    <svg aria-hidden="true" width={width} height={Math.round(width * 0.55)} viewBox="0 0 72 40" fill="none" stroke="#6E4829" strokeWidth="2.5">
      <circle cx="16" cy="22" r="13" fill="rgba(255,255,255,.4)" />
      <circle cx="56" cy="22" r="13" fill="rgba(255,255,255,.4)" />
      <path d="M29 20c4-4 10-4 14 0" />
      <path d="M3 20L0 12M69 20l3-8" />
    </svg>
  );
}

/** A run of pearls: `filled` of `total` are lit. */
export function Pearls({ total, filled, size = 14, tone = 'deep', gap }) {
  const items = [];
  for (let i = 0; i < total; i++) {
    items.push(
      <span
        key={i}
        className={`pearl ${i < filled ? `pearl-${tone}` : 'pearl-hollow'}`}
        style={{ width: size, height: size, animationDelay: `${i * 40}ms` }}
      />
    );
  }
  return (
    <div className="pearls pearls-pop" style={gap != null ? { gap } : undefined} role="img" aria-label={`${filled} of ${total}`}>
      {items}
    </div>
  );
}

/** Five-pearl rating. Interactive when `onChange` is given. */
export function PearlRating({ value = 0, onChange, size = 24 }) {
  return (
    <div className="pearls" style={{ gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const cls = `pearl ${n <= Math.round(value) ? 'pearl-deep' : 'pearl-hollow'}`;
        const style = { width: size, height: size };
        return onChange ? (
          <button
            key={n}
            type="button"
            className={cls}
            style={style}
            aria-label={`Rate ${n} of 5`}
            onClick={() => onChange(n === Math.round(value) ? 0 : n)}
          />
        ) : (
          <span key={n} className={cls} style={style} />
        );
      })}
    </div>
  );
}
