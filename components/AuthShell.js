import Link from 'next/link';
import NightScene from './NightScene';
import { Bow } from './ornaments';

const SAMPLE = [
  { id: 'a1', title: 'Rebecca' },
  { id: 'a2', title: 'Circe' },
  { id: 'a3', title: 'Jane Eyre' },
  { id: 'a4', title: 'Piranesi' },
];
const EDGES = [['a1', 'a3'], ['a3', 'a2'], ['a2', 'a4']].map(([source, target]) => ({ source, target }));

/** Sign in and sign up: the night scene on one side, the form on the other. */
export default function AuthShell({ heading, children }) {
  return (
    <div className="auth">
      <section className="auth-side" aria-hidden="false">
        <NightScene stars={SAMPLE} edges={EDGES} label="A pink moon over a cottage with a lit window." />
        <Link className="logo auth-logo" href="/"><Bow width={40} />BookVerse</Link>
      </section>
      <section className="auth-main">
        <div className="auth-form">
          <h1 className="auth-heading">{heading}</h1>
          <p className="muted" style={{ marginBottom: 20 }}>Every book you love is waiting exactly where you left it.</p>
          {children}
        </div>
      </section>
    </div>
  );
}
