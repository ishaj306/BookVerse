/**
 * DEVELOPMENT ONLY. Sample data so every signed-in screen can be reviewed
 * (and tested at phone sizes) without signing in or touching Supabase.
 *
 * It is switched on by visiting /mock, which sets a `bv_mock` cookie.
 * `lib/client-api.js` only imports this file when NODE_ENV is not
 * "production", so it is never part of a production bundle.
 */

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const book = (id, title, author, pages, genres, year, description) => ({
  id, source_id: id, title, author, pages, genres, description, isbn: null, cover_url: null, publication_date: `${year}-01-01`,
});

const BOOKS = [
  book('b01', 'Rebecca', 'Daphne du Maurier', 380, ['gothic', 'fiction'], 1938, 'A young woman marries a wealthy widower and arrives at Manderley, where the memory of his first wife still shapes every room.'),
  book('b02', 'Circe', 'Madeline Miller', 393, ['mythology', 'fantasy'], 2018, 'The daughter of a Titan is banished to an island, where she learns witchcraft and finds her own voice.'),
  book('b03', 'Jane Eyre', 'Charlotte Brontë', 532, ['classics', 'gothic', 'romance'], 1847, 'An orphan becomes a governess at Thornfield Hall and discovers its secret.'),
  book('b04', 'Piranesi', 'Susanna Clarke', 272, ['fantasy', 'literary'], 2020, 'A man lives in an endless house of statues and tides, keeping careful journals.'),
  book('b05', 'Little Women', 'Louisa May Alcott', 449, ['classics'], 1868, 'Four sisters grow up in New England during the Civil War.'),
  book('b06', 'The Bell Jar', 'Sylvia Plath', 288, ['classics', 'literary'], 1963, 'A brilliant young woman slips into depression during a summer in New York.'),
  book('b07', 'Wuthering Heights', 'Emily Brontë', 416, ['gothic', 'classics'], 1847, 'A foundling and the daughter of the house share a love that destroys them both.'),
  book('b08', 'The Song of Achilles', 'Madeline Miller', 378, ['mythology', 'romance'], 2011, 'Patroclus and Achilles, from boyhood to the walls of Troy.'),
  book('b09', 'The Secret History', 'Donna Tartt', 559, ['dark academia', 'literary'], 1992, 'A circle of classics students at a Vermont college and the murder that binds them.'),
  book('b10', 'Norwegian Wood', 'Haruki Murakami', 296, ['literary'], 1987, 'A student in 1960s Tokyo is haunted by the memory of a lost friend.'),
  book('b11', 'Pride and Prejudice', 'Jane Austen', 432, ['classics', 'romance'], 1813, 'Elizabeth Bennet and Mr Darcy, and the cost of first impressions.'),
  book('b12', 'A Little Life', 'Hanya Yanagihara', 720, ['literary'], 2015, 'Four friends in New York and the long shadow of the past.'),
  book('b13', 'My Cousin Rachel', 'Daphne du Maurier', 352, ['gothic'], 1951, 'Did she or did she not? A young man falls for his cousin’s widow.'),
  book('b14', 'Persuasion', 'Jane Austen', 249, ['classics', 'romance'], 1817, 'A second chance, eight years too late.'),
];

const EXTRA = [
  book('x01', 'The Picture of Dorian Gray', 'Oscar Wilde', 254, ['gothic', 'classics'], 1890, ''),
  book('x02', 'Mexican Gothic', 'Silvia Moreno-Garcia', 301, ['gothic', 'horror'], 2020, ''),
  book('x03', 'The Night Circus', 'Erin Morgenstern', 387, ['fantasy', 'romance'], 2011, ''),
  book('x04', 'Giovanni’s Room', 'James Baldwin', 169, ['literary'], 1956, ''),
  book('x05', 'The Bloody Chamber', 'Angela Carter', 126, ['gothic', 'fairy tales'], 1979, ''),
  book('x06', 'Frankenstein', 'Mary Shelley', 280, ['gothic', 'classics'], 1818, ''),
  book('x07', 'Beloved', 'Toni Morrison', 324, ['literary', 'classics'], 1987, ''),
  book('x08', 'The Goldfinch', 'Donna Tartt', 771, ['literary'], 2013, ''),
  book('x09', 'Daisy Jones & The Six', 'Taylor Jenkins Reid', 368, ['fiction'], 2019, ''),
  book('x10', 'Normal People', 'Sally Rooney', 266, ['literary', 'romance'], 2018, ''),
];

let state = null;

function seed() {
  const lib = [
    ['b01', 'reading', null, 212, daysAgo(18), null],
    ['b09', 'reading', null, 90, daysAgo(6), null],
    ['b02', 'read', 5, 393, daysAgo(40), daysAgo(12)],
    ['b03', 'read', 4, 532, daysAgo(70), daysAgo(41)],
    ['b04', 'read', 5, 272, daysAgo(90), daysAgo(63)],
    ['b05', 'read', 4.5, 449, daysAgo(120), daysAgo(95)],
    ['b06', 'read', 4, 288, daysAgo(150), daysAgo(121)],
    ['b07', 'read', 3.5, 416, daysAgo(180), daysAgo(150)],
    ['b08', 'read', 5, 378, daysAgo(60), daysAgo(30)],
    ['b10', 'read', 3, 296, daysAgo(205), daysAgo(176)],
    ['b11', 'read', 4, 432, daysAgo(230), daysAgo(200)],
    ['b14', 'want', null, 0, null, null],
    ['b12', 'want', null, 0, null, null],
    ['b13', 'paused', null, 120, daysAgo(80), null],
  ].map(([book_id, status, rating, progress, started_at, finished_at], i) => ({
    id: `ub${i + 1}`, user_id: 'mock', book_id, status, rating, progress, started_at, finished_at,
    created_at: new Date().toISOString(), updated_at: new Date(Date.now() - i * 3600e3).toISOString(),
  }));

  const entry = (id, book_id, content, quote, page_number, tags, ago) => ({
    id, user_id: 'mock', book_id, content, quote, page_number, tags, created_at: new Date(Date.now() - ago * 86400e3).toISOString(),
  });
  const journal = [
    entry('j1', 'b01', 'The house is a character, and it is watching her.', null, 88, ['memory', 'jealousy', 'manor houses'], 14),
    entry('j2', 'b01', 'Mrs Danvers is genuinely unsettling. I read this chapter with the lights on.', null, 154, ['obsession', 'fear'], 8),
    entry('j3', 'b01', null, 'Who is the real Rebecca, and does it matter?', 212, ['memory', 'obsession'], 2),
    entry('j4', 'b03', 'Jane never once asks to be rescued.', null, 301, ['independence', 'manor houses', 'memory'], 40),
    entry('j5', 'b07', 'Nobody in this book is likeable and I cannot look away.', null, 190, ['obsession', 'revenge', 'manor houses'], 148),
    entry('j6', 'b02', null, 'Loneliness taught her more than any god did.', 118, ['solitude', 'myth', 'independence', 'grief'], 11),
    entry('j7', 'b08', 'I cried on the train and I do not regret it.', null, 361, ['grief', 'myth', 'love'], 29),
    entry('j8', 'b04', 'A house of statues, and somehow the most comforting book of the year.', null, 144, ['solitude', 'memory', 'wonder'], 62),
    entry('j9', 'b05', 'Beth, always Beth.', null, 301, ['sisters', 'home', 'grief'], 94),
    entry('j10', 'b06', null, 'I keep thinking about the fig tree.', 64, ['solitude', 'identity', 'youth'], 120),
    entry('j11', 'b09', 'They are all so sure of themselves, which is the danger.', null, 77, ['obsession', 'guilt', 'youth'], 5),
    entry('j12', 'b10', 'Quiet, and then suddenly it is not.', null, 202, ['grief', 'youth', 'love'], 175),
    entry('j13', 'b11', 'Second proposals are always better written.', null, 250, ['love', 'class'], 199),
  ];

  const sessions = {};
  const rand = rng(21);
  for (let i = 0; i < 182; i++) {
    const recentRun = i < 12;
    if (recentRun || rand() < 0.5) {
      sessions[daysAgo(i)] = { pages: 8 + Math.round(rand() * 62), minutes: 10 + Math.round(rand() * 60), sessions: 1 };
    }
  }

  state = {
    user: { id: 'mock', name: 'Isha', bio: 'Slow gothic novels and sad girl classics.', avatar_url: null, created_at: '2024-03-02T00:00:00Z' },
    lib, journal, sessions,
    connections: [
      { id: 'c1', user_id: 'mock', from_book_id: 'b01', to_book_id: 'b09', connection_type: 'manual', label: 'both about people you cannot trust', weight: 1 },
      { id: 'c2', user_id: 'mock', from_book_id: 'b02', to_book_id: 'b11', connection_type: 'manual', label: null, weight: 1 },
    ],
    shelves: [
      { id: 's1', name: 'Autumn, gently', book_count: 5, ids: ['b01', 'b03', 'b05', 'b07', 'b13'] },
      { id: 's2', name: 'Slow-burn romances', book_count: 3, ids: ['b11', 'b14', 'b08'] },
      { id: 's3', name: 'Books that broke me', book_count: 4, ids: ['b05', 'b06', 'b10', 'b12'] },
    ],
    goals: [
      { id: 'g1', type: 'yearly_books', target: 26, year: new Date().getFullYear() },
      { id: 'g2', type: 'yearly_pages', target: 8000, year: new Date().getFullYear() },
    ],
    counter: 100,
    importCalls: 0,
  };
}

const bookOf = (id) => [...BOOKS, ...EXTRA].find((b) => b.id === id) || null;
const withBook = (ub) => ({ ...ub, book: bookOf(ub.book_id) });

function streaks(sessions) {
  const days = Object.keys(sessions).sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    const t = new Date(`${day}T00:00:00Z`).getTime();
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  let current = 0;
  for (let i = 0; i < 400 && sessions[daysAgo(i)]; i++) current++;
  if (current === 0) for (let i = 1; i < 400 && sessions[daysAgo(i)]; i++) current++;
  return { current, longest };
}

function goalCurrent(goal) {
  if (goal.type === 'yearly_books') {
    return state.lib.filter((ub) => ub.status === 'read' && ub.finished_at?.startsWith(String(goal.year))).length;
  }
  return Object.entries(state.sessions).filter(([d]) => d.startsWith(String(goal.year))).reduce((s, [, v]) => s + v.pages, 0);
}

function analytics(year) {
  const read = state.lib.filter((ub) => ub.status === 'read' && ub.finished_at?.startsWith(String(year)));
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, booksRead: 0, pagesRead: 0, readingMinutes: 0 }));
  for (const ub of read) monthly[Number(ub.finished_at.slice(5, 7)) - 1].booksRead++;
  let totalPages = 0;
  let totalMinutes = 0;
  const heat = {};
  for (const [day, v] of Object.entries(state.sessions)) {
    if (!day.startsWith(String(year))) continue;
    totalPages += v.pages;
    totalMinutes += v.minutes;
    const m = monthly[Number(day.slice(5, 7)) - 1];
    m.pagesRead += v.pages;
    m.readingMinutes += v.minutes;
    heat[day] = v;
  }
  const rated = read.filter((ub) => ub.rating != null);
  const genres = {};
  for (const ub of read) for (const g of bookOf(ub.book_id)?.genres || []) genres[g] = (genres[g] || 0) + 1;
  const active = Object.keys(heat).length;
  return {
    year,
    booksReadCount: read.length,
    totalPages,
    totalMinutes,
    averageRating: rated.length ? Math.round((rated.reduce((s, ub) => s + Number(ub.rating), 0) / rated.length) * 10) / 10 : null,
    pagesPerActiveDay: active ? Math.round(totalPages / active) : 0,
    monthlyStats: monthly,
    heatmapData: heat,
    streak: streaks(state.sessions),
    genreBreakdown: Object.entries(genres).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count),
    currentlyReading: state.lib.filter((ub) => ub.status === 'reading').map(withBook),
    goals: state.goals.filter((g) => g.year === year).map((g) => ({ ...g, current: goalCurrent(g) })),
  };
}

function constellation(year) {
  let rows = state.lib;
  if (year) rows = rows.filter((ub) => ub.finished_at?.startsWith(String(year)));
  const ids = new Set(rows.map((ub) => ub.book_id));
  const tagsOf = (id) => [...new Set(state.journal.filter((e) => e.book_id === id).flatMap((e) => e.tags))];
  const nodes = rows.map((ub) => {
    const b = bookOf(ub.book_id);
    return {
      id: b.id, title: b.title, author: b.author, coverUrl: null, pages: b.pages, genres: b.genres, tags: tagsOf(b.id),
      status: ub.status, rating: ub.rating, startedAt: ub.started_at, finishedAt: ub.finished_at,
    };
  });
  const edges = [];
  const strong = new Set();
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].tags.filter((t) => nodes[j].tags.includes(t)).length;
      if (shared) {
        edges.push({ source: nodes[i].id, target: nodes[j].id, type: 'shared_tag', label: null, weight: shared });
        strong.add(key(nodes[i].id, nodes[j].id));
      }
    }
  }
  for (const c of state.connections) {
    if (ids.has(c.from_book_id) && ids.has(c.to_book_id)) {
      edges.push({ source: c.from_book_id, target: c.to_book_id, type: 'manual', label: c.label, weight: 1 });
      strong.add(key(c.from_book_id, c.to_book_id));
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].genres.filter((g) => nodes[j].genres.includes(g) && g !== 'classics' && g !== 'literary').length;
      if (shared && !strong.has(key(nodes[i].id, nodes[j].id))) {
        edges.push({ source: nodes[i].id, target: nodes[j].id, type: 'shared_genre', label: null, weight: shared * 0.5 });
      }
    }
  }
  const counts = {};
  for (const n of nodes) for (const t of n.tags) counts[t] = (counts[t] || 0) + 1;
  const topTags = Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  return { nodes, edges, topTags };
}

function insights() {
  const counts = {};
  for (const e of state.journal) for (const t of new Set(e.tags)) counts[t] = (counts[t] || 0) + 1;
  const rank = (m) => Object.entries(m).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
  const quarters = {};
  for (const ub of state.lib.filter((u) => u.status === 'read' && u.finished_at)) {
    const q = `${ub.finished_at.slice(0, 4)}-Q${Math.ceil(Number(ub.finished_at.slice(5, 7)) / 3)}`;
    const entry = (quarters[q] ||= { period: q, books: 0, tags: {} });
    entry.books++;
    for (const t of new Set(state.journal.filter((e) => e.book_id === ub.book_id).flatMap((e) => e.tags))) entry.tags[t] = (entry.tags[t] || 0) + 1;
  }
  const phases = Object.values(quarters).sort((a, b) => (a.period < b.period ? 1 : -1)).slice(0, 8)
    .map((q) => ({ period: q.period, books: q.books, topTags: rank(q.tags).slice(0, 3) }));
  const latest = phases.find((p) => p.topTags.length);
  return {
    topTags: rank(counts).slice(0, 10),
    phases,
    headline: latest ? `In ${latest.period.replace('-', ' ')}, you kept coming back to "${latest.topTags[0].tag}" (${latest.topTags[0].count} of ${latest.books} books).` : null,
  };
}

function search(q) {
  const term = q.toLowerCase();
  return [...BOOKS, ...EXTRA].filter((b) => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.genres.some((g) => g.includes(term)));
}

/** Route a fake API call. Mirrors the shapes returned by the real routes. */
export async function mockApi(path, { method = 'GET', body } = {}) {
  if (!state) seed();
  await sleep(180 + Math.round(Math.random() * 220));

  const url = new URL(path, 'http://mock.local');
  const p = url.pathname;
  const q = url.searchParams;
  const next = () => `m${state.counter++}`;

  if (method === 'GET') {
    if (p === '/api/user') return { data: clone(state.user) };
    if (p === '/api/library') {
      const status = q.get('status');
      return { data: clone(state.lib.filter((ub) => !status || ub.status === status).map(withBook)) };
    }
    if (p === '/api/analytics') return clone(analytics(Number(q.get('year')) || new Date().getFullYear()));
    if (p === '/api/constellation') return clone(constellation(q.get('year')));
    if (p === '/api/insights') return clone(insights());
    if (p === '/api/goals') {
      const year = Number(q.get('year')) || new Date().getFullYear();
      return { data: clone(state.goals.filter((g) => g.year === year).map((g) => ({ ...g, current: goalCurrent(g) }))) };
    }
    if (p === '/api/shelves') return { data: clone(state.shelves.map(({ ids, ...s }) => ({ ...s, book_count: ids.length }))) };
    const shelfBooks = p.match(/^\/api\/shelves\/([^/]+)\/books$/);
    if (shelfBooks) {
      const shelf = state.shelves.find((s) => s.id === shelfBooks[1]);
      return { data: clone((shelf?.ids || []).map((book_id) => ({ book_id, added_at: new Date().toISOString(), book: bookOf(book_id) }))) };
    }
    if (p === '/api/journal') {
      let rows = [...state.journal].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (q.get('book_id')) rows = rows.filter((e) => e.book_id === q.get('book_id'));
      if (q.get('tag')) rows = rows.filter((e) => e.tags.includes(q.get('tag')));
      return { data: clone(rows.slice(0, Number(q.get('limit')) || 100)) };
    }
    if (p === '/api/tags') {
      const prefix = (q.get('q') || '').toLowerCase();
      const counts = {};
      for (const e of state.journal) for (const t of e.tags) if (t.startsWith(prefix)) counts[t] = (counts[t] || 0) + 1;
      return { data: Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count) };
    }
    const one = p.match(/^\/api\/books\/([^/]+)$/);
    if (one && one[1] !== 'search') {
      const found = bookOf(one[1]);
      if (!found) throw new Error('Book not found');
      return clone(found);
    }
    if (p === '/api/books/search') {
      const books = search(q.get('q') || '');
      return { books: clone(books), totalItems: books.length, source: 'google' };
    }
  }

  if (method === 'POST') {
    if (p === '/api/library') {
      const existing = state.lib.find((ub) => ub.book_id === body.book_id);
      if (existing) {
        existing.status = body.status;
        if (body.status === 'reading' && !existing.started_at) existing.started_at = daysAgo(0);
        if (body.status === 'read') existing.finished_at = daysAgo(0);
        return { data: clone(existing) };
      }
      const row = {
        id: next(), user_id: 'mock', book_id: body.book_id, status: body.status, rating: null, progress: 0,
        started_at: body.status === 'reading' ? daysAgo(0) : null, finished_at: body.status === 'read' ? daysAgo(0) : null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      state.lib.unshift(row);
      return { data: clone(row) };
    }
    if (p === '/api/sessions') {
      const row = state.lib.find((ub) => ub.book_id === body.book_id);
      if (row) row.progress = Number(row.progress || 0) + Number(body.pages_read || 0);
      const day = body.session_date || daysAgo(0);
      const cell = (state.sessions[day] ||= { pages: 0, minutes: 0, sessions: 0 });
      cell.pages += Number(body.pages_read || 0);
      cell.sessions++;
      return { data: { id: next() }, user_book: clone(row || {}) };
    }
    if (p === '/api/journal') {
      const row = {
        id: next(), user_id: 'mock', book_id: body.book_id, content: body.content || null, quote: body.quote || null,
        page_number: body.page_number || null, tags: (body.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean),
        created_at: new Date().toISOString(),
      };
      state.journal.unshift(row);
      return { data: clone(row) };
    }
    if (p === '/api/connections') {
      state.connections.push({ id: next(), user_id: 'mock', from_book_id: body.from_book_id, to_book_id: body.to_book_id, connection_type: 'manual', label: body.label || null, weight: 1 });
      return { data: { ok: true } };
    }
    if (p === '/api/shelves') {
      const shelf = { id: next(), name: body.name, book_count: 0, ids: [] };
      state.shelves.push(shelf);
      return { data: clone(shelf) };
    }
    if (p === '/api/goals') {
      const year = body.year || new Date().getFullYear();
      const found = state.goals.find((g) => g.type === body.type && g.year === year);
      if (found) found.target = body.target;
      else state.goals.push({ id: next(), type: body.type, target: body.target, year });
      return { data: { ok: true } };
    }
    if (p === '/api/constellation/recompute') return { success: true, tagEdges: 12, genreEdges: 4 };
    if (p === '/api/import/goodreads') {
      const total = 75;
      const offset = body.offset || 0;
      const processed = Math.min(30, total - offset);
      const done = offset + processed >= total;
      return {
        total, processed, imported: processed - (done ? 2 : 0), alreadyInLibrary: 0, skipped: 0,
        failed: done ? ['An Obscure Self-Published Title'] : [], nextOffset: done ? null : offset + processed,
      };
    }
  }

  if (method === 'PATCH') {
    if (p === '/api/library') {
      const row = state.lib.find((ub) => ub.id === body.id);
      if (!row) throw new Error('Not found');
      for (const k of ['status', 'rating', 'progress', 'started_at', 'finished_at']) if (body[k] !== undefined) row[k] = body[k];
      if (body.status === 'read' && body.finished_at === undefined) row.finished_at = daysAgo(0);
      return { data: clone(row) };
    }
    if (p === '/api/user') {
      for (const k of ['name', 'bio', 'avatar_url']) if (body[k] !== undefined) state.user[k] = body[k];
      return { data: clone(state.user) };
    }
  }

  if (method === 'DELETE') {
    if (p === '/api/library') {
      state.lib = state.lib.filter((ub) => ub.id !== body.id);
      return { success: true };
    }
    if (p === '/api/journal') {
      state.journal = state.journal.filter((e) => e.id !== body.id);
      return { success: true };
    }
    if (p === '/api/shelves') {
      state.shelves = state.shelves.filter((s) => s.id !== body.id);
      return { success: true };
    }
  }

  throw new Error(`Review mode has no sample data for ${method} ${p}`);
}
