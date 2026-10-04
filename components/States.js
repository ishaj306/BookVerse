import Link from 'next/link';
import { Bow } from './ornaments';

export function Skeleton({ w = '100%', h = 16, r = 8, style }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Page-shaped loading placeholder: a title block and rows of content. */
export function Loading({ label = 'Opening the archive…', variant = 'page' }) {
  return (
    <div role="status" aria-live="polite" className="stack" style={{ gap: 24 }}>
      <span className="sr-only">{label}</span>
      <div className="stack" style={{ gap: 12 }}>
        <Skeleton w={110} h={12} />
        <Skeleton w="min(420px, 70%)" h={44} r={10} />
      </div>
      {variant === 'shelf' ? (
        <div className="row" style={{ gap: 14, alignItems: 'flex-end' }}>
          {[150, 170, 140, 180, 160, 150].map((h, i) => <Skeleton key={i} w={84} h={h} r={8} />)}
        </div>
      ) : (
        <div className="grid g-3" style={{ gap: 20 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="stack" style={{ gap: 10 }}>
              <Skeleton h={140} r={14} />
              <Skeleton w="70%" h={14} />
              <Skeleton w="45%" h={12} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="notice notice-error" role="alert">{message}</div>;
}

export function Empty({ title, text, href, action }) {
  return (
    <div className="empty">
      <Bow width={72} sway />
      <h2 className="h-sec">{title}</h2>
      {text && <p className="muted" style={{ maxWidth: 420, lineHeight: 1.6 }}>{text}</p>}
      {href && <Link className="btn btn-primary" href={href}>{action}</Link>}
    </div>
  );
}
