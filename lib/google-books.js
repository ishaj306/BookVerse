const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Search Google Books API.
 *
 * @param {string} query - Search query (title, author, isbn, etc.)
 * @param {number} [maxResults=20] - Maximum results to return (1-40)
 * @param {number} [startIndex=0] - Pagination offset
 * @returns {Promise<object>} - Parsed Google Books API response
 */
export async function searchGoogleBooks(query, maxResults = 20, startIndex = 0) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_BOOKS_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: Math.min(maxResults, 40).toString(),
    startIndex: startIndex.toString(),
    key: apiKey,
    printType: 'books',
  });

  const response = await fetch(`${GOOGLE_BOOKS_BASE_URL}?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Books API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Get a single volume by Google Books volume ID.
 *
 * @param {string} volumeId - Google Books volume ID
 * @returns {Promise<object>} - Parsed volume data
 */
export async function getGoogleBooksVolume(volumeId) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_BOOKS_API_KEY is not configured');
  }

  const response = await fetch(
    `${GOOGLE_BOOKS_BASE_URL}/${volumeId}?key=${apiKey}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Books API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Normalize a Google Books volume into our book_cache shape.
 *
 * @param {object} volume - Raw Google Books API volume object
 * @returns {object} - Normalized book data matching the book_cache schema
 */
export function normalizeVolume(volume) {
  const info = volume.volumeInfo || {};

  // Prefer the highest-resolution thumbnail available
  const imageLinks = info.imageLinks || {};
  const coverUrl =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    null;

  // Extract ISBN-13, fall back to ISBN-10
  const identifiers = info.industryIdentifiers || [];
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
  const isbn = isbn13?.identifier || isbn10?.identifier || null;

  return {
    source_id: volume.id,
    title: info.title || 'Untitled',
    author: (info.authors || []).join(', ') || null,
    description: info.description || null,
    isbn,
    cover_url: coverUrl ? coverUrl.replace('http://', 'https://') : null,
    publication_date: info.publishedDate || null,
    pages: info.pageCount || null,
    genres: info.categories || [],
  };
}

/**
 * Search for books, checking the local Supabase cache first.
 * On cache miss, fetches from Google Books API and populates the cache.
 *
 * @param {string} query - Search query
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient - Service role Supabase client
 * @param {object} [options] - Options
 * @param {number} [options.maxResults=20] - Max results
 * @param {number} [options.startIndex=0] - Pagination offset
 * @returns {Promise<object[]>} - Array of normalized book objects with cache IDs
 */
export async function searchBooksWithCache(query, serviceClient, options = {}) {
  const { maxResults = 20, startIndex = 0 } = options;

  // 1. Search Google Books
  const apiResponse = await searchGoogleBooks(query, maxResults, startIndex);
  const items = apiResponse.items || [];

  if (items.length === 0) {
    return { books: [], totalItems: apiResponse.totalItems || 0 };
  }

  // 2. Normalize all volumes
  const normalized = items.map(normalizeVolume);
  const sourceIds = normalized.map((b) => b.source_id);

  // 3. Check which ones are already cached
  const { data: cached } = await serviceClient
    .from('book_cache')
    .select('id, source_id')
    .in('source_id', sourceIds);

  const cachedMap = new Map((cached || []).map((c) => [c.source_id, c.id]));

  // 4. Upsert any new books into the cache
  const toInsert = normalized.filter((b) => !cachedMap.has(b.source_id));

  if (toInsert.length > 0) {
    const { data: inserted, error } = await serviceClient
      .from('book_cache')
      .upsert(toInsert, { onConflict: 'source_id' })
      .select('id, source_id');

    if (error) {
      console.error('Error caching books:', error);
    } else if (inserted) {
      inserted.forEach((row) => cachedMap.set(row.source_id, row.id));
    }
  }

  // 5. Return books with their cache IDs
  const books = normalized.map((b) => ({
    ...b,
    id: cachedMap.get(b.source_id) || null,
  }));

  return { books, totalItems: apiResponse.totalItems || 0 };
}
