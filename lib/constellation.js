/**
 * Constellation edge computation.
 *
 * Shared-tag and shared-genre edges are derived from a user's journal tags and
 * the genres on their library books, and stored in `book_connections` so the
 * graph does not have to be recomputed on every page load.
 *
 * Syncing is diff-based: edges are upserted first and only stale ones deleted,
 * so a failure part-way never leaves a user with an empty graph.
 */

import { buildPairEdges, diffEdges, makeGenreSkip, pairKey } from './edges.js';
import { normalizeTag } from './validate.js';

const CONFLICT_COLUMNS = 'user_id,from_book_id,to_book_id,connection_type';

async function getLibraryBookIds(userId, supabase) {
  const { data, error } = await supabase
    .from('user_books')
    .select('book_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((row) => row.book_id);
}

async function syncEdges(userId, supabase, connectionType, edgeMap) {
  const { data: existing, error } = await supabase
    .from('book_connections')
    .select('id, from_book_id, to_book_id, weight')
    .eq('user_id', userId)
    .eq('connection_type', connectionType);

  if (error) throw error;

  const { upsert, staleIds } = diffEdges(existing || [], edgeMap, userId, connectionType);

  if (upsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('book_connections')
      .upsert(upsert, { onConflict: CONFLICT_COLUMNS });
    if (upsertError) throw upsertError;
  }

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('book_connections')
      .delete()
      .eq('user_id', userId)
      .in('id', staleIds);
    if (deleteError) throw deleteError;
  }

  return { edgesCreated: edgeMap.size, upserted: upsert.length, removed: staleIds.length };
}

/**
 * Rebuild shared-tag connections from journal tags. Only books currently in
 * the library count.
 */
export async function recomputeTagConnections(userId, supabase) {
  const [libraryIds, entriesResult] = await Promise.all([
    getLibraryBookIds(userId, supabase),
    supabase.from('journal_entries').select('book_id, tags').eq('user_id', userId),
  ]);

  if (entriesResult.error) throw entriesResult.error;

  const inLibrary = new Set(libraryIds);
  const tagToBooks = new Map();

  for (const entry of entriesResult.data || []) {
    if (!inLibrary.has(entry.book_id)) continue;
    for (const raw of entry.tags || []) {
      const tag = normalizeTag(raw);
      if (!tag) continue;
      if (!tagToBooks.has(tag)) tagToBooks.set(tag, new Set());
      tagToBooks.get(tag).add(entry.book_id);
    }
  }

  return syncEdges(userId, supabase, 'shared_tag', buildPairEdges(tagToBooks));
}

/**
 * Rebuild shared-genre connections from book_cache genres. Genres held by most
 * of the library are ignored, and genre edges are weighted below tag edges.
 */
export async function recomputeGenreConnections(userId, supabase, serviceClient) {
  const bookIds = await getLibraryBookIds(userId, supabase);

  let groups = new Map();
  if (bookIds.length >= 2) {
    const { data: books, error } = await serviceClient
      .from('book_cache')
      .select('id, genres')
      .in('id', bookIds);

    if (error) throw error;

    for (const book of books || []) {
      for (const raw of book.genres || []) {
        const genre = normalizeTag(raw);
        if (!genre) continue;
        if (!groups.has(genre)) groups.set(genre, new Set());
        groups.get(genre).add(book.id);
      }
    }
  }

  const edges = buildPairEdges(groups, {
    weightPerShared: 0.5,
    skip: makeGenreSkip(bookIds.length),
  });

  return syncEdges(userId, supabase, 'shared_genre', edges);
}

/** Recompute both edge types. Used after imports and bulk changes. */
export async function recomputeAllConnections(userId, supabase, serviceClient) {
  const [tags, genres] = await Promise.all([
    recomputeTagConnections(userId, supabase),
    recomputeGenreConnections(userId, supabase, serviceClient),
  ]);
  return { tags, genres };
}

/**
 * Best-effort recompute for write routes: the write already succeeded, so a
 * failure here is logged rather than returned.
 */
export async function safeRecompute(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Constellation recompute failed (${label}):`, error);
    return null;
  }
}

/**
 * Get the constellation graph for a user, ready for d3-force.
 *
 * @param {object} [options]
 * @param {number} [options.year] - only books finished in this year
 * @returns {Promise<{nodes: object[], edges: object[], topTags: object[]}>}
 */
export async function getConstellationGraph(userId, supabase, serviceClient, options = {}) {
  const { year } = options;

  const { data: userBooks, error: ubError } = await supabase
    .from('user_books')
    .select('book_id, status, rating, started_at, finished_at')
    .eq('user_id', userId);

  if (ubError) throw ubError;

  let libraryRows = userBooks || [];
  if (year) {
    libraryRows = libraryRows.filter((ub) => ub.finished_at && ub.finished_at.startsWith(String(year)));
  }
  if (libraryRows.length === 0) return { nodes: [], edges: [], topTags: [] };

  const bookIds = libraryRows.map((ub) => ub.book_id);

  const [booksResult, entriesResult, connectionsResult] = await Promise.all([
    serviceClient.from('book_cache').select('id, title, author, cover_url, genres, pages').in('id', bookIds),
    supabase.from('journal_entries').select('book_id, tags').eq('user_id', userId).in('book_id', bookIds),
    supabase
      .from('book_connections')
      .select('from_book_id, to_book_id, connection_type, label, weight')
      .eq('user_id', userId),
  ]);

  for (const result of [booksResult, entriesResult, connectionsResult]) {
    if (result.error) throw result.error;
  }

  const bookTags = new Map();
  const tagCounts = new Map();
  for (const entry of entriesResult.data || []) {
    if (!bookTags.has(entry.book_id)) bookTags.set(entry.book_id, new Set());
    for (const raw of entry.tags || []) {
      const tag = normalizeTag(raw);
      if (tag) bookTags.get(entry.book_id).add(tag);
    }
  }
  for (const tags of bookTags.values()) {
    for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }

  const libraryMap = new Map(libraryRows.map((ub) => [ub.book_id, ub]));
  const nodes = (booksResult.data || []).map((book) => {
    const ub = libraryMap.get(book.id);
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url,
      pages: book.pages,
      genres: book.genres || [],
      tags: [...(bookTags.get(book.id) || [])],
      status: ub?.status || null,
      rating: ub?.rating ?? null,
      startedAt: ub?.started_at || null,
      finishedAt: ub?.finished_at || null,
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const rows = (connectionsResult.data || []).filter(
    (c) => nodeIds.has(c.from_book_id) && nodeIds.has(c.to_book_id)
  );

  // A genre edge between two books that already share a tag or a manual link
  // adds nothing, so drop it to keep the graph readable.
  const strongPairs = new Set(
    rows.filter((c) => c.connection_type !== 'shared_genre').map((c) => pairKey(c.from_book_id, c.to_book_id))
  );

  const edges = rows
    .filter((c) => c.connection_type !== 'shared_genre' || !strongPairs.has(pairKey(c.from_book_id, c.to_book_id)))
    .map((c) => ({
      source: c.from_book_id,
      target: c.to_book_id,
      type: c.connection_type,
      label: c.label,
      weight: Number(c.weight),
    }));

  const topTags = [...tagCounts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 15);

  return { nodes, edges, topTags };
}
