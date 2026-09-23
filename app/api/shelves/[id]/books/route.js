import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/shelves/[id]/books
 *
 * Get all books in a specific shelf, with full book_cache data.
 */
export async function GET(request, { params }) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const { id: shelfId } = await params;

    // Verify shelf ownership
    const { data: shelf, error: shelfError } = await supabase
      .from('shelves')
      .select('id')
      .eq('id', shelfId)
      .eq('user_id', userId)
      .single();

    if (shelfError || !shelf) {
      return Response.json({ error: 'Shelf not found' }, { status: 404 });
    }

    // Get shelf books
    const { data: shelfBooks, error } = await supabase
      .from('shelf_books')
      .select('book_id, added_at')
      .eq('shelf_id', shelfId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Enrich with book_cache data
    if (shelfBooks && shelfBooks.length > 0) {
      const bookIds = shelfBooks.map((sb) => sb.book_id);
      const { data: books } = await serviceClient
        .from('book_cache')
        .select('*')
        .in('id', bookIds);

      const bookMap = new Map((books || []).map((b) => [b.id, b]));
      const enriched = shelfBooks.map((sb) => ({
        ...sb,
        book: bookMap.get(sb.book_id) || null,
      }));

      return Response.json({ data: enriched });
    }

    return Response.json({ data: [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/shelves/[id]/books
 *
 * Add a book to a shelf.
 * Body: { book_id }
 */
export async function POST(request, { params }) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { id: shelfId } = await params;
    const body = await request.json();

    const { book_id } = body;
    if (!book_id) {
      return Response.json(
        { error: 'book_id is required' },
        { status: 400 }
      );
    }

    // Verify shelf ownership
    const { data: shelf, error: shelfError } = await supabase
      .from('shelves')
      .select('id')
      .eq('id', shelfId)
      .eq('user_id', userId)
      .single();

    if (shelfError || !shelf) {
      return Response.json({ error: 'Shelf not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('shelf_books')
      .upsert(
        { shelf_id: shelfId, book_id },
        { onConflict: 'shelf_id,book_id' }
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
 * DELETE /api/shelves/[id]/books
 *
 * Remove a book from a shelf.
 * Body: { book_id }
 */
export async function DELETE(request, { params }) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { id: shelfId } = await params;
    const body = await request.json();

    const { book_id } = body;
    if (!book_id) {
      return Response.json(
        { error: 'book_id is required' },
        { status: 400 }
      );
    }

    // Verify shelf ownership
    const { data: shelf, error: shelfError } = await supabase
      .from('shelves')
      .select('id')
      .eq('id', shelfId)
      .eq('user_id', userId)
      .single();

    if (shelfError || !shelf) {
      return Response.json({ error: 'Shelf not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('shelf_books')
      .delete()
      .eq('shelf_id', shelfId)
      .eq('book_id', book_id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
