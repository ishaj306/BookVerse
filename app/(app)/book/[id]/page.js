'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Cover from '@/components/Cover';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { Glasses, Bow, Pearls, PearlRating, Rule } from '@/components/ornaments';
import { STATUSES, STATUS_LABELS, api, localToday, titleCase, useApi } from '@/lib/client-api';

export default function Folio() {
  const { id } = useParams();
  const router = useRouter();
  const book = useApi(`/api/books/${id}`);
  const library = useApi('/api/library');
  const journal = useApi(`/api/journal?book_id=${id}`);
  const graph = useApi('/api/constellation');

  const [pages, setPages] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const b = book.data;
  const entry = (library.data?.data || []).find((ub) => ub.book_id === id);
  const inscriptions = journal.data?.data || [];

  const nodes = new Map((graph.data?.nodes || []).map((n) => [n.id, n]));
  const connected = (graph.data?.edges || [])
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({ node: nodes.get(e.source === id ? e.target : e.source), type: e.type, weight: e.weight }))
    .filter((c) => c.node);

  async function run(action) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      library.reload();
      journal.reload();
      graph.reload();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status) =>
    run(() =>
      entry
        ? api('/api/library', { method: 'PATCH', body: { id: entry.id, status, today: localToday() } })
        : api('/api/library', { method: 'POST', body: { book_id: id, status, today: localToday() } })
    );

  const rate = (rating) => run(() => api('/api/library', { method: 'PATCH', body: { id: entry.id, rating: rating || null } }));

  function logSession(event) {
    event.preventDefault();
    const n = parseInt(pages, 10);
    if (!n || n < 1) return;
    run(async () => {
      await api('/api/sessions', { method: 'POST', body: { book_id: id, pages_read: n, session_date: localToday(), today: localToday() } });
      setPages('');
    });
  }

  const removeInscription = (entryId) => run(() => api('/api/journal', { method: 'DELETE', body: { id: entryId } }));

  async function removeBook() {
    if (!entry || !window.confirm('Remove this book from your library? Its connections will be removed too.')) return;
    await run(() => api('/api/library', { method: 'DELETE', body: { id: entry.id } }));
    router.push('/library');
  }

  if (book.loading || library.loading) return <div className="page"><Loading /></div>;
  if (book.error || !b) {
    return <div className="page"><Empty title="Book not found" text="It may have been removed." href="/library" action="Back to the library" /></div>;
  }

  const total = b.pages || 0;
  const progress = Number(entry?.progress || 0);
  const filled = total ? Math.round(Math.min(1, progress / total) * 20) : 0;

  return (
    <div className="page">
      <Link href="/library" style={{ fontWeight: 600, fontSize: 14 }}>← Back to the Library</Link>
      <ErrorNote message={message || library.error || journal.error} />

      <div className="grid g-folio">
        <div className="card-pink" style={{ padding: '40px 40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
          <Cover book={b} width={240} height={360} />
          <div className="row-between" style={{ width: '100%', padding: '10px 0 4px', alignItems: 'flex-end' }}>
            <Glasses width={80} />
            <Bow width={52} />
          </div>
          <div className="shelf wood" style={{ width: 'calc(100% + 80px)', margin: '0 -40px' }} />
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Folio{b.genres?.[0] ? ` · ${titleCase(b.genres[0])}` : ''}{b.publication_date ? ` · ${b.publication_date.slice(0, 4)}` : ''}</span>
            <h1 style={{ fontSize: 'clamp(44px, 7vw, 84px)', lineHeight: 0.95 }}>{b.title}</h1>
            <p className="muted" style={{ fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{b.author}</p>
          </div>

          {entry && (
            <div className="row">
              <PearlRating value={Number(entry.rating || 0)} onChange={busy ? undefined : rate} />
              <span className="num muted" style={{ fontWeight: 600 }}>{entry.rating ? `${entry.rating} · your rating` : 'Rate this book'}</span>
            </div>
          )}

          <div className="row wrap" role="group" aria-label="Reading status">
            {STATUSES.map((s) => (
              <button key={s} type="button" disabled={busy} className={`chip ${entry?.status === s ? 'chip-on' : ''}`} aria-pressed={entry?.status === s} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {entry ? (
            <div className="card stack">
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <span className="eyebrow">Progress</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--rose-deep)' }}>
                  {total ? `Page ${Math.round(progress)} of ${total} · ${Math.min(100, Math.round((progress / total) * 100))}%` : `Page ${Math.round(progress)}`}
                </span>
              </div>
              {total > 0 && <Pearls total={20} filled={filled} size={20} gap={5} />}
              <form className="row wrap" onSubmit={logSession}>
                <label className="sr-only" htmlFor="pages">Pages read today</label>
                <input id="pages" className="input" style={{ maxWidth: 200, height: 44 }} inputMode="numeric" placeholder="Pages read today" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ''))} />
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !pages}>Log a session</button>
                <Link className="btn btn-soft btn-sm" href={`/journal/new?book=${id}`}>Inscribe a thought</Link>
              </form>
            </div>
          ) : (
            <div className="notice">Choose a status above to add this book to your library.</div>
          )}

          {b.description && <p style={{ lineHeight: 1.65, maxWidth: 620 }}>{b.description.replace(/<[^>]+>/g, '')}</p>}
        </div>
      </div>

      <Rule />

      {entry && (
        <section className="stack" style={{ gap: 20 }}>
          <div className="row-between" style={{ alignItems: 'baseline' }}>
            <h2 className="h-sec">Your inscriptions</h2>
            <Link className="btn btn-soft btn-sm" href={`/journal/new?book=${id}`}>New inscription</Link>
          </div>
          {inscriptions.length === 0 ? (
            <div className="card-soft muted">Nothing written yet. What did this book make you think?</div>
          ) : (
            <div className="grid g-3" style={{ alignItems: 'start' }}>
              {inscriptions.map((e, i) => (
                <article key={e.id} className={i % 3 === 0 ? 'card-pink stack' : i % 3 === 1 ? 'card stack' : 'card-soft stack'}>
                  <span className="eyebrow">{new Date(e.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{e.page_number ? ` · p. ${e.page_number}` : ''}</span>
                  {e.quote && <p className="quote quote-bar">{e.quote}</p>}
                  {e.content && <p style={{ lineHeight: 1.6 }}>{e.content}</p>}
                  <div className="row wrap">{(e.tags || []).map((t) => <span key={t} className="tag">{t}</span>)}</div>
                  <button type="button" className="tag" style={{ alignSelf: 'flex-start' }} onClick={() => removeInscription(e.id)} aria-label="Delete this inscription">Delete</button>
                </article>
              ))}
            </div>
          )}

          <div className="card row wrap" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 6, flex: '1 1 260px' }}>
              <span className="eyebrow">Connected books</span>
              <h3 style={{ fontSize: 28 }}>Threads to other pearls</h3>
            </div>
            <div className="row wrap" style={{ flex: '2 1 300px' }}>
              {connected.length === 0 && <span className="muted">Tag your inscriptions to grow threads between books.</span>}
              {connected.map((c) => (
                <Link key={c.node.id} className="chip" href={`/book/${c.node.id}`}>
                  <span className={`pearl ${c.type === 'manual' ? 'pearl-deep' : 'pearl-rose'}`} />
                  {c.node.title}
                </Link>
              ))}
            </div>
            <Link className="btn btn-ghost btn-sm" href="/constellation">See in constellation</Link>
          </div>

          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={removeBook} disabled={busy}>Remove from library</button>
        </section>
      )}
    </div>
  );
}
