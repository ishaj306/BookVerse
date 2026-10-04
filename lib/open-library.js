import { normalizeGenres } from './genres.js';

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

/**
 * Search Open Library. Used as a fallback when Google Books fails or has
 * nothing for a query.
 */
export async function searchOpenLibrary(query, limit = 20, offset = 0) {
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(limit, 40)),
    offset: String(offset),
    fields: 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject',
  });

  const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params}`, {
    headers: { 'User-Agent': 'BookVerse/0.1 (reading archive)' },
  });

  if (!response.ok) {
    throw new Error(`Open Library error (${response.status})`);
  }
  return response.json();
}

/** Normalize an Open Library search doc into the book_cache shape. */
export function normalizeOpenLibraryDoc(doc) {
  return {
    source_id: `ol:${doc.key}`,
    title: doc.title || 'Untitled',
    author: (doc.author_name || []).join(', ') || null,
    description: null,
    isbn: (doc.isbn || []).find((i) => i.length === 13) || (doc.isbn || [])[0] || null,
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    publication_date: doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null,
    pages: doc.number_of_pages_median || null,
    genres: normalizeGenres((doc.subject || []).slice(0, 6)),
  };
}
