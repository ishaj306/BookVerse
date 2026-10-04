import Link from 'next/link';
import { Bow } from './ornaments';

export function Loading({ label = 'Opening the archive…' }) {
  return (
    <div className="empty" role="status">
      <div className="pearls"><span className="pearl" /><span className="pearl pearl-rose" /><span className="pearl pearl-deep" /></div>
      <p className="muted">{label}</p>
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="notice notice-error" role="alert">{message}</div>;
}

export function Empty({ title, text, href, action }) {
  return (
    <div className="card-pink empty">
      <Bow width={64} />
      <h2 className="h-sec">{title}</h2>
      {text && <p className="muted" style={{ maxWidth: 420, lineHeight: 1.55 }}>{text}</p>}
      {href && <Link className="btn btn-primary" href={href}>{action}</Link>}
    </div>
  );
}
