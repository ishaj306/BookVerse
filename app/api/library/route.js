import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/library?status=<status>
 *
 * Get all books in the user's library, optionally filtered by status.
 * Joins with book_cache to return full book details.
 */
export async function GET(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('user_books')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: userBooks, error } = await query;
    if (error) throw error;

    // Enrich with book_cache data
    if (userBooks && userBooks.length > 0) {
      const bookIds = userBooks.map((ub) => ub.book_id);
      const { data: books } = await serviceClient
        .from('book_cache')
        .select('*')
        .in('id', bookIds);

      const bookMap = new Map((books || []).map((b) => [b.id, b]));
      const enriched = userBooks.map((ub) => ({
        ...ub,
        book: bookMap.get(ub.book_id) || null,
      }));

      return Response.json({ data: enriched });
    }

    return Response.json({ data: [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/library
 *
 * Add a book to the user's library.
 * Body: { book_id, status, started_at? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { book_id, status, started_at } = body;

    if (!book_id || !status) {
      return Response.json(
        { error: 'book_id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['want', 'reading', 'read', 'paused', 'dnf'];
    if (!validStatuses.includes(status)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_books')
      .upsert(
        {
          user_id: userId,
          book_id,
          status,
          started_at: started_at || (status === 'reading' ? new Date().toISOString().split('T')[0] : null),
        },
        { onConflict: 'user_id,book_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/library
 *
 * Update a book in the user's library (status, progress, rating, dates).
 * Body: { id, status?, progress?, rating?, started_at?, finished_at? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: 'id (user_books.id) is required' },
        { status: 400 }
      );
    }

    // Auto-set finished_at when status changes to 'read'
    if (updates.status === 'read' && !updates.finished_at) {
      updates.finished_at = new Date().toISOString().split('T')[0];
    }

    // Auto-set started_at when status changes to 'reading'
    if (updates.status === 'reading' && !updates.started_at) {
      updates.started_at = new Date().toISOString().split('T')[0];
    }

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
 * Remove a book from the user's library.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (user_books.id) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_books')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
