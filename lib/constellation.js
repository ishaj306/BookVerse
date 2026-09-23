/**
 * Constellation edge computation logic.
 *
 * Computes shared-tag and shared-genre edges between books in a user's library,
 * based on their journal entries and the book_cache genre data.
 *
 * Edges are written to `book_connections` on demand (when a journal entry
 * is created/updated) rather than recomputed on every page load.
 */

/**
 * Recompute all shared-tag connections for a user after a journal entry changes.
 * Deletes existing shared_tag connections and rebuilds from current journal tags.
 *
 * @param {string} userId - Clerk user ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Authenticated Supabase client
 */
export async function recomputeTagConnections(userId, supabase) {
  // 1. Get all journal entries with their tags for this user
  const { data: entries, error: entriesError } = await supabase
    .from('journal_entries')
    .select('book_id, tags')
    .eq('user_id', userId);

  if (entriesError) {
    console.error('Error fetching journal entries for constellation:', entriesError);
    throw entriesError;
  }

  // 2. Build a map: tag -> set of book_ids
  const tagToBooks = new Map();
  for (const entry of entries || []) {
    if (!entry.tags || entry.tags.length === 0) continue;
    for (const tag of entry.tags) {
      const normalizedTag = tag.toLowerCase().trim();
      if (!tagToBooks.has(normalizedTag)) {
        tagToBooks.set(normalizedTag, new Set());
      }
      tagToBooks.get(normalizedTag).add(entry.book_id);
    }
  }

  // 3. Compute edges: for every tag shared by 2+ books, create connections
  const edgeMap = new Map(); // "bookA-bookB" -> weight
  for (const [, bookIds] of tagToBooks) {
    const books = Array.from(bookIds);
    if (books.length < 2) continue;

    for (let i = 0; i < books.length; i++) {
      for (let j = i + 1; j < books.length; j++) {
        // Canonical key: always smaller UUID first for dedup
        const [a, b] = books[i] < books[j] ? [books[i], books[j]] : [books[j], books[i]];
        const key = `${a}-${b}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }

  // 4. Delete existing shared_tag connections for this user
  const { error: deleteError } = await supabase
    .from('book_connections')
    .delete()
    .eq('user_id', userId)
    .eq('connection_type', 'shared_tag');

  if (deleteError) {
    console.error('Error deleting old tag connections:', deleteError);
    throw deleteError;
  }

  // 5. Insert new edges
  const edges = Array.from(edgeMap.entries()).map(([key, weight]) => {
    const [fromBookId, toBookId] = key.split('-');
    return {
      user_id: userId,
      from_book_id: fromBookId,
      to_book_id: toBookId,
      connection_type: 'shared_tag',
      weight,
    };
  });

  if (edges.length > 0) {
    const { error: insertError } = await supabase
      .from('book_connections')
      .insert(edges);

    if (insertError) {
      console.error('Error inserting tag connections:', insertError);
      throw insertError;
    }
  }

  return { edgesCreated: edges.length };
}

/**
 * Recompute all shared-genre connections for a user.
 * Based on genres from book_cache for books in the user's library.
 *
 * @param {string} userId - Clerk user ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Authenticated Supabase client
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient - Service role client (for book_cache reads)
 */
export async function recomputeGenreConnections(userId, supabase, serviceClient) {
  // 1. Get all books in user's library
  const { data: userBooks, error: ubError } = await supabase
    .from('user_books')
    .select('book_id')
    .eq('user_id', userId);

  if (ubError) {
    console.error('Error fetching user books for genre connections:', ubError);
    throw ubError;
  }

  const bookIds = (userBooks || []).map((ub) => ub.book_id);
  if (bookIds.length < 2) return { edgesCreated: 0 };

  // 2. Get genres from book_cache (using service client — book_cache is shared)
  const { data: books, error: booksError } = await serviceClient
    .from('book_cache')
    .select('id, genres')
    .in('id', bookIds);

  if (booksError) {
    console.error('Error fetching book genres:', booksError);
    throw booksError;
  }

  // 3. Build genre -> book_ids map
  const genreToBooks = new Map();
  for (const book of books || []) {
    if (!book.genres || book.genres.length === 0) continue;
    for (const genre of book.genres) {
      const normalizedGenre = genre.toLowerCase().trim();
      if (!genreToBooks.has(normalizedGenre)) {
        genreToBooks.set(normalizedGenre, new Set());
      }
      genreToBooks.get(normalizedGenre).add(book.id);
    }
  }

  // 4. Compute edges
  const edgeMap = new Map();
  for (const [, genreBookIds] of genreToBooks) {
    const genreBooks = Array.from(genreBookIds);
    if (genreBooks.length < 2) continue;

    for (let i = 0; i < genreBooks.length; i++) {
      for (let j = i + 1; j < genreBooks.length; j++) {
        const [a, b] =
          genreBooks[i] < genreBooks[j]
            ? [genreBooks[i], genreBooks[j]]
            : [genreBooks[j], genreBooks[i]];
        const key = `${a}-${b}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }

  // 5. Delete existing shared_genre connections
  const { error: deleteError } = await supabase
    .from('book_connections')
    .delete()
    .eq('user_id', userId)
    .eq('connection_type', 'shared_genre');

  if (deleteError) {
    console.error('Error deleting old genre connections:', deleteError);
    throw deleteError;
  }

  // 6. Insert new edges
  const edges = Array.from(edgeMap.entries()).map(([key, weight]) => {
    const [fromBookId, toBookId] = key.split('-');
    return {
      user_id: userId,
      from_book_id: fromBookId,
      to_book_id: toBookId,
      connection_type: 'shared_genre',
      weight,
    };
  });

  if (edges.length > 0) {
    const { error: insertError } = await supabase
      .from('book_connections')
      .insert(edges);

    if (insertError) {
      console.error('Error inserting genre connections:', insertError);
      throw insertError;
    }
  }

  return { edgesCreated: edges.length };
}

/**
 * Get the full constellation graph data for a user.
 * Returns nodes (books) and edges (connections) ready for d3-force rendering.
 *
 * @param {string} userId - Clerk user ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Authenticated Supabase client
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient - Service role client
 * @returns {Promise<{nodes: object[], edges: object[]}>}
 */
export async function getConstellationGraph(userId, supabase, serviceClient) {
  // 1. Get all user's books
  const { data: userBooks, error: ubError } = await supabase
    .from('user_books')
    .select('book_id, status, rating')
    .eq('user_id', userId);

  if (ubError) throw ubError;

  const bookIds = (userBooks || []).map((ub) => ub.book_id);
  if (bookIds.length === 0) return { nodes: [], edges: [] };

  // 2. Get book details from cache
  const { data: books, error: booksError } = await serviceClient
    .from('book_cache')
    .select('id, title, author, cover_url, genres')
    .in('id', bookIds);

  if (booksError) throw booksError;

  // 3. Get all tags per book from journal entries
  const { data: entries, error: entriesError } = await supabase
    .from('journal_entries')
    .select('book_id, tags')
    .eq('user_id', userId);

  if (entriesError) throw entriesError;

  const bookTagsMap = new Map();
  for (const entry of entries || []) {
    if (!entry.tags || entry.tags.length === 0) continue;
    if (!bookTagsMap.has(entry.book_id)) {
      bookTagsMap.set(entry.book_id, new Set());
    }
    for (const tag of entry.tags) {
      bookTagsMap.get(entry.book_id).add(tag.toLowerCase().trim());
    }
  }

  // 4. Build nodes
  const userBookMap = new Map((userBooks || []).map((ub) => [ub.book_id, ub]));
  const nodes = (books || []).map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url,
    genres: book.genres || [],
    tags: Array.from(bookTagsMap.get(book.id) || []),
    status: userBookMap.get(book.id)?.status || null,
    rating: userBookMap.get(book.id)?.rating || null,
  }));

  // 5. Get all connections
  const { data: connections, error: connError } = await supabase
    .from('book_connections')
    .select('from_book_id, to_book_id, connection_type, label, weight')
    .eq('user_id', userId);

  if (connError) throw connError;

  const edges = (connections || []).map((conn) => ({
    source: conn.from_book_id,
    target: conn.to_book_id,
    type: conn.connection_type,
    label: conn.label,
    weight: conn.weight,
  }));

  return { nodes, edges };
}
