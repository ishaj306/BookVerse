'use client';

import Link from 'next/link';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { useEffect, useMemo, useRef, useState } from 'react';
import Cover from '@/components/Cover';
import { PearlRating } from '@/components/ornaments';
import { ErrorNote } from '@/components/States';
import { STATUS_LABELS, api, titleCase, useApi } from '@/lib/client-api';

const radiusOf = (n) => 13 + (n.rating ? n.rating * 3.2 : 5) + Math.min(n.tags.length, 4);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hashOf = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const RANK = { manual: 3, shared_tag: 2, shared_genre: 1 };

/** Lay the graph out once with d3-force, run to rest. The world grows with the library. */
function layout(nodes, edges, portrait) {
  const size = Math.max(1100, Math.sqrt(nodes.length) * 320);
  const W = portrait ? size * 0.72 : size;
  const H = portrait ? size : size * 0.72;
  const ns = nodes.map((n) => ({ ...n }));
  const es = edges.map((e) => ({ ...e }));
  const sim = forceSimulation(ns)
    .force('link', forceLink(es).id((d) => d.id).distance((d) => 210 / (1 + Math.min(d.weight, 3) * 0.3)).strength(0.28))
    .force('charge', forceManyBody().strength(-900))
    .force('center', forceCenter(W / 2, H / 2))
    .force('x', forceX(W / 2).strength(portrait ? 0.1 : 0.05))
    .force('y', forceY(H / 2).strength(portrait ? 0.035 : 0.07))
    .force('collide', forceCollide((d) => radiusOf(d) + 42))
    .stop();
  sim.tick(400);

  const pos = {};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of ns) {
    const p = { x: clamp(n.x, 60, W - 60), y: clamp(n.y, 60, H - 70) };
    pos[n.id] = p;
    const r = radiusOf(n);
    minX = Math.min(minX, p.x - r - 50);
    maxX = Math.max(maxX, p.x + r + 50);
    minY = Math.min(minY, p.y - r - 30);
    maxY = Math.max(maxY, p.y + r + 55);
  }
  return { pos, W, H, bounds: { minX, minY, maxX, maxY } };
}

/** Camera that frames the books themselves, leaving room for the controls. */
function fitCamera(stage, world) {
  if (!stage.w || !world) return { x: 0, y: 0, k: 1 };
  const { minX, minY, maxX, maxY } = world.bounds;
  const bw = maxX - minX;
  const bh = maxY - minY;
  // Leave room for the title and filters above, and for the controls (and the tab bar on phones) below.
  const phone = stage.w <= 860;
  const top = phone ? 150 : 130;
  const bottom = phone ? 175 : 90;
  const free = stage.h - top - bottom;
  const k = clamp(Math.min((stage.w - 48) / bw, free / bh), 0.3, 1.5);
  return { k, x: (stage.w - bw * k) / 2 - minX * k, y: top + (free - bh * k) / 2 - minY * k };
}

/** Zoom while keeping the point under the cursor still. */
function zoomAt(cam, px, py, factor) {
  const k = clamp(cam.k * factor, 0.3, 4.5);
  const r = k / cam.k;
  return { k, x: px - (px - cam.x) * r, y: py - (py - cam.y) * r };
}

export default function Constellation() {
  const everything = useApi('/api/constellation');
  const [year, setYear] = useState(null);
  const filtered = useApi(year ? `/api/constellation?year=${year}` : null);
  const graph = year ? filtered.data : everything.data;

  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [moved, setMoved] = useState({});
  const [override, setOverride] = useState(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [linkTo, setLinkTo] = useState('');
  const [message, setMessage] = useState(null);
  const stageRef = useRef(null);
  const gesture = useRef(null);
  const pointers = useRef(new Map());
  const flight = useRef(0);
  const flying = useRef(false);

  const nodes = useMemo(() => graph?.nodes || [], [graph]);
  const edges = useMemo(() => graph?.edges || [], [graph]);
  const portrait = stage.h > stage.w * 1.05;
  const world = useMemo(() => (nodes.length ? layout(nodes, edges, portrait) : null), [nodes, edges, portrait]);
  const fit = useMemo(() => fitCamera(stage, world), [stage, world]);
  const cam = override || fit;
  const at = (id) => moved[id] || world?.pos[id] || { x: 0, y: 0 };

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // One thread per pair of books, keeping the strongest kind.
  const threads = useMemo(() => {
    const pairs = new Map();
    for (const e of edges) {
      if (!byId.has(e.source) || !byId.has(e.target)) continue;
      const key = pairKey(e.source, e.target);
      const prev = pairs.get(key);
      if (!prev || RANK[e.type] > RANK[prev.type]) pairs.set(key, { key, a: e.source, b: e.target, type: e.type, weight: e.weight });
    }
    return [...pairs.values()];
  }, [edges, byId]);

  const adjacency = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, new Set()]));
    for (const t of threads) {
      m.get(t.a)?.add(t.b);
      m.get(t.b)?.add(t.a);
    }
    return m;
  }, [nodes, threads]);

  // Themes: the tags shared by several books, named like constellations.
  const themes = useMemo(() => {
    if (!world) return [];
    const groups = new Map();
    for (const n of nodes) for (const t of n.tags) groups.set(t, [...(groups.get(t) || []), n.id]);
    return [...groups]
      .filter(([, ids]) => ids.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([tag, ids]) => {
        const pts = ids.map((id) => world.pos[id]);
        return { tag, x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
      });
  }, [nodes, world]);

  // The best-connected books keep their names even when zoomed far out.
  const hubs = useMemo(
    () => new Set([...nodes].sort((a, b) => (adjacency.get(b.id)?.size || 0) - (adjacency.get(a.id)?.size || 0)).slice(0, 5).map((n) => n.id)),
    [nodes, adjacency]
  );

  const years = useMemo(() => {
    const set = new Set();
    for (const n of everything.data?.nodes || []) if (n.finishedAt) set.add(n.finishedAt.slice(0, 4));
    return [...set].sort().reverse();
  }, [everything.data]);

  const selected = byId.get(selectedId);
  const focusId = hoverId || selectedId;
  const tagSet = useMemo(() => (tagFilter ? new Set(nodes.filter((n) => n.tags.includes(tagFilter)).map((n) => n.id)) : null), [nodes, tagFilter]);
  const isLit = (id) => (tagSet ? tagSet.has(id) : focusId ? id === focusId || adjacency.get(focusId)?.has(id) : true);
  const threadLit = (t) => (tagSet ? tagSet.has(t.a) && tagSet.has(t.b) : focusId ? t.a === focusId || t.b === focusId : true);
  const dimmed = Boolean(tagSet || focusId);

  const connections = selected
    ? threads.filter((t) => t.a === selected.id || t.b === selected.id).map((t) => ({ node: byId.get(t.a === selected.id ? t.b : t.a), type: t.type, weight: t.weight })).filter((c) => c.node)
    : [];
  const linkable = selected ? nodes.filter((n) => n.id !== selected.id && !adjacency.get(selected.id)?.has(n.id)) : [];

  // Measure the stage.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setStage({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wheel zoom needs a non-passive listener so the page does not scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      cancelAnimationFrame(flight.current);
      flying.current = false;
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      setOverride((prev) => zoomAt(prev || fit, e.clientX - r.left, e.clientY - r.top, factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fit]);

  useEffect(() => () => cancelAnimationFrame(flight.current), []);

  function animateTo(target, done) {
    cancelAnimationFrame(flight.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flying.current = false;
      setOverride(target);
      done?.();
      return;
    }
    flying.current = true;
    const from = cam;
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 650);
      const e = 1 - (1 - t) ** 3;
      setOverride({ k: from.k + (target.k - from.k) * e, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
      if (t < 1) {
        flight.current = requestAnimationFrame(step);
      } else {
        flying.current = false;
        done?.();
      }
    };
    flight.current = requestAnimationFrame(step);
  }

  function flyTo(id) {
    const p = at(id);
    if (!stage.w) return;
    const k = Math.max(cam.k, Math.min(1.6, fit.k * 2));
    const wide = stage.w > 860;
    animateTo({ k, x: stage.w / 2 + (wide ? -190 : 0) - p.x * k, y: stage.h / 2 + (wide ? 0 : -stage.h * 0.16) - p.y * k });
  }

  function selectNode(id) {
    setSelectedId(id);
    flyTo(id);
  }

  function chooseYear(next) {
    setYear(next);
    setOverride(null);
    setMoved({});
    setSelectedId(null);
    setTagFilter(null);
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    stageRef.current.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    cancelAnimationFrame(flight.current);
    flying.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, cam0: cam };
      return;
    }
    const nodeEl = event.target.closest?.('[data-node]');
    gesture.current = nodeEl
      ? { type: 'node', id: nodeEl.getAttribute('data-node'), sx: event.clientX, sy: event.clientY, moved: false }
      : { type: 'pan', sx: event.clientX, sy: event.clientY, cam0: cam, moved: false };
  }

  function onPointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;
    const rect = stageRef.current.getBoundingClientRect();

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setOverride(zoomAt(g.cam0, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, d / g.d0));
      return;
    }
    const dx = event.clientX - g.sx;
    const dy = event.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) > 5) g.moved = true;
    if (!g.moved) return;
    if (g.type === 'pan') setOverride({ ...g.cam0, x: g.cam0.x + dx, y: g.cam0.y + dy });
    if (g.type === 'node') setMoved((m) => ({ ...m, [g.id]: { x: (event.clientX - rect.left - cam.x) / cam.k, y: (event.clientY - rect.top - cam.y) / cam.k } }));
  }

  function onPointerUp(event) {
    const g = gesture.current;
    pointers.current.delete(event.pointerId);
    if (g?.type === 'node' && !g.moved) selectNode(g.id);
    else if (g?.type === 'pan' && !g.moved) setSelectedId(null);

    if (pointers.current.size === 0) gesture.current = null;
    else if (g?.type === 'pinch') {
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'pan', sx: p.x, sy: p.y, cam0: cam, moved: true };
    }
  }

  const zoomBy = (factor) => setOverride((prev) => zoomAt(prev || fit, stage.w / 2, stage.h / 2, factor));
  const resetView = () => animateTo(fit, () => setOverride(null));

  async function mutate(action) {
    setMessage(null);
    try {
      await action();
      everything.reload();
      filtered.reload();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const drawThread = () =>
    mutate(async () => {
      await api('/api/connections', { method: 'POST', body: { from_book_id: selected.id, to_book_id: linkTo } });
      setLinkTo('');
    });
  const rebuild = () => mutate(() => api('/api/constellation/recompute', { method: 'POST' }));

  const showCovers = cam.k > 1.7;

  return (
    <div className="sky-page">
      <div className="sky-stars sky-stars-a" aria-hidden="true" style={{ transform: `translate(${cam.x * 0.03}px, ${cam.y * 0.03}px)` }} />
      <div className="sky-stars sky-stars-b" aria-hidden="true" style={{ transform: `translate(${cam.x * 0.07}px, ${cam.y * 0.07}px)` }} />
      <div className="sky-moon" aria-hidden="true" style={{ transform: `translate(${cam.x * 0.02}px, ${cam.y * 0.02}px)` }} />

      <div
        ref={stageRef}
        className="sky-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {world && (
          <svg role="group" aria-label="Your books as stars, joined by threads" width="100%" height="100%">
            <defs>
              <radialGradient id="pearl-fill" cx="34%" cy="28%" r="80%">
                <stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#F8EFEA" /><stop offset=".75" stopColor="#E2D0CA" /><stop offset="1" stopColor="#C6AFA9" />
              </radialGradient>
              <radialGradient id="pearl-rose-fill" cx="34%" cy="28%" r="80%">
                <stop offset="0" stopColor="#fff" /><stop offset=".25" stopColor="#FFEAF1" /><stop offset=".6" stopColor="#F6BBD0" /><stop offset="1" stopColor="#D9789B" />
              </radialGradient>
            </defs>
            <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
              {themes.map((t) => (
                <text key={t.tag} className="sky-theme" x={t.x} y={t.y} textAnchor="middle" style={{ opacity: dimmed ? 0.05 : undefined }}>{t.tag}</text>
              ))}

              {threads.map((t) => {
                const a = at(t.a);
                const b = at(t.b);
                const lit = threadLit(t);
                const manual = t.type === 'manual';
                return (
                  <line key={t.key} className="draw" pathLength="1" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lit && dimmed ? '#fff' : '#F5C2D2'}
                    strokeOpacity={!lit ? 0.07 : dimmed ? 0.95 : manual ? 0.85 : t.type === 'shared_genre' ? 0.22 : 0.5}
                    strokeWidth={(manual ? 2.6 : 1 + Math.min(t.weight, 3) * 0.7) / Math.max(cam.k, 0.7)} strokeLinecap="round" />
                );
              })}

              {nodes.map((n) => {
                const p = at(n.id);
                const r = radiusOf(n);
                const lit = isLit(n.id);
                const sel = selectedId === n.id;
                const hot = sel || hoverId === n.id;
                const d = hashOf(n.id) % 5;
                const showLabel = hot || (focusId && adjacency.get(focusId)?.has(n.id)) || (lit && (nodes.length <= 8 || cam.k >= 0.8 || hubs.has(n.id)));
                return (
                  <g key={n.id} transform={`translate(${p.x} ${p.y})`} data-node={n.id} className={`snode ${lit ? '' : 'dim'}`} tabIndex={0} role="button"
                    aria-label={`${n.title}, ${n.tags.length} tags`} aria-pressed={sel}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectNode(n.id))}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && !flying.current && setHoverId(n.id)} onPointerLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(n.id)} onBlur={() => setHoverId(null)}>
                    <g className="drift" style={{ animationDuration: `${7 + d * 1.4}s`, animationDelay: `${-d * 1.7}s` }}>
                      <circle r={r * 2.1} fill="#F7A8C0" opacity={hot ? 0.3 : 0.08} className="snode-halo" />
                      {sel && <circle r={r + 7} fill="none" stroke="#FFD3E1" strokeWidth={1.5} className="snode-ring" />}
                      <circle r={r} fill={`url(#${hot ? 'pearl-rose-fill' : 'pearl-fill'})`} />
                      {showCovers && n.coverUrl && (
                        <>
                          <clipPath id={`clip-${n.id}`}><circle r={r - 1.5} /></clipPath>
                          <image href={n.coverUrl} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${n.id})`} />
                        </>
                      )}
                      {showLabel && (
                        <text y={r + 20 / cam.k} textAnchor="middle" fontSize={15 / cam.k} className="snode-label">
                          {n.title.length > 24 ? `${n.title.slice(0, 23)}…` : n.title}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      <ul className="sr-only" aria-label="Books in your constellation">
        {nodes.map((n) => (
          <li key={n.id}>{n.title}{adjacency.get(n.id)?.size ? `, connected to ${[...adjacency.get(n.id)].map((id) => byId.get(id)?.title).join(', ')}` : ', not connected yet'}</li>
        ))}
      </ul>

      {/* heads-up display */}
      <div className="sky-hud sky-hud-top">
        <div className="sky-title">
          <span className="eyebrow">Your reading life</span>
          <h1>The Constellation</h1>
        </div>
        <div className="sky-filters">
          <div className="pillrow" role="group" aria-label="Filter by year">
            <button type="button" className={`chip chip-small ${!year ? 'chip-on' : ''}`} onClick={() => chooseYear(null)}>All time</button>
            {years.map((y) => <button key={y} type="button" className={`chip chip-small ${year === y ? 'chip-on' : ''}`} onClick={() => chooseYear(y)}>{y}</button>)}
          </div>
          {(graph?.topTags || []).length > 0 && (
            <div className="pillrow" role="group" aria-label="Light up a theme">
              {graph.topTags.slice(0, 8).map((t) => (
                <button key={t.tag} type="button" className={`chip chip-small ${tagFilter === t.tag ? 'chip-on' : ''}`} aria-pressed={tagFilter === t.tag} onClick={() => setTagFilter(tagFilter === t.tag ? null : t.tag)}>
                  {titleCase(t.tag)} <span className="num" style={{ opacity: 0.7 }}>{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(everything.error || filtered.error || message) && <div className="sky-note"><ErrorNote message={everything.error || filtered.error || message} /></div>}

      {everything.loading && (
        <div className="sky-center" role="status">
          <div className="pearls"><span className="pearl" /><span className="pearl pearl-rose" /><span className="pearl pearl-deep" /></div>
          <p>Gathering your stars…</p>
        </div>
      )}

      {!everything.loading && nodes.length === 0 && (
        <div className="sky-center">
          <h2>{year ? `No books finished in ${year}` : 'The sky is empty'}</h2>
          <p>Shelve a few books and tag your inscriptions. Books that share a tag are joined by a thread of light.</p>
          <Link className="btn btn-glow" href="/discover">Find a book</Link>
        </div>
      )}

      {nodes.length > 0 && (
        <div className="sky-hud sky-hud-bottom">
          <div className="sky-legend">
            <span className="row"><i className="lg lg-solid" />Your ribbon</span>
            <span className="row"><i className="lg lg-dash" />Shared tag</span>
            <span className="row"><span className="pearl" style={{ width: 12, height: 12 }} />Bigger pearl, higher rating</span>
          </div>
          <div className="sky-controls">
            <button type="button" className="sky-round" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">−</button>
            <button type="button" className="sky-round" onClick={() => zoomBy(1.3)} aria-label="Zoom in">+</button>
            <button type="button" className="sky-round sky-round-wide" onClick={resetView}>Fit</button>
            <button type="button" className="sky-round sky-round-wide" onClick={rebuild}>Rebuild</button>
          </div>
        </div>
      )}

      {selected && (
        <aside className="sky-panel" aria-label={`${selected.title} details`}>
          <button type="button" className="sky-close" onClick={() => setSelectedId(null)} aria-label="Close">×</button>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <Cover book={{ title: selected.title, cover_url: selected.coverUrl, author: selected.author }} width={72} height={108} showAuthor={false} />
            <div className="stack" style={{ gap: 6, minWidth: 0 }}>
              {selected.status && <span className="eyebrow">{STATUS_LABELS[selected.status]}</span>}
              <h2 style={{ fontSize: 30 }}>{selected.title}</h2>
              <p className="muted" style={{ fontSize: 14 }}>{selected.author}</p>
              {selected.rating ? <PearlRating value={Number(selected.rating)} size={13} /> : null}
            </div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {selected.tags.length ? selected.tags.map((t) => <button key={t} type="button" className="tag" onClick={() => setTagFilter(tagFilter === t ? null : t)}>{t}</button>) : <span className="muted" style={{ fontSize: 13 }}>No tags yet</span>}
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Connected to</span>
            {connections.length === 0 && <span className="muted" style={{ fontSize: 14 }}>No threads yet. Share a tag with another book.</span>}
            {connections.map(({ node, type }) => (
              <button key={node.id} type="button" className="shelf-item" onClick={() => selectNode(node.id)}>
                <span className={`pearl ${type === 'manual' ? 'pearl-deep' : 'pearl-rose'}`} />
                {node.title}
                <span className="count">{type === 'manual' ? 'your link' : type === 'shared_tag' ? 'shared tag' : 'genre'}</span>
              </button>
            ))}
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <Link className="btn btn-primary btn-sm" href={`/book/${selected.id}`}>Open folio</Link>
          </div>
          {linkable.length > 0 && (
            <div className="field">
              <label htmlFor="thread">Draw a thread to</label>
              <div className="row" style={{ gap: 8 }}>
                <select id="thread" className="input input-small" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                  <option value="">Choose a book…</option>
                  {linkable.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <button type="button" className="btn btn-soft btn-sm" disabled={!linkTo} onClick={drawThread}>Draw</button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
