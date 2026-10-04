'use client';

import Link from 'next/link';
import Cover from '@/components/Cover';
import Heatmap from '@/components/Heatmap';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { Pearls, Rule } from '@/components/ornaments';
import { localToday, useApi } from '@/lib/client-api';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const today = localToday();
  const user = useApi('/api/user');
  const analytics = useApi(`/api/analytics?today=${today}`);
  const library = useApi('/api/library');
  const journal = useApi('/api/journal?limit=3');

  const error = analytics.error || library.error || journal.error;
  if (analytics.loading || library.loading) return <div className="page"><Loading /></div>;

  const a = analytics.data;
  const books = library.data?.data || [];
  const bookById = new Map(books.map((ub) => [ub.book_id, ub.book]));
  const name = (user.data?.data?.name || '').split(' ')[0];
  const reading = a?.currentlyReading?.[0];
  const goal = (a?.goals || []).find((g) => g.type === 'yearly_books');
  const inscriptions = journal.data?.data || [];

  return (
    <div className="page">
      <ErrorNote message={error} />

      <div className="stack">
        <div className="row-between">
          <div>
            <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
            <h1 className="h-page">{greeting()}{name ? <>, <em className="accent">{name}</em></> : null}</h1>
          </div>
          <Link className="btn btn-soft btn-stack-m" href="/discover">Add a book</Link>
        </div>
        <Rule />
      </div>

      {books.length === 0 ? (
        <Empty
          title="Your manuscript is empty"
          text="Search for a book to shelve your first one, or import your Goodreads library from your profile."
          href="/discover"
          action="Find a book"
        />
      ) : (
        <>
          <div className="grid g-main">
            <section className="card stack" style={{ gap: 20 }}>
              <div className="row-between">
                <div className="stack" style={{ gap: 6 }}>
                  <span className="eyebrow">Your {a.year} necklace</span>
                  {goal ? (
                    <h2 className="h-sec">{goal.current} of {goal.target} books strung</h2>
                  ) : (
                    <h2 className="h-sec">{a.booksReadCount} books this year</h2>
                  )}
                </div>
                {goal && <div className="stat" style={{ fontSize: 56, color: 'var(--rose-dark)' }}>{Math.min(100, Math.round((goal.current / goal.target) * 100))}%</div>}
              </div>
              {goal ? (
                <>
                  <Pearls total={Math.min(goal.target, 60)} filled={Math.min(goal.current, goal.target, 60)} size={24} gap={6} />
                  <p className="muted" style={{ fontSize: 14 }}>
                    {Math.max(0, goal.target - goal.current)} more pearls by 31 December.
                  </p>
                </>
              ) : (
                <>
                  <p className="muted">Set a yearly goal and every finished book becomes a pearl on your necklace.</p>
                  <Link className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} href="/profile">Set a goal</Link>
                </>
              )}
            </section>

            <section className="card-pink row" style={{ gap: 20, alignItems: 'center' }}>
              {reading ? (
                <>
                  <Cover book={reading.book} width={110} height={165} />
                  <div className="stack" style={{ gap: 10 }}>
                    <span className="eyebrow">Currently reading</span>
                    <h3 style={{ fontSize: 32 }}>{reading.book?.title}</h3>
                    {reading.book?.pages ? (
                      <>
                        <p className="muted" style={{ fontSize: 14 }}>Page {Math.round(reading.progress || 0)} of {reading.book.pages}</p>
                        <Pearls total={9} filled={Math.round(Math.min(1, (reading.progress || 0) / reading.book.pages) * 9)} size={14} />
                      </>
                    ) : (
                      <p className="muted" style={{ fontSize: 14 }}>Page {Math.round(reading.progress || 0)}</p>
                    )}
                    <Link className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} href={`/book/${reading.book_id}`}>Continue</Link>
                  </div>
                </>
              ) : (
                <div className="stack">
                  <span className="eyebrow">Currently reading</span>
                  <p className="muted">Nothing on the nightstand right now.</p>
                  <Link className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} href="/library">Choose a book</Link>
                </div>
              )}
            </section>
          </div>

          <div className="grid g-main">
            <section className="card stack">
              <div className="row-between"><h3 style={{ fontSize: 30 }}>Your reading activity</h3><span className="muted" style={{ fontSize: 13 }}>Last 26 weeks</span></div>
              <Heatmap data={a.heatmapData} today={today} />
            </section>
            <section className="grid g-keep-2" style={{ gap: 14, alignContent: 'start' }}>
              <div className="card"><span className="eyebrow">Books</span><div className="stat" style={{ fontSize: 44, marginTop: 6 }}>{a.booksReadCount}</div></div>
              <div className="card"><span className="eyebrow">Pages</span><div className="stat" style={{ fontSize: 44, marginTop: 6 }}>{a.totalPages.toLocaleString()}</div></div>
              <div className="card"><span className="eyebrow">Day streak</span><div className="stat" style={{ fontSize: 44, marginTop: 6 }}>{a.streak.current}</div></div>
              <div className="card"><span className="eyebrow">Best streak</span><div className="stat" style={{ fontSize: 44, marginTop: 6 }}>{a.streak.longest}</div></div>
            </section>
          </div>

          <section className="stack" style={{ gap: 18 }}>
            <div className="row-between"><h2 className="h-sec">Recent inscriptions</h2><Link href="/journal/new" style={{ fontWeight: 600 }}>Write a new one</Link></div>
            {inscriptions.length === 0 ? (
              <div className="card-soft muted">No inscriptions yet. Open a book and write down what you thought.</div>
            ) : (
              <div className="grid g-3">
                {inscriptions.map((entry, i) => {
                  const book = bookById.get(entry.book_id);
                  return (
                    <article key={entry.id} className={i % 2 === 0 ? 'card-pink stack' : 'card stack'}>
                      <span className="eyebrow">{book?.title || 'A book'}{entry.page_number ? ` · p. ${entry.page_number}` : ''}</span>
                      <p className="quote">{entry.quote || entry.content}</p>
                      <div className="row wrap">{(entry.tags || []).map((t) => <span key={t} className={i % 2 === 0 ? 'tag tag-white' : 'tag'}>{t}</span>)}</div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
