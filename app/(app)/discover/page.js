'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cover from '@/components/Cover';
import PageHead from '@/components/PageHead';
import { Empty, ErrorNote, Loading, Skeleton } from '@/components/States';
import { STATUSES, STATUS_LABELS, api, localToday, titleCase, useApi } from '@/lib/client-api';

const SUGGESTIONS = ['gothic', 'slow burn romance', 'mythology', 'poetry', 'dark academia', 'classics'];

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
      <PageHead eyebrow="Discover" title={<>Find your next <em className="accent">chapter</em></>} />

      <form className="big-search" onSubmit={submit} role="search">
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input aria-label="Search by title, author or ISBN" placeholder="A title, an author, an ISBN…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary btn-sm" type="submit">Search</button>
      </form>

      <div className="pillrow pillrow-scroll" aria-label="Ideas to start with">
        <span className="eyebrow" style={{ marginRight: 4 }}>Try</span>
        {SUGGESTIONS.map((s) => (
          <Link key={s} className="chip chip-small chip-outline" href={`/discover?q=${encodeURIComponent(s)}`}>{s}</Link>
        ))}
      </div>

      <ErrorNote message={results.error || message} />

      {!q && (
        <Empty title="What are you in the mood for?" text="Search for a title, an author or an ISBN. Books you find are saved, so the next search is instant." />
      )}

      {results.loading && (
        <div className="masonry" aria-busy="true">
          {[300, 240, 280, 220, 300, 260, 240, 290].map((h, i) => (
            <div key={i} className="stack" style={{ gap: 10 }}><Skeleton h={h} r={10} /><Skeleton w="70%" h={14} /><Skeleton w="45%" h={12} /></div>
          ))}
          <span className="sr-only" role="status">Searching the stacks…</span>
        </div>
      )}

      {q && !results.loading && !results.error && books.length === 0 && (
        <Empty title="No books found" text="Try a different spelling, or search by author or ISBN." />
      )}

      {books.length > 0 && (
        <>
          <p className="muted" style={{ fontSize: 14 }}>
            {books.length} results for “{q}”{results.data?.source === 'openlibrary' ? ' · from Open Library' : ''}
          </p>
          <div className="masonry">
            {books.map((book, i) => {
              const status = added[book.id] || inLibrary.get(book.id);
              return (
                <figure key={book.id} className="book-fig rise" style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}>
                  <Link href={`/book/${book.id}`} aria-label={`Open ${book.title}`}>
                    <Cover book={book} fill interactive />
                  </Link>
                  <figcaption>
                    <h3>{book.title}</h3>
                    <span className="muted">{book.author}{book.genres?.[0] ? ` · ${titleCase(book.genres[0])}` : ''}</span>
                    {status ? (
                      <span className="shelved">✓ {STATUS_LABELS[status]}</span>
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`shelve-${book.id}`}>Shelve {book.title}</label>
                        <select id={`shelve-${book.id}`} className="shelve-select" defaultValue="" onChange={(e) => e.target.value && shelve(book, e.target.value)}>
                          <option value="" disabled>Shelve as…</option>
                          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </>
                    )}
                  </figcaption>
                </figure>
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
