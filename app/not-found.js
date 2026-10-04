import Link from 'next/link';
import NightScene from '@/components/NightScene';
import { Bow } from '@/components/ornaments';

export const metadata = { title: 'Page not found — BookVerse' };

export default function NotFound() {
  return (
    <section className="night-hero">
      <NightScene stars={[]} label="A pink moon over a quiet cottage. The cat is looking for this page too." />
      <header className="night-nav">
        <Link className="logo" href="/"><Bow width={40} />BookVerse</Link>
      </header>
      <div className="hero-copy">
        <span className="eyebrow" style={{ color: '#f7a8c0' }}>Error 404</span>
        <h1>This page <em>wandered off.</em></h1>
        <p>It is not on any of our shelves. The cat has been told to look for it.</p>
        <div className="row wrap">
          <Link className="btn btn-glow" href="/">Back to the sky</Link>
          <Link className="btn btn-line" href="/library">Open my library</Link>
        </div>
      </div>
    </section>
  );
}
