'use client';

import { useMemo, useState } from 'react';
import Bookcase from '@/components/Bookcase';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { Rule } from '@/components/ornaments';
import { STATUSES, STATUS_LABELS, api, useApi } from '@/lib/client-api';

export default function Library() {
  const library = useApi('/api/library');
  const shelves = useApi('/api/shelves');
  const [status, setStatus] = useState('all');
  const [shelfId, setShelfId] = useState(null);
  const [newShelf, setNewShelf] = useState('');
  const [message, setMessage] = useState(null);
  const shelfBooks = useApi(shelfId ? `/api/shelves/${shelfId}/books` : null);

  const all = useMemo(() => library.data?.data || [], [library.data]);
  const counts = useMemo(() => {
    const c = { all: all.length };
    for (const s of STATUSES) c[s] = all.filter((ub) => ub.status === s).length;
    return c;
  }, [all]);

  const shelfIds = useMemo(
    () => (shelfId && shelfBooks.data ? new Set(shelfBooks.data.data.map((sb) => sb.book_id)) : null),
    [shelfId, shelfBooks.data]
  );

  const visible = all
    .filter((ub) => status === 'all' || ub.status === status)
    .filter((ub) => !shelfIds || shelfIds.has(ub.book_id))
    .map((ub) => ub.book)
    .filter(Boolean);

  async function createShelf(event) {
    event.preventDefault();
    if (!newShelf.trim()) return;
    try {
      await api('/api/shelves', { method: 'POST', body: { name: newShelf } });
      setNewShelf('');
      setMessage(null);
      shelves.reload();
    } catch (e) {
      setMessage(e.message);
    }
  }

  if (library.loading) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <ErrorNote message={library.error || shelves.error || message} />
      <div className="row-between">
        <div><span className="eyebrow">Your manuscript</span><h1 className="h-page">The Library</h1></div>
        <div className="row wrap" role="tablist" aria-label="Filter by status">
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} className={`chip ${status === s ? 'chip-on' : ''}`} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]} · {counts[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid g-side">
        <aside className="card stack">
          <h3 style={{ fontSize: 28 }}>Shelves</h3>
          <div className="ribbon-strip" style={{ height: 8 }} />
          <button type="button" className={`shelf-item ${!shelfId ? 'on' : ''}`} onClick={() => setShelfId(null)}>
            <span className="pearl pearl-deep" />All books<span className="count num">{all.length}</span>
          </button>
          {(shelves.data?.data || []).map((s) => (
            <button key={s.id} type="button" className={`shelf-item ${shelfId === s.id ? 'on' : ''}`} onClick={() => setShelfId(s.id)}>
              <span className="pearl pearl-rose" />{s.name}<span className="count num">{s.book_count}</span>
            </button>
          ))}
          <form className="stack" style={{ gap: 8 }} onSubmit={createShelf}>
            <label className="sr-only" htmlFor="new-shelf">New shelf name</label>
            <input id="new-shelf" className="input" style={{ height: 44 }} placeholder="New shelf name" value={newShelf} onChange={(e) => setNewShelf(e.target.value)} maxLength={80} />
            <button className="btn btn-soft btn-sm" type="submit">New shelf</button>
          </form>
        </aside>

        <section className="stack" style={{ gap: 24 }}>
          {visible.length === 0 ? (
            <Empty
              title={all.length === 0 ? 'No books yet' : 'Nothing on this shelf'}
              text={all.length === 0 ? 'Search for your first book, or import your Goodreads library from your profile.' : 'Try another status or shelf.'}
              href={all.length === 0 ? '/discover' : undefined}
              action="Find a book"
            />
          ) : (
            <Bookcase books={visible} hrefFor={(b) => `/book/${b.id}`} />
          )}
          <Rule />
        </section>
      </div>
    </div>
  );
}
