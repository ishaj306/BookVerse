const GENERIC = new Set(['general', 'books', 'literary collections']);

/**
 * Google Books returns categories like "Fiction / Romance / General".
 * Split them into individual lowercase genres so "romance" can match across
 * books, and drop generic filler.
 */
export function normalizeGenres(categories) {
  const out = new Set();
  for (const category of categories || []) {
    for (const part of String(category).split('/')) {
      const genre = part.trim().toLowerCase();
      if (genre && !GENERIC.has(genre)) out.add(genre);
    }
  }
  return [...out];
}
