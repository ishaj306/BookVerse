'use client';

import { useRouter } from 'next/navigation';

/** Switches the development-only sample-data mode on or off. */
export default function MockEnter() {
  const router = useRouter();

  function enter() {
    document.cookie = 'bv_mock=1; path=/; max-age=86400; samesite=lax';
    router.push('/dashboard');
  }

  function leave() {
    document.cookie = 'bv_mock=; path=/; max-age=0; samesite=lax';
    router.push('/');
  }

  return (
    <main className="page" style={{ maxWidth: 560, minHeight: '100svh', justifyContent: 'center' }}>
      <span className="eyebrow">Development only</span>
      <h1 className="h-page">Review mode</h1>
      <p className="muted" style={{ lineHeight: 1.6 }}>
        Look at every signed-in screen with sample books, no login and no database. Nothing you do here is saved.
        This page does not exist in a production build.
      </p>
      <div className="row wrap">
        <button type="button" className="btn btn-primary" onClick={enter}>Enter with sample data</button>
        <button type="button" className="btn btn-ghost" onClick={leave}>Leave review mode</button>
      </div>
    </main>
  );
}
