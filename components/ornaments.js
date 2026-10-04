/** Decorative pieces: bows, ribbon rules, pearls, reading glasses. */

export function Bow({ width = 56, className = '' }) {
  return (
    <svg className={className} aria-hidden="true" width={width} height={Math.round(width * 0.625)} viewBox="0 0 64 40">
      <path d="M32 20C22 3 3 1 2 14c-1 13 19 13 30 6z" fill="#C8375F" />
      <path d="M32 20C42 3 61 1 62 14c1 13-19 13-30 6z" fill="#C8375F" />
      <path d="M32 20C24 12 14 10 9 13" stroke="#A8234B" strokeWidth="1.5" fill="none" />
      <path d="M32 20C40 12 50 10 55 13" stroke="#A8234B" strokeWidth="1.5" fill="none" />
      <path d="M29 24l-10 14 8-2 3 4 3-15z" fill="#A8234B" />
      <path d="M35 24l10 14-8-2-3 4-3-15z" fill="#A8234B" />
      <rect x="27" y="14" width="10" height="11" rx="3.5" fill="#761634" />
    </svg>
  );
}

export function Rule({ bow = 46 }) {
  return (
    <div className="rule" role="presentation">
      <Bow width={bow} />
    </div>
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
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="pearls" style={gap != null ? { gap } : undefined} role="img" aria-label={`${filled} of ${total}`}>
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
