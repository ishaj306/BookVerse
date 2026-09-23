import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/sessions?book_id=<book_id>&from=<date>&to=<date>
 *
 * Get reading sessions for the user, optionally filtered by book and date range.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);

    const bookId = searchParams.get('book_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false });

    if (bookId) query = query.eq('book_id', bookId);
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
 * Log a new reading session.
 * Body: { book_id, pages_read?, duration_minutes?, session_date? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { book_id, pages_read, duration_minutes, session_date } = body;

    if (!book_id) {
      return Response.json(
        { error: 'book_id is required' },
        { status: 400 }
      );
    }

    if (!pages_read && !duration_minutes) {
      return Response.json(
        { error: 'At least one of pages_read or duration_minutes is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: userId,
        book_id,
        pages_read: pages_read || null,
        duration_minutes: duration_minutes || null,
        session_date: session_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-update progress on user_books if pages_read is provided
    if (pages_read) {
      try {
        // Get current user_book entry
        const { data: userBook } = await supabase
          .from('user_books')
          .select('id, progress')
          .eq('user_id', userId)
          .eq('book_id', book_id)
          .single();

        if (userBook) {
          const newProgress = (userBook.progress || 0) + pages_read;
          await supabase
            .from('user_books')
            .update({ progress: newProgress })
            .eq('id', userBook.id)
            .eq('user_id', userId);
        }
      } catch (progressError) {
        console.error('Auto-progress update failed:', progressError);
      }
    }

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/sessions
 *
 * Delete a reading session.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (reading_sessions.id) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('reading_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
