'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import NightScene from '@/components/NightScene';
import { Bow } from '@/components/ornaments';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="night-hero">
      <NightScene stars={[]} label="A pink moon over a quiet cottage." />
      <header className="night-nav">
        <Link className="logo" href="/"><Bow width={40} />BookVerse</Link>
      </header>
      <div className="hero-copy">
        <span className="eyebrow" style={{ color: '#f7a8c0' }}>Something went sideways</span>
        <h1>A page <em>fell off the shelf.</em></h1>
        <p>It was not you. Try again, and if it keeps happening, come back in a little while.</p>
        <div className="row wrap">
          <button type="button" className="btn btn-glow" onClick={() => reset()}>Try again</button>
          <Link className="btn btn-line" href="/">Back to the sky</Link>
        </div>
      </div>
    </section>
  );
}
