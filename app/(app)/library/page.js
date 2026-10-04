'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Bookcase from '@/components/Bookcase';
import PageHead from '@/components/PageHead';
import { Empty, ErrorNote, Loading } from '@/components/States';
import Tabs from '@/components/Tabs';
import { STATUSES, STATUS_LABELS, api, useApi } from '@/lib/client-api';

export default function Library() {
  const library = useApi('/api/library');
  const shelves = useApi('/api/shelves');
  const [status, setStatus] = useState('all');
  const [shelfId, setShelfId] = useState(null);
  const [adding, setAdding] = useState(false);
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
      setAdding(false);
      setMessage(null);
      shelves.reload();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const tabs = [{ id: 'all', label: 'All', count: counts.all }, ...STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s], count: counts[s] }))];

  return (
    <div className="page">
      <PageHead eyebrow="Your manuscript" title="The Library">
        <Link className="btn btn-primary btn-sm" href="/discover">Add a book</Link>
      </PageHead>

      <ErrorNote message={library.error || shelves.error || message} />

      {library.loading ? <Loading variant="shelf" /> : (
        <>
          <Tabs items={tabs} value={status} onChange={setStatus} label="Filter by reading status" />

          <div className="pillrow pillrow-scroll" role="group" aria-label="Filter by shelf">
            <span className="eyebrow" style={{ marginRight: 4 }}>Shelves</span>
            <button type="button" className={`chip chip-small ${!shelfId ? 'chip-on' : ''}`} onClick={() => setShelfId(null)}>All books</button>
            {(shelves.data?.data || []).map((s) => (
              <button key={s.id} type="button" className={`chip chip-small ${shelfId === s.id ? 'chip-on' : ''}`} onClick={() => setShelfId(shelfId === s.id ? null : s.id)}>
                {s.name} <span className="num" style={{ opacity: 0.7 }}>{s.book_count}</span>
              </button>
            ))}
            {adding ? (
              <form className="row" style={{ gap: 6 }} onSubmit={createShelf}>
                <label className="sr-only" htmlFor="new-shelf">New shelf name</label>
                <input id="new-shelf" className="input input-small" autoFocus placeholder="Shelf name" value={newShelf} onChange={(e) => setNewShelf(e.target.value)} maxLength={80} />
                <button className="btn btn-soft btn-sm" type="submit">Add</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </form>
            ) : (
              <button type="button" className="chip chip-small chip-outline" onClick={() => setAdding(true)}>+ New shelf</button>
            )}
          </div>

          {visible.length === 0 ? (
            <Empty
              title={all.length === 0 ? 'No books yet' : 'Nothing on this shelf'}
              text={all.length === 0 ? 'Search for your first book, or import your Goodreads library from your profile.' : 'Try another status or shelf.'}
              href={all.length === 0 ? '/discover' : undefined}
              action="Find a book"
            />
          ) : (
            <Bookcase key={`${status}-${shelfId}`} books={visible} hrefFor={(b) => `/book/${b.id}`} />
          )}
        </>
      )}
    </div>
  );
}
