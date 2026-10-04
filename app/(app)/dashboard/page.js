'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import Heatmap from '@/components/Heatmap';
import NightScene from '@/components/NightScene';
import Reveal from '@/components/Reveal';
import { ErrorNote, Loading } from '@/components/States';
import { Pearls } from '@/components/ornaments';
import { localToday, useApi } from '@/lib/client-api';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const today = localToday();
  const user = useApi('/api/user');
  const analytics = useApi(`/api/analytics?today=${today}`);
  const library = useApi('/api/library');
  const journal = useApi('/api/journal?limit=4');
  const graph = useApi('/api/constellation');

  const books = useMemo(() => library.data?.data || [], [library.data]);
  const stars = useMemo(
    () => books.filter((ub) => ub.book).slice(0, 11).map((ub) => ({ id: ub.book_id, title: ub.book.title })),
    [books]
  );
  const bookById = new Map(books.map((ub) => [ub.book_id, ub.book]));

  const a = analytics.data;
  const name = (user.data?.data?.name || '').split(' ')[0];
  const reading = a?.currentlyReading?.[0];
  const goal = (a?.goals || []).find((g) => g.type === 'yearly_books');
  const inscriptions = journal.data?.data || [];
  const error = analytics.error || library.error || journal.error;
  const hasBooks = books.length > 0;

  return (
    <>
      <section className="home-hero">
        <NightScene mode="compact" stars={stars} edges={graph.data?.edges || []} hrefFor={(star) => `/book/${star.id}`} label="Your night sky. Each star is a book in your library." />
        <div className="home-copy">
          <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>{greeting()}{name ? <>, <em>{name}</em></> : null}.</h1>
          {reading ? (
            <p style={{ color: 'rgba(255, 233, 240, 0.85)', fontSize: 17, lineHeight: 1.5, textShadow: '0 2px 18px rgba(10,4,12,.9)' }}>
              You are reading <strong style={{ color: '#fff' }}>{reading.book?.title}</strong>
              {reading.book?.pages ? `, page ${Math.round(reading.progress || 0)} of ${reading.book.pages}` : ''}.
            </p>
          ) : (
            <p style={{ color: 'rgba(255, 233, 240, 0.85)', fontSize: 17, lineHeight: 1.5, textShadow: '0 2px 18px rgba(10,4,12,.9)' }}>
              {hasBooks ? 'Nothing on the nightstand tonight.' : 'Your sky is empty. Shelve a book and it becomes your first star.'}
            </p>
          )}
          <div className="row wrap">
            {reading ? (
              <Link className="btn btn-glow btn-sm" href={`/book/${reading.book_id}`}>Continue reading</Link>
            ) : (
              <Link className="btn btn-glow btn-sm" href={hasBooks ? '/library' : '/discover'}>{hasBooks ? 'Choose a book' : 'Find a book'}</Link>
            )}
            <Link className="btn btn-line btn-sm" href="/constellation">Open the sky</Link>
          </div>
        </div>
      </section>

      <div className="page">
        <ErrorNote message={error} />
        {analytics.loading || library.loading ? <Loading /> : (
          <>
            <Reveal className="stats-row">
              <div className="stat-cell"><span className="eyebrow">Books this year</span><span className="stat">{a.booksReadCount}</span></div>
              <div className="stat-cell"><span className="eyebrow">Pages</span><span className="stat">{a.totalPages.toLocaleString()}</span></div>
              <div className="stat-cell"><span className="eyebrow">Day streak</span><span className="stat">{a.streak.current}</span></div>
              <div className="stat-cell"><span className="eyebrow">Best streak</span><span className="stat">{a.streak.longest}</span></div>
            </Reveal>

            <Reveal className="stack" style={{ gap: 18 }}>
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <h2 className="h-sec">{goal ? <>{goal.current} of {goal.target} books</> : 'Your yearly goal'}</h2>
                {!goal && <Link className="link-arrow" href="/profile" style={{ fontWeight: 600 }}>Set a goal</Link>}
              </div>
              {goal ? (
                <>
                  <Pearls total={Math.min(goal.target, 60)} filled={Math.min(goal.current, goal.target, 60)} size={24} gap={6} />
                  <p className="muted" style={{ fontSize: 14 }}>{Math.max(0, goal.target - goal.current)} more pearls by 31 December.</p>
                </>
              ) : (
                <p className="muted">Set a target and every finished book becomes a pearl on your necklace.</p>
              )}
            </Reveal>

            <Reveal className="stack" style={{ gap: 14 }}>
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <h2 className="h-sec">Reading activity</h2>
                <span className="muted" style={{ fontSize: 13 }}>Last 26 weeks</span>
              </div>
              <Heatmap data={a.heatmapData} today={today} />
            </Reveal>

            <Reveal className="stack" style={{ gap: 6 }}>
              <div className="row-between" style={{ alignItems: 'baseline', marginBottom: 12 }}>
                <h2 className="h-sec">Recent inscriptions</h2>
                <Link className="link-arrow" href="/journal/new" style={{ fontWeight: 600 }}>Write a new one</Link>
              </div>
              {inscriptions.length === 0 ? (
                <p className="muted" style={{ padding: '16px 0' }}>Nothing written yet. Open a book and say what you thought.</p>
              ) : (
                <div>
                  {inscriptions.map((entry) => {
                    const book = bookById.get(entry.book_id);
                    return (
                      <article key={entry.id} className="entry">
                        <div className="stack" style={{ gap: 4 }}>
                          <Link href={`/book/${entry.book_id}`} style={{ fontWeight: 600 }}>{book?.title || 'A book'}</Link>
                          <span className="muted" style={{ fontSize: 13 }}>{entry.page_number ? `Page ${entry.page_number}` : new Date(entry.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="stack" style={{ gap: 10 }}>
                          <p className="quote">{entry.quote || entry.content}</p>
                          <div className="row wrap" style={{ gap: 6 }}>{(entry.tags || []).map((t) => <span key={t} className="tag">{t}</span>)}</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Reveal>
          </>
        )}
      </div>
    </>
  );
}
