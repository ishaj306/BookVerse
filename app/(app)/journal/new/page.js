'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cover from '@/components/Cover';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { Bow } from '@/components/ornaments';
import { api, useApi } from '@/lib/client-api';

function Composer() {
  const router = useRouter();
  const params = useSearchParams();
  const library = useApi('/api/library');
  const tagList = useApi('/api/tags');

  const [bookId, setBookId] = useState(params.get('book') || '');
  const [content, setContent] = useState('');
  const [quote, setQuote] = useState('');
  const [page, setPage] = useState('');
  const [tags, setTags] = useState([]);
  const [tagText, setTagText] = useState('');
  const [linkId, setLinkId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const entries = library.data?.data || [];
  const selected = entries.find((ub) => ub.book_id === bookId)?.book;
  const suggestions = (tagList.data?.data || [])
    .map((t) => t.tag)
    .filter((t) => !tags.includes(t) && t.startsWith(tagText.trim().toLowerCase()))
    .slice(0, 8);

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag) && tags.length < 20) setTags([...tags, tag]);
    setTagText('');
  }

  function onTagKey(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagText);
    } else if (event.key === 'Backspace' && !tagText && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  async function save(event) {
    event.preventDefault();
    setError(null);
    if (!bookId) return setError('Choose a book first.');
    if (!content.trim() && !quote.trim()) return setError('Write a thought or a quote.');

    setSaving(true);
    try {
      await api('/api/journal', {
        method: 'POST',
        body: {
          book_id: bookId,
          content,
          quote,
          page_number: page ? parseInt(page, 10) : null,
          tags: tagText.trim() ? [...tags, tagText] : tags,
        },
      });
      if (linkId) {
        await api('/api/connections', { method: 'POST', body: { from_book_id: bookId, to_book_id: linkId } });
      }
      router.push(`/book/${bookId}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (library.loading) return <div className="page"><Loading /></div>;
  if (entries.length === 0) {
    return <div className="page"><Empty title="Shelve a book first" text="Inscriptions belong to books in your library." href="/discover" action="Find a book" /></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <form className="card" style={{ padding: 0, overflow: 'hidden' }} onSubmit={save}>
        <div className="ribbon-strip" style={{ height: 14 }} />
        <div className="stack" style={{ padding: 'clamp(20px, 4vw, 40px)', gap: 24 }}>
          <div className="row" style={{ gap: 18 }}>
            {selected && <Cover book={selected} width={64} height={96} />}
            <div className="stack" style={{ gap: 4, flex: 1 }}>
              <span className="eyebrow">New inscription</span>
              <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>{selected?.title || 'Choose a book'}</h1>
              {selected && <p className="muted" style={{ fontSize: 14 }}>{selected.author}</p>}
            </div>
            <Bow width={64} />
          </div>

          <ErrorNote message={error || library.error} />

          <div className="field">
            <label htmlFor="book">Book</label>
            <select id="book" className="input" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">Choose a book…</option>
              {entries.map((ub) => <option key={ub.book_id} value={ub.book_id}>{ub.book?.title}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="thought">Your thought</label>
            <div className="inscription-box">
              <textarea id="thought" rows={5} maxLength={10000} placeholder="What is on your mind?" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 140px', gap: 16 }}>
            <div className="field"><label htmlFor="quote">Favourite quote</label><input id="quote" className="input" maxLength={2000} value={quote} onChange={(e) => setQuote(e.target.value)} /></div>
            <div className="field"><label htmlFor="page">Page</label><input id="page" className="input" inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} /></div>
          </div>

          <div className="field">
            <label htmlFor="tag">Tags</label>
            <div className="tag-input">
              {tags.map((t) => (
                <button key={t} type="button" className="tag" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>{t} ×</button>
              ))}
              <input id="tag" placeholder="Add a tag, press Enter" value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={onTagKey} maxLength={40} />
            </div>
            {suggestions.length > 0 && (
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>From your past tags</span>
                {suggestions.map((t) => <button key={t} type="button" className="chip chip-outline" style={{ minHeight: 34, fontSize: 13 }} onClick={() => addTag(t)}>{t}</button>)}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="link">This reminded me of</label>
            <select id="link" className="input" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
              <option value="">No link</option>
              {entries.filter((ub) => ub.book_id !== bookId).map((ub) => <option key={ub.book_id} value={ub.book_id}>{ub.book?.title}</option>)}
            </select>
            <p className="muted" style={{ fontSize: 13 }}>Draw your own ribbon between two books. It shows as a solid thread in your constellation.</p>
          </div>

          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <Link className="btn btn-ghost" href={bookId ? `/book/${bookId}` : '/library'}>Cancel</Link>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '0 44px' }}>{saving ? 'Inscribing…' : 'Inscribe'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ComposerPage() {
  return (
    <Suspense fallback={<div className="page"><Loading /></div>}>
      <Composer />
    </Suspense>
  );
}
