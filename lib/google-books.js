import { normalizeGenres } from './genres.js';
import { searchOpenLibrary, normalizeOpenLibraryDoc } from './open-library.js';

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
    `${GOOGLE_BOOKS_BASE_URL}/${encodeURIComponent(volumeId)}?key=${apiKey}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Books API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * The book_cache.publication_date column is a Postgres `date`, but Google
 * often returns just "2011" or "2011-05". Pad those, and drop anything else.
 */
export function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
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
    publication_date: normalizeDate(info.publishedDate),
    pages: info.pageCount || null,
    genres: normalizeGenres(info.categories),
  };
}

/** Escape a user string for use inside an ilike pattern. */
function escapeLike(value) {
  return value.replace(/[\\%_,()]/g, ' ').trim();
}

/**
 * Write normalized books into book_cache and return them with their ids.
 * Existing rows (same source_id) are left as they are.
 */
export async function cacheBooks(normalized, serviceClient) {
  if (normalized.length === 0) return [];

  const sourceIds = normalized.map((b) => b.source_id);

  const { data: cached } = await serviceClient
    .from('book_cache')
    .select('id, source_id')
    .in('source_id', sourceIds);

  const idBySource = new Map((cached || []).map((c) => [c.source_id, c.id]));
  const toInsert = normalized.filter((b) => !idBySource.has(b.source_id));

  if (toInsert.length > 0) {
    const { data: inserted, error } = await serviceClient
      .from('book_cache')
      .upsert(toInsert, { onConflict: 'source_id' })
      .select('id, source_id');

    if (error) {
      console.error('Error caching books:', error);
    } else {
      for (const row of inserted || []) idBySource.set(row.source_id, row.id);
    }
  }

  return normalized.map((b) => ({ ...b, id: idBySource.get(b.source_id) || null }));
}

/** Look for books already in the local cache before spending an API call. */
async function searchCache(query, serviceClient, limit) {
  const term = escapeLike(query);
  if (term.length < 2) return [];

  const { data, error } = await serviceClient
    .from('book_cache')
    .select('*')
    .or(`title.ilike.%${term}%,author.ilike.%${term}%`)
    .limit(limit);

  return error ? [] : data || [];
}

/**
 * Search for books, cache first. On a cache miss, ask Google Books, then fall
 * back to Open Library if Google fails or finds nothing. Results are written
 * back to the cache.
 *
 * @param {string} query - Search query
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient - Service role Supabase client
 * @param {object} [options]
 * @param {number} [options.maxResults=20]
 * @param {number} [options.startIndex=0]
 * @returns {Promise<{books: object[], totalItems: number, source: string}>}
 */
export async function searchBooksWithCache(query, serviceClient, options = {}) {
  const { maxResults = 20, startIndex = 0 } = options;

  // 1. Enough local matches on the first page? No API call needed.
  if (startIndex === 0) {
    const local = await searchCache(query, serviceClient, maxResults);
    if (local.length >= Math.min(8, maxResults)) {
      return { books: local, totalItems: local.length, source: 'cache' };
    }
  }

  // 2. Google Books
  let normalized = [];
  let totalItems = 0;
  let source = 'google';

  try {
    const apiResponse = await searchGoogleBooks(query, maxResults, startIndex);
    normalized = (apiResponse.items || []).map(normalizeVolume);
    totalItems = apiResponse.totalItems || 0;
  } catch (error) {
    console.error('Google Books search failed, trying Open Library:', error.message);
  }

  // 3. Open Library fallback
  if (normalized.length === 0) {
    try {
      const ol = await searchOpenLibrary(query, maxResults, startIndex);
      normalized = (ol.docs || []).map(normalizeOpenLibraryDoc);
      totalItems = ol.numFound || normalized.length;
      source = 'openlibrary';
    } catch (error) {
      console.error('Open Library search failed:', error.message);
    }
  }

  const books = await cacheBooks(normalized, serviceClient);
  return { books, totalItems, source };
}

/**
 * Find the best cached/remote match for an imported row (ISBN first, then
 * title + author) and make sure it is in book_cache. Returns the cached book
 * or null.
 */
export async function findOrCacheBook({ title, author, isbn }, serviceClient) {
  if (isbn) {
    const { data } = await serviceClient.from('book_cache').select('*').eq('isbn', isbn).limit(1);
    if (data && data.length > 0) return data[0];
  }

  const queries = [];
  if (isbn) queries.push(`isbn:${isbn}`);
  if (title) queries.push(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);

  for (const q of queries) {
    try {
      const res = await searchGoogleBooks(q, 1, 0);
      const volume = (res.items || [])[0];
      if (volume) {
        const [book] = await cacheBooks([normalizeVolume(volume)], serviceClient);
        if (book?.id) return book;
      }
    } catch (error) {
      console.error('Book lookup failed:', error.message);
    }
  }

  try {
    const ol = await searchOpenLibrary(`${title}${author ? ` ${author}` : ''}`, 1, 0);
    const doc = (ol.docs || [])[0];
    if (doc) {
      const [book] = await cacheBooks([normalizeOpenLibraryDoc(doc)], serviceClient);
      if (book?.id) return book;
    }
  } catch (error) {
    console.error('Open Library lookup failed:', error.message);
  }

  return null;
}
