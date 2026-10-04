import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { ApiError, readJson } from '@/lib/http';
import { requireUuid } from '@/lib/validate';

/** Load a shelf the user owns, or throw a 404. */
async function requireShelf(supabase, userId, shelfId) {
  requireUuid(shelfId, 'shelf id');
  const { data, error } = await supabase
    .from('shelves')
    .select('id')
    .eq('id', shelfId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Shelf not found');
}

/**
 * GET /api/shelves/[id]/books
 *
 * Books on a shelf, with full book_cache data.
 */
export async function GET(request, { params }) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const { id: shelfId } = await params;
    await requireShelf(supabase, userId, shelfId);

    const { data: shelfBooks, error } = await supabase
      .from('shelf_books')
      .select('book_id, added_at')
      .eq('shelf_id', shelfId)
      .order('added_at', { ascending: false });
    if (error) throw error;

    if (!shelfBooks || shelfBooks.length === 0) return Response.json({ data: [] });

    const { data: books, error: booksError } = await serviceClient
      .from('book_cache')
      .select('*')
      .in('id', shelfBooks.map((sb) => sb.book_id));
    if (booksError) throw booksError;

    const bookMap = new Map((books || []).map((b) => [b.id, b]));
    return Response.json({
      data: shelfBooks.map((sb) => ({ ...sb, book: bookMap.get(sb.book_id) || null })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/shelves/[id]/books
 *
 * Add a library book to a shelf. Body: { book_id }
 */
export async function POST(request, { params }) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { id: shelfId } = await params;
    const body = await readJson(request);
    const bookId = requireUuid(body.book_id, 'book_id');

    await requireShelf(supabase, userId, shelfId);

    const { count, error: libraryError } = await supabase
      .from('user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId);
    if (libraryError) throw libraryError;
    if (!count) throw new ApiError(400, 'Add this book to your library first');

    const { data, error } = await supabase
      .from('shelf_books')
      .upsert({ shelf_id: shelfId, book_id: bookId }, { onConflict: 'shelf_id,book_id' })
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
 * Remove a book from a shelf. Body: { book_id }
 */
export async function DELETE(request, { params }) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { id: shelfId } = await params;
    const body = await readJson(request);
    const bookId = requireUuid(body.book_id, 'book_id');

    await requireShelf(supabase, userId, shelfId);

    const { error } = await supabase
      .from('shelf_books')
      .delete()
      .eq('shelf_id', shelfId)
      .eq('book_id', bookId);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
