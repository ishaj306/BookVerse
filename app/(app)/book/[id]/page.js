'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Cover from '@/components/Cover';
import MiniSky from '@/components/MiniSky';
import Reveal from '@/components/Reveal';
import { Empty, ErrorNote, Loading, Skeleton } from '@/components/States';
import Tabs from '@/components/Tabs';
import { Glasses, PearlRating } from '@/components/ornaments';
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
    .map((e) => ({ node: nodes.get(e.source === id ? e.target : e.source), type: e.type }))
    .filter((c) => c.node)
    // one thread per neighbour, preferring the ones you drew yourself
    .sort((a, c) => (c.type === 'manual') - (a.type === 'manual'))
    .filter((c, i, all) => all.findIndex((o) => o.node.id === c.node.id) === i)
    .map((c) => ({ id: c.node.id, title: c.node.title, type: c.type }));

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

  if (book.loading || library.loading) {
    return (
      <div className="page">
        <div className="folio" aria-busy="true">
          <Skeleton h={420} r={12} />
          <div className="stack" style={{ gap: 16 }}><Skeleton w={120} h={12} /><Skeleton w="80%" h={64} r={10} /><Skeleton w={200} h={16} /><Skeleton h={90} r={12} /></div>
        </div>
      </div>
    );
  }
  if (book.error || !b) {
    return <div className="page"><Empty title="Book not found" text="It may have been removed." href="/library" action="Back to the library" /></div>;
  }

  const total = b.pages || 0;
  const progress = Number(entry?.progress || 0);
  const percent = total ? Math.min(100, Math.round((progress / total) * 100)) : 0;
  const statusTabs = STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }));

  return (
    <div className="page">
      <Link href="/library" className="link-back">← The Library</Link>
      <ErrorNote message={message || library.error || journal.error} />

      <div className="folio">
        <div className="folio-cover">
          <div className="folio-book"><Cover book={b} fill interactive /></div>
          <div className="folio-ledge">
            <div className="ledge wood" />
            <div className="folio-glasses"><Glasses width={72} /></div>
          </div>
        </div>

        <div className="stack" style={{ gap: 26 }}>
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">Folio{b.genres?.[0] ? ` · ${titleCase(b.genres[0])}` : ''}{b.publication_date ? ` · ${b.publication_date.slice(0, 4)}` : ''}</span>
            <h1 className="folio-title">{b.title}</h1>
            <p className="folio-author">{b.author}</p>
          </div>

          <div className="stack" style={{ gap: 14 }}>
            <Tabs items={statusTabs} value={entry?.status} onChange={busy ? () => {} : setStatus} label="Reading status" />
            {entry ? (
              <div className="row">
                <PearlRating value={Number(entry.rating || 0)} onChange={busy ? undefined : rate} />
                <span className="num muted" style={{ fontWeight: 600, fontSize: 14 }}>{entry.rating ? `${entry.rating} · your rating` : 'Rate this book'}</span>
              </div>
            ) : (
              <p className="muted">Choose a status to add this book to your library.</p>
            )}
          </div>

          {entry && (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <span className="eyebrow">Progress</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--rose-deep)' }}>
                  {total ? `Page ${Math.round(progress)} of ${total} · ${percent}%` : `Page ${Math.round(progress)}`}
                </span>
              </div>
              {total > 0 && (
                <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
                  <i style={{ width: `${percent}%` }} />
                  <b className="pearl pearl-deep" style={{ left: `${percent}%` }} />
                </div>
              )}
              <form className="row wrap" onSubmit={logSession}>
                <label className="sr-only" htmlFor="pages">Pages read today</label>
                <input id="pages" className="input input-small" style={{ maxWidth: 190 }} inputMode="numeric" placeholder="Pages read today" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ''))} />
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !pages}>Log a session</button>
                <Link className="btn btn-soft btn-sm" href={`/journal/new?book=${id}`}>Inscribe a thought</Link>
              </form>
            </div>
          )}

          {b.description && <p className="folio-blurb">{b.description.replace(/<[^>]+>/g, '')}</p>}
          {entry?.finished_at && <p className="muted" style={{ fontSize: 14 }}>Finished {new Date(entry.finished_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
        </div>
      </div>

      {entry && (
        <>
          <Reveal className="stack" style={{ gap: 6 }}>
            <div className="row-between" style={{ alignItems: 'baseline', marginBottom: 12 }}>
              <h2 className="h-sec">Your inscriptions</h2>
              <Link className="link-arrow" href={`/journal/new?book=${id}`} style={{ fontWeight: 600 }}>New inscription</Link>
            </div>
            {inscriptions.length === 0 ? (
              <p className="muted" style={{ padding: '14px 0' }}>Nothing written yet. What did this book make you think?</p>
            ) : (
              <div>
                {inscriptions.map((e) => (
                  <article key={e.id} className="entry">
                    <div className="stack" style={{ gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{new Date(e.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                      {e.page_number ? <span className="muted" style={{ fontSize: 13 }}>Page {e.page_number}</span> : null}
                    </div>
                    <div className="stack" style={{ gap: 10 }}>
                      {e.quote && <p className="quote">{e.quote}</p>}
                      {e.content && <p style={{ lineHeight: 1.65, maxWidth: '62ch' }}>{e.content}</p>}
                      <div className="row wrap" style={{ gap: 6 }}>
                        {(e.tags || []).map((t) => <span key={t} className="tag">{t}</span>)}
                        <button type="button" className="link-quiet" onClick={() => removeInscription(e.id)} aria-label="Delete this inscription">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Reveal>

          <Reveal className="stack" style={{ gap: 16 }}>
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <h2 className="h-sec">Threads</h2>
              <Link className="link-arrow" href="/constellation" style={{ fontWeight: 600 }}>Open the whole sky</Link>
            </div>
            {connected.length === 0 ? (
              <p className="muted">Tag your inscriptions and this book will start to join up with others.</p>
            ) : (
              <MiniSky center={{ id, title: b.title }} neighbors={connected} />
            )}
          </Reveal>

          <button type="button" className="link-quiet" style={{ alignSelf: 'flex-start' }} onClick={removeBook} disabled={busy}>Remove from library</button>
        </>
      )}
    </div>
  );
}
