'use client';

import { SignOutButton } from '@clerk/nextjs';
import { useState } from 'react';
import Avatar from '@/components/Avatar';
import { ErrorNote, Loading } from '@/components/States';
import { Bow, Pearls } from '@/components/ornaments';
import { api, useApi } from '@/lib/client-api';

const year = new Date().getFullYear();

function GoalCard({ title, type, unit, goal, onSaved, setError }) {
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    const n = parseInt(target || goal?.target, 10);
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

  return (
    <section className="card stack" style={{ gap: 16 }}>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Yearly goal · {title}</span>
          <h2 className="h-sec num">{goal ? `${goal.current.toLocaleString()} of ${goal.target.toLocaleString()}` : 'Not set'}</h2>
        </div>
        {goal && <span className="stat" style={{ fontSize: 40, color: 'var(--rose-dark)' }}>{Math.min(100, Math.round((goal.current / goal.target) * 100))}%</span>}
      </div>
      {goal && <Pearls total={Math.min(type === 'yearly_books' ? goal.target : 40, 60)} filled={Math.round(Math.min(1, goal.current / goal.target) * Math.min(type === 'yearly_books' ? goal.target : 40, 60))} size={type === 'yearly_books' ? 24 : 16} gap={5} tone={type === 'yearly_books' ? 'deep' : 'rose'} />}
      <form className="row wrap" onSubmit={save}>
        <label className="sr-only" htmlFor={`goal-${type}`}>{title} target</label>
        <input id={`goal-${type}`} className="input" style={{ maxWidth: 180, height: 44 }} inputMode="numeric" placeholder={`Target ${unit}`} value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
        <button className="btn btn-soft btn-sm" type="submit" disabled={saving || !target}>{goal ? 'Change goal' : 'Set goal'}</button>
      </form>
    </section>
  );
}

function GoodreadsImport({ onDone }) {
  const [state, setState] = useState({ running: false, done: 0, total: 0, imported: 0, failed: [], finished: false, error: null });

  async function start(event) {
    const file = event.target.files?.[0];
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
    event.target.value = '';
  }

  return (
    <section className="card stack" style={{ gap: 14 }}>
      <h3 style={{ fontSize: 30 }}>Bring your books from Goodreads</h3>
      <p className="muted" style={{ lineHeight: 1.55 }}>
        On Goodreads open My Books, choose Import and export, then Export Library. Upload the CSV here. Books you already have are left alone.
      </p>
      <label className={`btn btn-soft ${state.running ? '' : ''}`} style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
        {state.running ? 'Importing…' : 'Choose your CSV file'}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={start} disabled={state.running} />
      </label>
      {state.total > 0 && (
        <div className="stack" style={{ gap: 8 }} role="status">
          <div className="meter"><i style={{ width: `${(state.done / state.total) * 100}%`, background: 'var(--rose)' }} /></div>
          <span className="muted num" style={{ fontSize: 14 }}>
            {state.finished ? 'Finished. ' : ''}{state.done} of {state.total} rows · {state.imported} books added
          </span>
        </div>
      )}
      {state.failed.length > 0 && <div className="notice">Could not find {state.failed.length} books: {state.failed.slice(0, 5).join(', ')}{state.failed.length > 5 ? '…' : ''}</div>}
      <ErrorNote message={state.error} />
    </section>
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
      <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
      {saved && <div className="notice" role="status">Saved.</div>}
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

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 120, background: 'var(--pink-100)', position: 'relative' }}>
          <div className="pstring" style={{ position: 'absolute', left: 40, right: 40, top: 32 }} />
          <div style={{ position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)' }}><Bow width={68} /></div>
        </div>
        <div className="row wrap" style={{ padding: '0 32px 28px', marginTop: -44, alignItems: 'flex-end', gap: 22 }}>
          <Avatar user={profile} size={100} style={{ boxShadow: '0 0 0 6px #fff' }} />
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 46 }}>{profile?.name || 'Your profile'}</h1>
            <p className="muted">{profile?.bio || 'Add a short bio below.'}{profile?.created_at ? ` Reading since ${new Date(profile.created_at).getFullYear()}.` : ''}</p>
          </div>
          <SignOutButton redirectUrl="/"><button type="button" className="btn btn-ghost btn-sm">Sign out</button></SignOutButton>
        </div>
      </section>

      <div className="grid g-main">
        <div className="stack" style={{ gap: 24 }}>
          {goals.loading ? <Loading /> : (
            <>
              <GoalCard title="Books" type="yearly_books" unit="books" goal={goalOf('yearly_books')} onSaved={goals.reload} setError={setError} />
              <GoalCard title="Pages" type="yearly_pages" unit="pages" goal={goalOf('yearly_pages')} onSaved={goals.reload} setError={setError} />
            </>
          )}
          <GoodreadsImport onDone={() => { shelves.reload(); goals.reload(); }} />
        </div>

        <div className="stack" style={{ gap: 24 }}>
          <section className="card stack">
            <h3 style={{ fontSize: 30 }}>Profile details</h3>
            <ProfileForm key={profile?.id} profile={profile} onSaved={user.reload} setError={setError} />
          </section>

          <section className="card stack">
            <h3 style={{ fontSize: 30 }}>My shelves</h3>
            {(shelves.data?.data || []).length === 0 && <p className="muted">No shelves yet. Create one from the Library.</p>}
            {(shelves.data?.data || []).map((s) => (
              <div key={s.id} className="shelf-item" style={{ cursor: 'default', background: 'var(--pink-50)' }}>
                <span className="pearl pearl-rose" />{s.name}<span className="count num">{s.book_count}</span>
                <button type="button" className="tag" onClick={() => removeShelf(s.id)} aria-label={`Delete shelf ${s.name}`}>Delete</button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
