/**
 * Map one row of a Goodreads library export CSV onto BookVerse fields.
 */

const SHELF_TO_STATUS = {
  'to-read': 'want',
  'currently-reading': 'reading',
  read: 'read',
};

/** Goodreads wraps ISBNs like ="0123456789". */
export function cleanIsbn(value) {
  const digits = String(value || '').replace(/[^0-9Xx]/g, '');
  return digits.length === 10 || digits.length === 13 ? digits.toUpperCase() : null;
}

/** "2023/05/14" -> "2023-05-14"; anything else -> null. */
export function cleanDate(value) {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(String(value || '').trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function mapGoodreadsRow(row) {
  const title = (row['Title'] || '').trim();
  if (!title) return null;

  const shelf = (row['Exclusive Shelf'] || '').trim().toLowerCase();
  const status = SHELF_TO_STATUS[shelf] || 'want';

  const rating = Number(row['My Rating']);
  const pages = parseInt(row['Number of Pages'], 10);

  return {
    title,
    author: (row['Author'] || '').trim() || null,
    isbn: cleanIsbn(row['ISBN13']) || cleanIsbn(row['ISBN']),
    status,
    rating: rating >= 1 && rating <= 5 ? rating : null,
    pages: Number.isFinite(pages) && pages > 0 ? pages : null,
    finishedAt: status === 'read' ? cleanDate(row['Date Read']) || cleanDate(row['Date Added']) : null,
    startedAt: status === 'reading' ? cleanDate(row['Date Added']) : null,
  };
}
