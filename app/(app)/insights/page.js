'use client';

import Link from 'next/link';
import { useState } from 'react';
import Heatmap from '@/components/Heatmap';
import { ErrorNote, Loading } from '@/components/States';
import { PearlRating } from '@/components/ornaments';
import { localToday, titleCase, useApi } from '@/lib/client-api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GENRE_COLORS = ['#A8234B', '#C8375F', '#EE9FB8', '#F5C2D2', '#C9A070', '#A0714A'];

export default function Insights() {
  const today = localToday();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const analytics = useApi(`/api/analytics?year=${year}&today=${today}`);
  const insights = useApi('/api/insights');

  const a = analytics.data;
  const months = (a?.monthlyStats || []).slice(0, year === thisYear ? Number(today.slice(5, 7)) : 12);
  const maxBooks = Math.max(1, ...months.map((m) => m.booksRead));
  const genres = (a?.genreBreakdown || []).slice(0, 6);
  const genreTotal = genres.reduce((sum, g) => sum + g.count, 0) || 1;
  const phases = insights.data?.phases || [];

  return (
    <div className="page">
      <div className="row-between">
        <div>
          <span className="eyebrow">{year === thisYear ? `${year} so far` : year}</span>
          <h1 className="h-page">Your reading, <em className="accent">in pearls</em></h1>
        </div>
        <div className="row" role="group" aria-label="Year">
          <button type="button" className="chip" onClick={() => setYear(year - 1)} aria-label="Previous year">‹ {year - 1}</button>
          <button type="button" className="chip" disabled={year >= thisYear} onClick={() => setYear(year + 1)} aria-label="Next year">{year + 1} ›</button>
        </div>
      </div>
      <ErrorNote message={analytics.error || insights.error} />

      {analytics.loading || !a ? <Loading /> : (
        <>
          <div className="grid g-4 g-keep-2" style={{ gap: 16 }}>
            <div className="card-pink"><span className="eyebrow">Books read</span><div className="stat" style={{ fontSize: 56, marginTop: 6 }}>{a.booksReadCount}</div></div>
            <div className="card"><span className="eyebrow">Pages</span><div className="stat" style={{ fontSize: 56, marginTop: 6 }}>{a.totalPages.toLocaleString()}</div></div>
            <div className="card stack" style={{ gap: 8 }}>
              <span className="eyebrow">Average rating</span>
              <PearlRating value={a.averageRating || 0} size={20} />
              <div className="stat" style={{ fontSize: 30 }}>{a.averageRating ?? '–'}</div>
            </div>
            <div className="card-soft"><span className="eyebrow">Longest streak</span><div className="stat" style={{ fontSize: 56, marginTop: 6 }}>{a.streak.longest}<span className="muted" style={{ fontSize: 22 }}> days</span></div></div>
          </div>

          <div className="grid g-main">
            <section className="card stack" style={{ gap: 18 }}>
              <div className="row-between" style={{ alignItems: 'baseline' }}><h3 style={{ fontSize: 30 }}>Books per month</h3><span className="muted" style={{ fontSize: 13 }}>{a.totalMinutes ? `${Math.round(a.totalMinutes / 60)} hours read` : ''}</span></div>
              <div className="bars" role="img" aria-label="Books finished each month">
                {months.map((m) => (
                  <div key={m.month} className="bar">
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-deep)' }}>{m.booksRead}</span>
                    <i style={{ height: 24 + (m.booksRead / maxBooks) * 190 }} />
                  </div>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'space-between', padding: '0 6px', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                {months.map((m) => <span key={m.month} style={{ flex: 1, textAlign: 'center' }}>{MONTHS[m.month - 1]}</span>)}
              </div>
            </section>

            <section className="card stack" style={{ gap: 16 }}>
              <h3 style={{ fontSize: 30 }}>By genre</h3>
              {genres.length === 0 && <p className="muted">Finish a book to see your genres.</p>}
              {genres.map((g, i) => (
                <div key={g.genre} className="stack" style={{ gap: 6 }}>
                  <div className="row-between" style={{ alignItems: 'baseline', fontSize: 14, fontWeight: 600 }}><span>{titleCase(g.genre)}</span><span className="num muted">{Math.round((g.count / genreTotal) * 100)}%</span></div>
                  <div className="meter"><i style={{ width: `${(g.count / genreTotal) * 100}%`, background: GENRE_COLORS[i % GENRE_COLORS.length] }} /></div>
                </div>
              ))}
            </section>
          </div>

          <div className="grid g-main">
            <section className="card stack">
              <h3 style={{ fontSize: 30 }}>Your reading activity</h3>
              <Heatmap data={a.heatmapData} today={year === thisYear ? today : `${year}-12-31`} />
              {a.pagesPerActiveDay > 0 && <p className="muted" style={{ fontSize: 14 }}>About {a.pagesPerActiveDay} pages on the days you read.</p>}
            </section>
            <section className="card-pink stack" style={{ gap: 14 }}>
              <span className="eyebrow">A pattern we noticed</span>
              <p className="quote" style={{ fontSize: 30 }}>{insights.data?.headline || 'Tag your inscriptions and finish a few books. Patterns show up here.'}</p>
              <div className="pstring" />
              <Link className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} href="/constellation">See your constellation</Link>
            </section>
          </div>

          {phases.length > 0 && (
            <section className="stack" style={{ gap: 16 }}>
              <h2 className="h-sec">Your reading phases</h2>
              <div className="grid g-4">
                {phases.slice(0, 4).map((p) => (
                  <article key={p.period} className="card stack" style={{ gap: 8 }}>
                    <span className="eyebrow">{p.period.replace('-', ' ')}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{p.books} {p.books === 1 ? 'book' : 'books'}</span>
                    <div className="row wrap" style={{ gap: 6 }}>{p.topTags.length ? p.topTags.map((t) => <span key={t.tag} className="tag">{t.tag}</span>) : <span className="muted" style={{ fontSize: 13 }}>No tags</span>}</div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
