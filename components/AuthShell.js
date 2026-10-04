import Link from 'next/link';
import Bookcase from './Bookcase';
import { Bow } from './ornaments';

const SAMPLE = [
  { id: 'a1', title: 'Circe' },
  { id: 'a2', title: 'Rebecca' },
  { id: 'a3', title: 'Jane Eyre' },
  { id: 'a4', title: 'Piranesi' },
  { id: 'a5', title: 'Little Women' },
];

export default function AuthShell({ heading, children }) {
  return (
    <div className="auth">
      <section className="auth-side">
        <Link className="logo" href="/"><Bow width={40} />BookVerse</Link>
        <div className="stack" style={{ gap: 24 }}>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.98 }}>{heading}</h1>
          <p className="quote" style={{ maxWidth: 420 }}>Every book you love is waiting exactly where you left it.</p>
        </div>
        <Bookcase books={SAMPLE} coverWidth={64} bow={false} glasses />
      </section>
      <section className="auth-main">{children}</section>
    </div>
  );
}
