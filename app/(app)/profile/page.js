'use client';

import { SignOutButton } from '@clerk/nextjs';
import { useState } from 'react';
import Avatar from '@/components/Avatar';
import Reveal from '@/components/Reveal';
import { ErrorNote, Loading } from '@/components/States';
import { Pearls } from '@/components/ornaments';
import { api, useApi } from '@/lib/client-api';

const year = new Date().getFullYear();

function GoalBlock({ title, type, unit, goal, onSaved, setError }) {
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    const n = parseInt(target, 10);
    if (!n) return;
    setSaving(true);
    try {
      await api('/api/goals', { method: 'POST', body: { type, target: n, year } });
      setTarget('');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const beads = Math.min(type === 'yearly_books' ? goal?.target || 0 : 40, 60);
  const percent = goal ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

  return (
    <Reveal className="block stack" style={{ gap: 16 }}>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">Yearly goal · {title}</span>
          <h2 className="h-sec num">{goal ? `${goal.current.toLocaleString()} of ${goal.target.toLocaleString()}` : 'Not set yet'}</h2>
        </div>
        {goal && <span className="stat" style={{ fontSize: 44, color: 'var(--rose-dark)' }}>{percent}%</span>}
      </div>
      {goal && <Pearls total={beads} filled={Math.round((percent / 100) * beads)} size={type === 'yearly_books' ? 24 : 15} gap={5} tone={type === 'yearly_books' ? 'deep' : 'rose'} />}
      <form className="row wrap" onSubmit={save}>
        <label className="sr-only" htmlFor={`goal-${type}`}>{title} target</label>
        <input id={`goal-${type}`} className="input input-small" style={{ maxWidth: 190 }} inputMode="numeric" placeholder={`Target ${unit}`} value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
        <button className="btn btn-soft btn-sm" type="submit" disabled={saving || !target}>{goal ? 'Change goal' : 'Set goal'}</button>
      </form>
    </Reveal>
  );
}

function GoodreadsImport({ onDone }) {
  const [state, setState] = useState({ running: false, done: 0, total: 0, imported: 0, failed: [], finished: false, error: null });

  async function start(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const csv = await file.text();
    let offset = 0;
    let imported = 0;
    const failed = [];
    setState({ running: true, done: 0, total: 0, imported: 0, failed: [], finished: false, error: null });

    try {
      while (offset !== null) {
        const res = await api('/api/import/goodreads', { method: 'POST', body: { csv, offset } });
        imported += res.imported;
        failed.push(...res.failed);
        offset = res.nextOffset;
        setState({ running: offset !== null, done: offset === null ? res.total : offset, total: res.total, imported, failed: [...failed], finished: offset === null, error: null });
      }
      onDone();
    } catch (e) {
      setState((s) => ({ ...s, running: false, error: e.message }));
    }
    input.value = '';
  }

  return (
    <Reveal className="block stack" style={{ gap: 14 }}>
      <h2 className="h-sec">Bring your books from Goodreads</h2>
      <p className="muted" style={{ lineHeight: 1.6, maxWidth: '56ch' }}>
        On Goodreads open My Books, choose Import and export, then Export Library. Upload the CSV here. Books you already have are left alone.
      </p>
      <label className="btn btn-soft" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
        {state.running ? 'Importing…' : 'Choose your CSV file'}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={start} disabled={state.running} />
      </label>
      {state.total > 0 && (
        <div className="stack" style={{ gap: 8 }} role="status">
          <div className="meter"><i style={{ width: `${(state.done / state.total) * 100}%`, background: 'var(--rose)', transition: 'width 0.5s var(--ease)' }} /></div>
          <span className="muted num" style={{ fontSize: 14 }}>
            {state.finished ? 'Finished. ' : ''}{state.done} of {state.total} rows · {state.imported} books added
          </span>
        </div>
      )}
      {state.failed.length > 0 && <div className="notice">Could not find {state.failed.length} {state.failed.length === 1 ? 'book' : 'books'}: {state.failed.slice(0, 5).join(', ')}{state.failed.length > 5 ? '…' : ''}</div>}
      <ErrorNote message={state.error} />
    </Reveal>
  );
}

function ProfileForm({ profile, onSaved, setError }) {
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saved, setSaved] = useState(false);

  async function save(event) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await api('/api/user', { method: 'PATCH', body: { name, bio } });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={save}>
      <div className="field"><label htmlFor="name">Display name</label><input id="name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="bio">Bio</label><textarea id="bio" className="input" rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
      <div className="row">
        <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
        {saved && <span className="muted" role="status" style={{ fontSize: 14 }}>Saved.</span>}
      </div>
    </form>
  );
}

export default function Profile() {
  const user = useApi('/api/user');
  const goals = useApi(`/api/goals?year=${year}`);
  const shelves = useApi('/api/shelves');
  const [error, setError] = useState(null);

  const profile = user.data?.data;
  const goalOf = (type) => (goals.data?.data || []).find((g) => g.type === type);

  async function removeShelf(id) {
    if (!window.confirm('Delete this shelf? The books stay in your library.')) return;
    try {
      await api('/api/shelves', { method: 'DELETE', body: { id } });
      shelves.reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (user.loading) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <ErrorNote message={error || user.error || goals.error || shelves.error} />

      <header className="profile-head">
        <Avatar user={profile} size={96} />
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 220 }}>
          <span className="eyebrow">Your profile{profile?.created_at ? ` · reading since ${new Date(profile.created_at).getFullYear()}` : ''}</span>
          <h1 className="h-page" style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}>{profile?.name || 'Reader'}</h1>
          <p className="muted" style={{ maxWidth: '52ch' }}>{profile?.bio || 'Add a short bio below.'}</p>
        </div>
        <SignOutButton redirectUrl="/"><button type="button" className="btn btn-ghost btn-sm">Sign out</button></SignOutButton>
      </header>

      <div className="grid g-main" style={{ gap: 'clamp(32px, 6vw, 72px)' }}>
        <div className="stack" style={{ gap: 36 }}>
          {goals.loading ? <Loading /> : (
            <>
              <GoalBlock title="Books" type="yearly_books" unit="books" goal={goalOf('yearly_books')} onSaved={goals.reload} setError={setError} />
              <GoalBlock title="Pages" type="yearly_pages" unit="pages" goal={goalOf('yearly_pages')} onSaved={goals.reload} setError={setError} />
            </>
          )}
          <GoodreadsImport onDone={() => { shelves.reload(); goals.reload(); }} />
        </div>

        <div className="stack" style={{ gap: 36 }}>
          <Reveal className="block stack" style={{ gap: 16 }}>
            <h2 className="h-sec">Details</h2>
            <ProfileForm key={profile?.id} profile={profile} onSaved={user.reload} setError={setError} />
          </Reveal>

          <Reveal className="block stack" style={{ gap: 12 }}>
            <h2 className="h-sec">My shelves</h2>
            {(shelves.data?.data || []).length === 0 && <p className="muted">No shelves yet. Create one from the Library.</p>}
            {(shelves.data?.data || []).map((s) => (
              <div key={s.id} className="shelf-item" style={{ cursor: 'default' }}>
                <span className="pearl pearl-rose" />{s.name}<span className="count num">{s.book_count}</span>
                <button type="button" className="link-quiet" onClick={() => removeShelf(s.id)} aria-label={`Delete shelf ${s.name}`}>Delete</button>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </div>
  );
}
