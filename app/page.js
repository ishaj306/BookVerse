import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import Bookcase from '@/components/Bookcase';
import Cover from '@/components/Cover';
import { Bow, Pearls, Rule } from '@/components/ornaments';

const SAMPLE = [
  { id: 's1', title: 'Circe', author: 'Madeline Miller' },
  { id: 's2', title: 'Rebecca', author: 'Daphne du Maurier' },
  { id: 's3', title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { id: 's4', title: 'Piranesi', author: 'Susanna Clarke' },
  { id: 's5', title: 'Little Women', author: 'Louisa May Alcott' },
  { id: 's6', title: 'The Bell Jar', author: 'Sylvia Plath' },
  { id: 's7', title: 'Wuthering Heights', author: 'Emily Brontë' },
  { id: 's8', title: 'The Song of Achilles', author: 'Madeline Miller' },
];

async function isSignedIn() {
  try {
    const { userId } = await auth();
    return Boolean(userId);
  } catch {
    return false;
  }
}

export default async function Landing() {
  const signedIn = await isSignedIn();
  const start = signedIn ? '/dashboard' : '/sign-up';

  return (
    <div className="app-shell">
      <header className="nav" style={{ position: 'static' }}>
        <Link className="logo" href="/"><Bow width={40} />BookVerse</Link>
        <div className="row" style={{ marginLeft: 'auto' }}>
          {signedIn ? (
            <Link className="btn btn-primary btn-sm" href="/dashboard">Open my library</Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" href="/sign-in">Sign in</Link>
              <Link className="btn btn-primary btn-sm nav-cta" href="/sign-up">Begin your manuscript</Link>
            </>
          )}
        </div>
      </header>

      <div className="page" style={{ gap: 40 }}>
        <section className="hero" style={{ paddingTop: 24 }}>
          <div className="stack" style={{ gap: 24 }}>
            <span className="chip" style={{ alignSelf: 'flex-start' }}>A romantic little reading archive</span>
            <h1>Your reading life, <em className="accent">beautifully kept.</em></h1>
            <p className="muted" style={{ fontSize: 19, lineHeight: 1.6, maxWidth: 480 }}>
              Shelve every book, inscribe what moved you, and watch a constellation of pearls form between the stories you love.
            </p>
            <div className="row wrap">
              <Link className="btn btn-primary" href={start}>Begin your manuscript</Link>
              {!signedIn && <Link className="btn btn-ghost" href="/sign-in">Sign in</Link>}
            </div>
            <div className="row">
              <Pearls total={5} filled={3} size={14} tone="rose" />
              <span className="eyebrow">Library · Journal · Constellation</span>
            </div>
          </div>
          <Bookcase books={SAMPLE} coverWidth={84} />
        </section>

        <Rule />

        <section className="stack" style={{ gap: 28 }}>
          <div className="stack center" style={{ gap: 10 }}>
            <span className="eyebrow">Three quiet rooms</span>
            <h2 className="h-sec">Everything a reader keeps, in one place</h2>
          </div>
          <div className="grid g-3">
            <article className="card stack" style={{ gap: 14 }}>
              <div className="card-soft" style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 0, minHeight: 220 }}>
                {SAMPLE.slice(0, 4).map((b) => <Cover key={b.id} book={b} width={62} showAuthor={false} />)}
              </div>
              <h3 style={{ fontSize: 32 }}>Your Library</h3>
              <p className="muted" style={{ lineHeight: 1.55 }}>Want to read, reading, read, paused. Shelves that feel like furniture, not spreadsheets.</p>
            </article>
            <article className="card stack" style={{ gap: 14 }}>
              <div className="card-pink stack" style={{ minHeight: 220, justifyContent: 'center' }}>
                <p className="quote quote-bar">The last chapter felt like being gently forgiven.</p>
                <div className="row" style={{ paddingLeft: 17 }}><span className="tag tag-white">grief</span><span className="tag tag-white">forgiveness</span></div>
              </div>
              <h3 style={{ fontSize: 32 }}>The Journal</h3>
              <p className="muted" style={{ lineHeight: 1.55 }}>Inscribe a thought, a quote, a page number. Tags are the thread everything else hangs from.</p>
            </article>
            <article className="card stack" style={{ gap: 14 }}>
              <div className="card-night" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="240" height="180" viewBox="0 0 240 180" aria-hidden="true">
                  <g stroke="#F5C2D2" strokeWidth="2" opacity=".7">
                    <line x1="40" y1="50" x2="110" y2="30" /><line x1="110" y1="30" x2="180" y2="80" strokeDasharray="6 6" />
                    <line x1="110" y1="30" x2="90" y2="120" /><line x1="90" y1="120" x2="40" y2="150" strokeDasharray="6 6" /><line x1="180" y1="80" x2="200" y2="150" />
                  </g>
                  {[[40, 50, 10], [110, 30, 13], [180, 80, 11], [90, 120, 15], [40, 150, 8], [200, 150, 9]].map(([x, y, r]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FBF6F1" />
                  ))}
                </svg>
              </div>
              <h3 style={{ fontSize: 32 }}>Your Constellation</h3>
              <p className="muted" style={{ lineHeight: 1.55 }}>Books become pearls, shared tags become ribbon threads. See the pattern in your reading life.</p>
            </article>
          </div>
        </section>

        <section className="cta-band">
          <Bow width={84} />
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 60px)' }}>Begin your manuscript</h2>
          <p className="muted" style={{ maxWidth: 460, lineHeight: 1.55, fontSize: 18 }}>Free to start. Bring your first book, or import your Goodreads library, and the constellation will follow.</p>
          <Link className="btn btn-primary" href={start}>Create my account</Link>
          <div className="pstring" style={{ width: 280 }} />
        </section>
      </div>

      <footer className="footer">
        <span className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--rose-deep)' }}>BookVerse</span>
        <span>© MMXXVI · Kept with care</span>
      </footer>
    </div>
  );
}
