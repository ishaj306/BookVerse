import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { recomputeAllConnections, safeRecompute } from '@/lib/constellation';
import { parseCsv } from '@/lib/csv';
import { findOrCacheBook } from '@/lib/google-books';
import { mapGoodreadsRow } from '@/lib/goodreads';
import { ApiError, rateLimit, readJson } from '@/lib/http';
import { optionalInt } from '@/lib/validate';

export const maxDuration = 60;

const MAX_CSV_CHARS = 2_000_000;
const CHUNK_SIZE = 30;
const CONCURRENCY = 4;

/** Run `fn` over `items` with at most `limit` in flight, keeping order. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * POST /api/import/goodreads
 *
 * Import a Goodreads library export (goodreads_library_export.csv).
 * Body: { csv: "<file contents>", offset?: 0 }
 *
 * Rows are processed in chunks of 30 so a request stays fast. The response
 * carries `nextOffset`; call again with it until it is null. Books already in
 * the library are left untouched. When the last chunk finishes, constellation
 * edges are rebuilt once.
 */
export async function POST(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const body = await readJson(request);

    if (typeof body.csv !== 'string' || body.csv.length === 0) {
      throw new ApiError(400, 'csv (the file contents) is required');
    }
    if (body.csv.length > MAX_CSV_CHARS) throw new ApiError(413, 'That file is too large to import');

    const offset = optionalInt(body.offset ?? 0, 'offset', { min: 0 });
    rateLimit(`import:${userId}`, 200, 60 * 60_000);

    const rows = parseCsv(body.csv);
    if (rows.length > 0 && !('Title' in rows[0])) {
      throw new ApiError(400, 'This does not look like a Goodreads export (no Title column)');
    }

    const total = rows.length;
    const chunk = rows.slice(offset, offset + CHUNK_SIZE);
    const nextOffset = offset + chunk.length < total ? offset + chunk.length : null;

    await ensureUser(userId, supabase);

    const mapped = chunk.map(mapGoodreadsRow);
    const results = await mapWithConcurrency(mapped, CONCURRENCY, async (item) => {
      if (!item) return { skipped: 'no title' };
      const book = await findOrCacheBook(item, serviceClient);
      return book ? { item, book } : { failed: item.title };
    });

    const toInsert = new Map();
    const failed = [];
    let skipped = 0;
    for (const r of results) {
      if (r.skipped) skipped++;
      else if (r.failed) failed.push(r.failed);
      else if (!toInsert.has(r.book.id)) {
        const { item, book } = r;
        const row = { user_id: userId, book_id: book.id, status: item.status };
        if (item.rating) row.rating = item.rating;
        if (item.startedAt) row.started_at = item.startedAt;
        if (item.finishedAt) row.finished_at = item.finishedAt;
        const pages = item.pages || book.pages;
        if (item.status === 'read' && pages) row.progress = pages;
        toInsert.set(book.id, row);
      }
    }

    let imported = 0;
    if (toInsert.size > 0) {
      // ignoreDuplicates: never overwrite a book the user already tracks.
      const { data, error } = await supabase
        .from('user_books')
        .upsert([...toInsert.values()], { onConflict: 'user_id,book_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      imported = data?.length || 0;
    }

    if (nextOffset === null) {
      await safeRecompute('goodreads import', () => recomputeAllConnections(userId, supabase, serviceClient));
    }

    return Response.json({
      total,
      processed: chunk.length,
      imported,
      alreadyInLibrary: toInsert.size - imported,
      skipped,
      failed,
      nextOffset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
