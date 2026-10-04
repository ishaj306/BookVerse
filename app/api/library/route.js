import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import {
  recomputeGenreConnections,
  recomputeTagConnections,
  safeRecompute,
} from '@/lib/constellation';
import { ApiError, readJson } from '@/lib/http';
import {
  optionalDate,
  optionalNumber,
  optionalInt,
  optionalRating,
  requireStatus,
  requireUuid,
  resolveToday,
} from '@/lib/validate';

/**
 * GET /api/library?status=<status>&limit=<n>&offset=<n>
 *
 * The user's books, optionally filtered by status, joined with book_cache.
 */
export async function GET(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = optionalInt(searchParams.get('limit') ?? 200, 'limit', { min: 1, max: 500 });
    const offset = optionalInt(searchParams.get('offset') ?? 0, 'offset', { min: 0 });

    let query = supabase
      .from('user_books')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', requireStatus(status));

    const { data: userBooks, error } = await query;
    if (error) throw error;

    if (!userBooks || userBooks.length === 0) return Response.json({ data: [] });

    const { data: books, error: booksError } = await serviceClient
      .from('book_cache')
      .select('*')
      .in('id', userBooks.map((ub) => ub.book_id));
    if (booksError) throw booksError;

    const bookMap = new Map((books || []).map((b) => [b.id, b]));
    return Response.json({
      data: userBooks.map((ub) => ({ ...ub, book: bookMap.get(ub.book_id) || null })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/library
 *
 * Add a book to the user's library (or change its status if already there).
 * Body: { book_id, status, started_at?, finished_at?, today? }
 * `today` is the reader's local date (YYYY-MM-DD), used for auto-set dates.
 */
export async function POST(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const body = await readJson(request);

    const bookId = requireUuid(body.book_id, 'book_id');
    const status = requireStatus(body.status);
    const today = resolveToday(body.today);

    const { data: book } = await serviceClient
      .from('book_cache')
      .select('id')
      .eq('id', bookId)
      .maybeSingle();
    if (!book) throw new ApiError(404, 'Book not found. Search for it first.');

    await ensureUser(userId, supabase);

    const row = { user_id: userId, book_id: bookId, status };
    const startedAt =
      optionalDate(body.started_at, 'started_at') || (status === 'reading' ? today : null);
    if (startedAt) row.started_at = startedAt;
    const finishedAt = optionalDate(body.finished_at, 'finished_at') || (status === 'read' ? today : null);
    if (finishedAt) row.finished_at = finishedAt;

    const { data, error } = await supabase
      .from('user_books')
      .upsert(row, { onConflict: 'user_id,book_id' })
      .select()
      .single();
    if (error) throw error;

    await safeRecompute('library add', () => recomputeGenreConnections(userId, supabase, serviceClient));

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/library
 *
 * Update a book in the library.
 * Body: { id, status?, progress?, rating?, started_at?, finished_at?, today? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const id = requireUuid(body.id, 'id');
    const today = resolveToday(body.today);
    const updates = {};

    if (body.status !== undefined) updates.status = requireStatus(body.status);
    if (body.progress !== undefined) {
      updates.progress = optionalNumber(body.progress, 'progress', { min: 0, max: 100000 }) ?? 0;
    }
    if (body.rating !== undefined) updates.rating = optionalRating(body.rating);
    if (body.started_at !== undefined) updates.started_at = optionalDate(body.started_at, 'started_at');
    if (body.finished_at !== undefined) updates.finished_at = optionalDate(body.finished_at, 'finished_at');

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nothing to update. Allowed: status, progress, rating, started_at, finished_at');
    }

    // Sensible dates when the status moves, unless the caller set them.
    if (updates.status === 'read' && body.finished_at === undefined) updates.finished_at = today;
    if (updates.status === 'reading' && body.started_at === undefined) updates.started_at = today;

    const { data, error } = await supabase
      .from('user_books')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/library
 *
 * Remove a book from the library, along with its constellation connections.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { data: removed, error } = await supabase
      .from('user_books')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('book_id')
      .maybeSingle();
    if (error) throw error;
    if (!removed) throw new ApiError(404, 'Book not found in your library');

    const { error: connError } = await supabase
      .from('book_connections')
      .delete()
      .eq('user_id', userId)
      .or(`from_book_id.eq.${removed.book_id},to_book_id.eq.${removed.book_id}`);
    if (connError) console.error('Failed to clean up connections:', connError);

    await safeRecompute('library remove', async () => {
      await recomputeTagConnections(userId, supabase);
      await recomputeGenreConnections(userId, supabase, serviceClient);
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
