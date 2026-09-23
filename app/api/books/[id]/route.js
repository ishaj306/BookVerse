import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/books/[id]
 *
 * Get a single book's details from the cache.
 */
export async function GET(request, { params }) {
  try {
    const { serviceClient } = await getAuthenticatedClients();
    const { id } = await params;

    const { data, error } = await serviceClient
      .from('book_cache')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Book not found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
