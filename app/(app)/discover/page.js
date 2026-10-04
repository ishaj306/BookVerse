'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cover from '@/components/Cover';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { Rule } from '@/components/ornaments';
import { STATUSES, STATUS_LABELS, api, localToday, titleCase, useApi } from '@/lib/client-api';

const COVER_HEIGHTS = [230, 270, 310, 250, 290];

function coverHeight(book) {
  const seed = [...String(book.title)].reduce((h, c) => h + c.charCodeAt(0), 0);
  return COVER_HEIGHTS[seed % COVER_HEIGHTS.length];
}

function Discover() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get('q') || '').trim();
  const [input, setInput] = useState(q);
  const [added, setAdded] = useState({});
  const [message, setMessage] = useState(null);

  const results = useApi(q.length >= 2 ? `/api/books/search?q=${encodeURIComponent(q)}&maxResults=30` : null);
  const library = useApi('/api/library');

  const inLibrary = new Map((library.data?.data || []).map((ub) => [ub.book_id, ub.status]));
  const books = (results.data?.books || []).filter((b) => b.id);

  function submit(event) {
    event.preventDefault();
    const next = input.trim();
    if (next.length >= 2) router.push(`/discover?q=${encodeURIComponent(next)}`);
  }

  async function shelve(book, status) {
    setMessage(null);
    try {
      await api('/api/library', { method: 'POST', body: { book_id: book.id, status, today: localToday() } });
      setAdded((prev) => ({ ...prev, [book.id]: status }));
    } catch (e) {
      setMessage(e.message);
    }
  }

  return (
    <div className="page">
      <div className="stack center" style={{ gap: 8 }}>
        <span className="eyebrow">Discover</span>
        <h1 className="h-page">Find your next <em className="accent">chapter</em></h1>
      </div>

      <form className="search" onSubmit={submit} role="search" style={{ flex: 'none', height: 60, maxWidth: 720, width: '100%', alignSelf: 'center', background: '#fff', boxShadow: 'inset 0 0 0 1.5px var(--pink-200)' }}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8234B" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input aria-label="Search by title, author or ISBN" placeholder="Title, author or ISBN" value={input} onChange={(e) => setInput(e.target.value)} style={{ fontSize: 17 }} />
        <button className="btn btn-primary btn-sm" type="submit">Search</button>
      </form>

      <ErrorNote message={results.error || message} />
      <Rule />

      {!q && <Empty title="What are you in the mood for?" text="Search for a title, an author or an ISBN. Books you find are saved so the next search is instant." />}
      {results.loading && <Loading label="Searching the stacks…" />}
      {q && !results.loading && !results.error && books.length === 0 && <Empty title="No books found" text="Try a different spelling, or search by author or ISBN." />}

      {books.length > 0 && (
        <>
          <p className="muted" style={{ fontSize: 14 }}>
            {books.length} results{results.data?.source === 'openlibrary' ? ' from Open Library' : ''}
          </p>
          <div className="masonry">
            {books.map((book) => {
              const status = added[book.id] || inLibrary.get(book.id);
              return (
                <article key={book.id} className="card book-card">
                  <Link href={`/book/${book.id}`} aria-label={`Open ${book.title}`}>
                    <Cover book={book} fill height={coverHeight(book)} style={{ borderRadius: '12px 16px 16px 12px' }} />
                  </Link>
                  <div className="stack" style={{ gap: 2, padding: '0 4px' }}>
                    <h3 style={{ fontSize: 22, lineHeight: 1.1 }}>{book.title}</h3>
                    <span className="muted" style={{ fontSize: 13 }}>{book.author}</span>
                  </div>
                  <div className="row-between" style={{ padding: '0 4px 4px', alignItems: 'center' }}>
                    {book.genres?.[0] ? <span className="tag">{titleCase(book.genres[0])}</span> : <span />}
                  </div>
                  {status ? (
                    <div className="notice" style={{ textAlign: 'center' }}>On your shelf · {STATUS_LABELS[status]}</div>
                  ) : (
                    <div>
                      <label className="sr-only" htmlFor={`shelve-${book.id}`}>Shelve {book.title}</label>
                      <select id={`shelve-${book.id}`} className="input" style={{ height: 44, background: 'var(--rose-dark)', color: '#fff', borderColor: 'var(--rose-dark)', fontWeight: 600 }} defaultValue="" onChange={(e) => e.target.value && shelve(book, e.target.value)}>
                        <option value="" disabled>Shelve as…</option>
                        {STATUSES.map((s) => <option key={s} value={s} style={{ color: '#000' }}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="page"><Loading /></div>}>
      <Discover />
    </Suspense>
  );
}
