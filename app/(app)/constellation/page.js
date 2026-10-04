'use client';

import Link from 'next/link';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { useMemo, useRef, useState } from 'react';
import Cover from '@/components/Cover';
import { Empty, ErrorNote, Loading } from '@/components/States';
import { api, useApi } from '@/lib/client-api';

const W = 1000;
const H = 700;

const radiusOf = (n) => 14 + (n.rating ? n.rating * 3.5 : 6) + Math.min(n.tags.length, 4);

/** Lay the graph out once with d3-force, run to rest (no animation loop). */
function layout(nodes, edges) {
  const ns = nodes.map((n) => ({ ...n }));
  const es = edges.map((e) => ({ ...e }));
  const sim = forceSimulation(ns)
    .force('link', forceLink(es).id((d) => d.id).distance((d) => 150 / (1 + Math.min(d.weight, 3) * 0.35)).strength(0.55))
    .force('charge', forceManyBody().strength(-320))
    .force('center', forceCenter(W / 2, H / 2))
    .force('collide', forceCollide((d) => radiusOf(d) + 26))
    .stop();
  sim.tick(320);
  const pos = {};
  for (const n of ns) {
    pos[n.id] = {
      x: Math.max(50, Math.min(W - 50, n.x)),
      y: Math.max(50, Math.min(H - 60, n.y)),
    };
  }
  return pos;
}

export default function Constellation() {
  const everything = useApi('/api/constellation');
  const [year, setYear] = useState(null);
  const filtered = useApi(year ? `/api/constellation?year=${year}` : null);
  const graph = year ? filtered.data : everything.data;

  const [selectedId, setSelectedId] = useState(null);
  const [moved, setMoved] = useState({});
  const [dragId, setDragId] = useState(null);
  const [linkTo, setLinkTo] = useState('');
  const [message, setMessage] = useState(null);
  const svgRef = useRef(null);

  const nodes = useMemo(() => graph?.nodes || [], [graph]);
  const edges = useMemo(() => graph?.edges || [], [graph]);
  const base = useMemo(() => (nodes.length ? layout(nodes, edges) : {}), [nodes, edges]);
  const at = (id) => moved[id] || base[id] || { x: W / 2, y: H / 2 };

  const years = useMemo(() => {
    const set = new Set();
    for (const n of everything.data?.nodes || []) if (n.finishedAt) set.add(n.finishedAt.slice(0, 4));
    return [...set].sort().reverse();
  }, [everything.data]);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const selected = byId.get(selectedId) || [...nodes].sort((a, b) => b.tags.length - a.tags.length)[0];
  const connections = selected
    ? edges
        .filter((e) => e.source === selected.id || e.target === selected.id)
        .map((e) => ({ node: byId.get(e.source === selected.id ? e.target : e.source), edge: e }))
        .filter((c) => c.node)
    : [];

  function pointerToSvg(event) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.max(30, Math.min(W - 30, p.x)), y: Math.max(30, Math.min(H - 40, p.y)) };
  }

  async function refresh(action) {
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
    refresh(async () => {
      await api('/api/connections', { method: 'POST', body: { from_book_id: selected.id, to_book_id: linkTo } });
      setLinkTo('');
    });
  const rebuild = () => refresh(() => api('/api/constellation/recompute', { method: 'POST' }));

  if (everything.loading) return <div className="page"><Loading label="Gathering your stars…" /></div>;

  return (
    <div className="page">
      <div className="row-between">
        <div><span className="eyebrow">Your reading life</span><h1 className="h-page">The Constellation</h1></div>
        <div className="row wrap" role="group" aria-label="Filter by year">
          <button type="button" className={`chip ${!year ? 'chip-on' : ''}`} onClick={() => setYear(null)}>All time</button>
          {years.map((y) => <button key={y} type="button" className={`chip ${year === y ? 'chip-on' : ''}`} onClick={() => setYear(y)}>{y}</button>)}
        </div>
      </div>
      <ErrorNote message={everything.error || filtered.error || message} />

      {nodes.length === 0 ? (
        <Empty
          title={year ? `No books finished in ${year}` : 'No stars yet'}
          text="Shelve a few books and tag your inscriptions. Books that share a tag are joined by a ribbon thread."
          href="/discover"
          action="Find a book"
        />
      ) : (
        <div className="grid g-const">
          <div className="constellation">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graph of your books connected by shared tags"
              onPointerMove={(e) => dragId && setMoved((m) => ({ ...m, [dragId]: pointerToSvg(e) }))}
              onPointerUp={() => setDragId(null)} onPointerLeave={() => setDragId(null)}>
              <defs>
                <radialGradient id="pearl-fill" cx="34%" cy="28%" r="80%">
                  <stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#F8EFEA" /><stop offset=".75" stopColor="#E2D0CA" /><stop offset="1" stopColor="#C6AFA9" />
                </radialGradient>
                <radialGradient id="pearl-rose-fill" cx="34%" cy="28%" r="80%">
                  <stop offset="0" stopColor="#fff" /><stop offset=".25" stopColor="#FFEAF1" /><stop offset=".6" stopColor="#F6BBD0" /><stop offset="1" stopColor="#D9789B" />
                </radialGradient>
              </defs>
              {edges.map((e, i) => {
                const a = at(e.source.id || e.source);
                const b = at(e.target.id || e.target);
                const manual = e.type === 'manual';
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#F5C2D2"
                    strokeOpacity={manual ? 1 : e.type === 'shared_genre' ? 0.35 : 0.8}
                    strokeWidth={manual ? 3 : 1 + Math.min(e.weight, 3)}
                    strokeDasharray={manual ? undefined : e.type === 'shared_genre' ? '2 8' : '9 7'} strokeLinecap="round" />
                );
              })}
              {nodes.map((n) => {
                const p = at(n.id);
                const r = radiusOf(n);
                const on = selected?.id === n.id;
                return (
                  <g key={n.id} style={{ cursor: 'grab' }} tabIndex={0} role="button" aria-label={`${n.title}, ${n.tags.length} tags`}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDragId(n.id); setSelectedId(n.id); }}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedId(n.id)}>
                    {on && <circle cx={p.x} cy={p.y} r={r + 9} fill="#F5C2D2" fillOpacity=".22" />}
                    <circle cx={p.x} cy={p.y} r={r} fill={on ? 'url(#pearl-rose-fill)' : 'url(#pearl-fill)'} stroke={on ? '#F5C2D2' : 'none'} strokeWidth="2" />
                    <text x={p.x} y={p.y + r + 18} textAnchor="middle" fill="#FDEEF2" fontSize="15" fontWeight="600"
                      style={{ fontFamily: 'var(--font-display)', pointerEvents: 'none' }}>
                      {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="legend" style={{ position: 'absolute', right: 14, bottom: 14 }}>
              <span className="row"><i style={{ width: 30, height: 3, background: '#F5C2D2', display: 'inline-block' }} />Your ribbon</span>
              <span className="row"><i style={{ width: 30, height: 3, background: 'repeating-linear-gradient(90deg,#F5C2D2 0 7px,transparent 7px 12px)', display: 'inline-block' }} />Shared tag</span>
              <span className="row"><span className="pearl" style={{ width: 14, height: 14 }} />Bigger pearl, higher rating</span>
            </div>
          </div>

          {selected && (
            <aside className="const-panel">
              <span className="eyebrow">Selected pearl</span>
              <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                <Cover book={{ title: selected.title, cover_url: selected.coverUrl }} width={62} height={92} showAuthor={false} />
                <div className="stack" style={{ gap: 4 }}>
                  <h2 style={{ fontSize: 30 }}>{selected.title}</h2>
                  <p className="muted" style={{ fontSize: 13 }}>{selected.author}</p>
                </div>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>{selected.tags.length ? selected.tags.map((t) => <span key={t} className="tag">{t}</span>) : <span className="muted" style={{ fontSize: 13 }}>No tags yet</span>}</div>
              <div className="ribbon-strip" style={{ height: 8 }} />
              <span className="eyebrow">Connected to</span>
              <div className="stack" style={{ gap: 8 }}>
                {connections.length === 0 && <span className="muted" style={{ fontSize: 14 }}>No threads yet. Add shared tags to your inscriptions.</span>}
                {connections.map(({ node, edge }) => (
                  <button key={node.id + edge.type} type="button" className="shelf-item" style={{ minHeight: 40, padding: '6px 4px' }} onClick={() => setSelectedId(node.id)}>
                    <span className={`pearl ${edge.type === 'manual' ? 'pearl-deep' : 'pearl-rose'}`} />
                    {node.title}
                    <span className="count">{edge.type === 'manual' ? 'your link' : edge.type === 'shared_tag' ? `${Math.round(edge.weight)} tags` : 'genre'}</span>
                  </button>
                ))}
              </div>
              <Link className="btn btn-primary btn-sm" href={`/book/${selected.id}`}>Open folio</Link>
              <div className="field">
                <label htmlFor="thread">Draw a thread to</label>
                <select id="thread" className="input" style={{ height: 44 }} value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                  <option value="">Choose a book…</option>
                  {nodes.filter((n) => n.id !== selected.id).map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <button type="button" className="btn btn-soft btn-sm" disabled={!linkTo} onClick={drawThread}>Draw thread</button>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={rebuild}>Rebuild connections</button>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
