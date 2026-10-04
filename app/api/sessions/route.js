import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { ApiError, readJson } from '@/lib/http';
import {
  optionalDate,
  optionalInt,
  requireUuid,
  resolveToday,
} from '@/lib/validate';

/**
 * GET /api/sessions?book_id=<id>&from=<date>&to=<date>&limit=<n>
 *
 * Reading sessions, newest first, optionally filtered by book and date range.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);

    const bookId = searchParams.get('book_id');
    const from = optionalDate(searchParams.get('from'), 'from');
    const to = optionalDate(searchParams.get('to'), 'to');
    const limit = optionalInt(searchParams.get('limit') ?? 500, 'limit', { min: 1, max: 2000 });

    let query = supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (bookId) query = query.eq('book_id', requireUuid(bookId, 'book_id'));
    if (from) query = query.gte('session_date', from);
    if (to) query = query.lte('session_date', to);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/sessions
 *
 * Log a reading session. The book must be in the user's library.
 * Body: { book_id, pages_read?, duration_minutes?, session_date?, today? }
 * Send the reader's local date as `session_date` (or `today`) so streaks are
 * correct in their timezone. Pages read advance the book's progress.
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const bookId = requireUuid(body.book_id, 'book_id');
    const pagesRead = optionalInt(body.pages_read, 'pages_read', { min: 1, max: 5000 });
    const minutes = optionalInt(body.duration_minutes, 'duration_minutes', { min: 1, max: 1440 });
    if (!pagesRead && !minutes) {
      throw new ApiError(400, 'At least one of pages_read or duration_minutes is required');
    }

    const today = resolveToday(body.today);
    const sessionDate = optionalDate(body.session_date, 'session_date') || today;
    if (Date.parse(sessionDate) > Date.parse(today) + 86400000) {
      throw new ApiError(400, 'session_date cannot be in the future');
    }

    await ensureUser(userId, supabase);

    const { data: userBook, error: libraryError } = await supabase
      .from('user_books')
      .select('id, status, progress, started_at')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();
    if (libraryError) throw libraryError;
    if (!userBook) throw new ApiError(400, 'Add this book to your library before logging a session');

    const { data, error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: userId,
        book_id: bookId,
        pages_read: pagesRead,
        duration_minutes: minutes,
        session_date: sessionDate,
      })
      .select()
      .single();
    if (error) throw error;

    // Advance progress, and start the book if it was only wanted or paused.
    const bookUpdates = {};
    if (pagesRead) bookUpdates.progress = Number(userBook.progress || 0) + pagesRead;
    if (userBook.status === 'want' || userBook.status === 'paused') {
      bookUpdates.status = 'reading';
      if (!userBook.started_at) bookUpdates.started_at = sessionDate;
    }

    let userBookResult = userBook;
    if (Object.keys(bookUpdates).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('user_books')
        .update(bookUpdates)
        .eq('id', userBook.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateError) console.error('Progress update failed:', updateError);
      else userBookResult = updated;
    }

    return Response.json({ data, user_book: userBookResult }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/sessions
 *
 * Delete a session and take its pages back off the book's progress.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { data: session, error } = await supabase
      .from('reading_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('book_id, pages_read')
      .maybeSingle();
    if (error) throw error;
    if (!session) throw new ApiError(404, 'Session not found');

    if (session.pages_read) {
      const { data: userBook } = await supabase
        .from('user_books')
        .select('id, progress')
        .eq('user_id', userId)
        .eq('book_id', session.book_id)
        .maybeSingle();

      if (userBook) {
        await supabase
          .from('user_books')
          .update({ progress: Math.max(0, Number(userBook.progress || 0) - session.pages_read) })
          .eq('id', userBook.id)
          .eq('user_id', userId);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
