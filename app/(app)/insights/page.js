'use client';

import Link from 'next/link';
import { useState } from 'react';
import Heatmap from '@/components/Heatmap';
import PageHead from '@/components/PageHead';
import Reveal from '@/components/Reveal';
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
      <PageHead eyebrow={year === thisYear ? `${year} so far` : String(year)} title={<>Your reading, <em className="accent">in pearls</em></>}>
        <button type="button" className="chip chip-small chip-outline" onClick={() => setYear(year - 1)} aria-label="Previous year">‹ {year - 1}</button>
        <button type="button" className="chip chip-small chip-outline" disabled={year >= thisYear} onClick={() => setYear(year + 1)} aria-label="Next year">{year + 1} ›</button>
      </PageHead>
      <ErrorNote message={analytics.error || insights.error} />

      {analytics.loading || !a ? <Loading /> : (
        <>
          <Reveal className="stats-row">
            <div className="stat-cell"><span className="eyebrow">Books read</span><span className="stat">{a.booksReadCount}</span></div>
            <div className="stat-cell"><span className="eyebrow">Pages</span><span className="stat">{a.totalPages.toLocaleString()}</span></div>
            <div className="stat-cell">
              <span className="eyebrow">Average rating</span>
              <span className="stat">{a.averageRating ?? '–'}</span>
              <PearlRating value={a.averageRating || 0} size={14} />
            </div>
            <div className="stat-cell"><span className="eyebrow">Longest streak</span><span className="stat">{a.streak.longest}<span className="stat-unit"> days</span></span></div>
          </Reveal>

          <div className="grid g-main">
            <Reveal className="stack" style={{ gap: 18 }}>
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <h2 className="h-sec">Books per month</h2>
                <span className="muted" style={{ fontSize: 13 }}>{a.totalMinutes ? `${Math.round(a.totalMinutes / 60)} hours read` : ''}</span>
              </div>
              <div className="bars" role="img" aria-label="Books finished each month">
                {months.map((m) => (
                  <div key={m.month} className="bar">
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-deep)' }}>{m.booksRead}</span>
                    <i style={{ height: 22 + (m.booksRead / maxBooks) * 170 }} />
                  </div>
                ))}
              </div>
              <div className="bar-labels">
                {months.map((m) => <span key={m.month}>{MONTHS[m.month - 1]}</span>)}
              </div>
            </Reveal>

            <Reveal className="stack" style={{ gap: 18 }}>
              <h2 className="h-sec">By genre</h2>
              {genres.length === 0 && <p className="muted">Finish a book to see your genres.</p>}
              <div className="stack" style={{ gap: 16 }}>
                {genres.map((g, i) => (
                  <div key={g.genre} className="stack" style={{ gap: 6 }}>
                    <div className="row-between" style={{ alignItems: 'baseline', fontSize: 15, fontWeight: 600 }}><span>{titleCase(g.genre)}</span><span className="num muted">{Math.round((g.count / genreTotal) * 100)}%</span></div>
                    <div className="meter"><i style={{ width: `${(g.count / genreTotal) * 100}%`, background: GENRE_COLORS[i % GENRE_COLORS.length] }} /></div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal className="stack" style={{ gap: 14 }}>
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <h2 className="h-sec">Reading activity</h2>
              {a.pagesPerActiveDay > 0 && <span className="muted" style={{ fontSize: 13 }}>About {a.pagesPerActiveDay} pages on the days you read</span>}
            </div>
            <Heatmap data={a.heatmapData} today={year === thisYear ? today : `${year}-12-31`} />
          </Reveal>

          <Reveal className="night-band">
            <span className="eyebrow">A pattern we noticed</span>
            <p className="night-quote">{insights.data?.headline || 'Tag your inscriptions and finish a few books. Patterns show up here.'}</p>
            <Link className="btn btn-glow btn-sm" href="/constellation">See it in your constellation</Link>
          </Reveal>

          {phases.length > 0 && (
            <Reveal className="stack" style={{ gap: 28 }}>
              <h2 className="h-sec">Your reading phases</h2>
              <div className="timeline">
                {phases.slice(0, 4).map((p) => (
                  <article key={p.period} className="phase">
                    <span className="eyebrow">{p.period.replace('-', ' ')}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{p.books} {p.books === 1 ? 'book' : 'books'}</span>
                    <div className="row wrap" style={{ gap: 6 }}>{p.topTags.length ? p.topTags.map((t) => <span key={t.tag} className="tag">{t.tag}</span>) : <span className="muted" style={{ fontSize: 13 }}>No tags</span>}</div>
                  </article>
                ))}
              </div>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
