/**
 * Pure helpers for building Constellation edges. No I/O, so they are easy to test.
 *
 * Edge keys use '|' as the separator. UUIDs contain '-', so a '-' separator
 * cannot be split back apart safely.
 */

/** Canonical, order-independent key for a pair of book ids. */
export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function splitPairKey(key) {
  return key.split('|');
}

/**
 * Build a weighted edge map from groups of books that share something.
 *
 * @param {Map<string, Iterable<string>>} groups - label (tag/genre) -> book ids
 * @param {object} [options]
 * @param {number} [options.weightPerShared=1] - weight added per shared label
 * @param {number} [options.maxGroupSize=60] - skip labels on more books than this
 * @param {(label: string, bookIds: string[]) => boolean} [options.skip] - custom skip rule
 * @returns {Map<string, number>} pairKey -> weight
 */
export function buildPairEdges(groups, options = {}) {
  const { weightPerShared = 1, maxGroupSize = 60, skip } = options;
  const edges = new Map();

  for (const [label, ids] of groups) {
    const books = [...new Set(ids)];
    if (books.length < 2 || books.length > maxGroupSize) continue;
    if (skip && skip(label, books)) continue;

    for (let i = 0; i < books.length; i++) {
      for (let j = i + 1; j < books.length; j++) {
        const key = pairKey(books[i], books[j]);
        edges.set(key, (edges.get(key) || 0) + weightPerShared);
      }
    }
  }
  return edges;
}

/** Turn an edge map into book_connections rows. */
export function edgeRows(edgeMap, userId, connectionType) {
  return [...edgeMap].map(([key, weight]) => {
    const [from, to] = splitPairKey(key);
    return {
      user_id: userId,
      from_book_id: from,
      to_book_id: to,
      connection_type: connectionType,
      weight,
    };
  });
}

/**
 * Compare stored rows against a desired edge map.
 * @returns {{ upsert: object[], staleIds: string[] }}
 */
export function diffEdges(existingRows, edgeMap, userId, connectionType) {
  const existing = new Map(existingRows.map((r) => [pairKey(r.from_book_id, r.to_book_id), r]));

  const upsert = edgeRows(edgeMap, userId, connectionType).filter((row) => {
    const prev = existing.get(pairKey(row.from_book_id, row.to_book_id));
    return !prev || Number(prev.weight) !== row.weight;
  });

  const staleIds = existingRows
    .filter((r) => !edgeMap.has(pairKey(r.from_book_id, r.to_book_id)))
    .map((r) => r.id);

  return { upsert, staleIds };
}

/**
 * Genre edges are noisy: if a genre covers most of a library it links
 * everything to everything. Skip genres held by more than half the books
 * once the library is big enough for that to mean anything.
 */
export function makeGenreSkip(totalBooks) {
  return (_label, books) => totalBooks >= 6 && books.length / totalBooks > 0.5;
}
