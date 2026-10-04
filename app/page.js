import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import Cover from '@/components/Cover';
import NightScene from '@/components/NightScene';
import Reveal from '@/components/Reveal';
import { Bow } from '@/components/ornaments';

const SAMPLE = [
  { id: 's1', title: 'Rebecca', author: 'Daphne du Maurier' },
  { id: 's2', title: 'Circe', author: 'Madeline Miller' },
  { id: 's3', title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { id: 's4', title: 'Piranesi', author: 'Susanna Clarke' },
  { id: 's5', title: 'Little Women', author: 'Louisa May Alcott' },
  { id: 's6', title: 'The Bell Jar', author: 'Sylvia Plath' },
  { id: 's7', title: 'Wuthering Heights', author: 'Emily Brontë' },
  { id: 's8', title: 'The Song of Achilles', author: 'Madeline Miller' },
];

const SAMPLE_EDGES = [
  ['s1', 's3'], ['s1', 's7'], ['s3', 's7'], ['s2', 's8'], ['s2', 's4'], ['s5', 's6'], ['s6', 's1'],
].map(([source, target]) => ({ source, target }));

async function isSignedIn() {
  try {
    const { userId } = await auth();
    return Boolean(userId);
  } catch {
    return false;
  }
}

const FIELD = [
  'radial-gradient(1px 1px at 12% 22%, #fff 99%, transparent)',
  'radial-gradient(1.5px 1.5px at 28% 70%, #ffd3e1 99%, transparent)',
  'radial-gradient(1px 1px at 44% 30%, #fff 99%, transparent)',
  'radial-gradient(1.5px 1.5px at 61% 78%, #fff 99%, transparent)',
  'radial-gradient(1px 1px at 77% 24%, #ffd3e1 99%, transparent)',
  'radial-gradient(1.5px 1.5px at 90% 62%, #fff 99%, transparent)',
  'radial-gradient(1px 1px at 8% 82%, #ffd3e1 99%, transparent)',
  'radial-gradient(1px 1px at 52% 12%, #fff 99%, transparent)',
].join(',');

export default async function Landing() {
  const signedIn = await isSignedIn();
  const start = signedIn ? '/dashboard' : '/sign-up';

  return (
    <div className="app-shell" style={{ background: '#fff8f6' }}>
      <section className="night-hero">
        <NightScene stars={SAMPLE.slice(0, 6)} edges={SAMPLE_EDGES} label="A pink moon over a cottage where a girl reads by a lit window and a cat sits on the roof. Your books shine as stars above." />

        <header className="night-nav">
          <Link className="logo" href="/"><Bow width={40} />BookVerse</Link>
          <div className="row" style={{ marginLeft: 'auto' }}>
            {signedIn ? (
              <Link className="btn btn-glow btn-sm" href="/dashboard">Open my library</Link>
            ) : (
              <>
                <Link className="btn btn-line btn-sm" href="/sign-in">Sign in</Link>
                <Link className="btn btn-glow btn-sm nav-cta" href="/sign-up">Begin</Link>
              </>
            )}
          </div>
        </header>

        <div className="hero-copy">
          <span className="eyebrow" style={{ color: '#f7a8c0' }}>A reading universe</span>
          <h1>Every book you read is a <em>star.</em></h1>
          <p>Shelve what you love, write down what it made you feel, and watch the threads between your books light up the sky.</p>
          <div className="row wrap">
            <Link className="btn btn-glow" href={start}>Begin your manuscript</Link>
            {!signedIn && <Link className="btn btn-line" href="/sign-in">Sign in</Link>}
          </div>
        </div>

        <span className="scroll-hint">Scroll</span>
        <div className="hero-edge" aria-hidden="true">
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none">
            <path d="M0 56V30Q90 4 180 30T360 30T540 30T720 30T900 30T1080 30T1260 30T1440 30V56Z" fill="#fff8f6" />
          </svg>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <Reveal>
          <p className="lede">BookVerse keeps what you read, what you felt, and <em>the invisible threads</em> between them.</p>
        </Reveal>
      </section>

      <section className="section">
        <Reveal className="room">
          <span className="room-no">01</span>
          <div>
            <h3>The Library</h3>
            <p>Want to read, reading, read, paused. Shelve books, sort them your way, and see your whole reading life at a glance.</p>
          </div>
          <div className="room-art">
            {SAMPLE.slice(0, 4).map((b, i) => <Cover key={b.id} book={b} width={74} height={104 + (i % 2) * 20} showAuthor={false} interactive />)}
          </div>
        </Reveal>
        <Reveal className="room" delay={80}>
          <span className="room-no">02</span>
          <div>
            <h3>The Journal</h3>
            <p>Inscribe a thought, a quote, a page number. Tags are the thread that everything else hangs from.</p>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <p className="quote quote-bar" style={{ maxWidth: 'none' }}>The last chapter felt like being gently forgiven.</p>
            <div className="row"><span className="tag">grief</span><span className="tag">forgiveness</span></div>
          </div>
        </Reveal>
        <Reveal className="room" delay={160}>
          <span className="room-no">03</span>
          <div>
            <h3>The Constellation</h3>
            <p>Books that share a tag are joined by a thread. Over time your reading life draws its own map in the sky.</p>
          </div>
          <div className="room-art" style={{ alignItems: 'center' }}>
            <svg width="240" height="150" viewBox="0 0 240 150" role="img" aria-label="A small constellation of five connected books">
              <g stroke="#C8375F" strokeOpacity=".5" strokeWidth="1.6" fill="none" strokeLinecap="round">
                <path d="M30 100L90 40L160 70L200 30" /><path d="M90 40L110 115L160 70" />
              </g>
              {[[30, 100, 7], [90, 40, 10], [160, 70, 8], [200, 30, 6], [110, 115, 9]].map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#F28BAE" stroke="#fff" strokeWidth="2" />
              ))}
            </svg>
          </div>
        </Reveal>
      </section>

      <section className="sky-band" style={{ backgroundImage: `${FIELD}, linear-gradient(180deg, #34132e, #170a1b)` }}>
        <Reveal>
          <p className="lede" style={{ maxWidth: 820, margin: '0 auto' }}>One quiet window. One long night. <em>All the books you will ever love.</em></p>
        </Reveal>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <Reveal className="stack center" style={{ gap: 22 }}>
          <Bow width={88} sway />
          <h2 className="h-page" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>Begin your manuscript</h2>
          <p className="muted" style={{ maxWidth: 440, lineHeight: 1.6, fontSize: 18 }}>Free to start. Bring your first book, or import your Goodreads library, and the sky will fill in on its own.</p>
          <Link className="btn btn-primary" href={start}>Create my account</Link>
        </Reveal>
      </section>

      <footer className="footer">
        <span className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--rose-deep)' }}>BookVerse</span>
        <span>© MMXXVI · Kept with care</span>
      </footer>
    </div>
  );
}
