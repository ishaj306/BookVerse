import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { ApiError } from '@/lib/http';
import { requireUuid } from '@/lib/validate';

/**
 * GET /api/books/[id]
 *
 * A single book's details from the cache.
 */
export async function GET(request, { params }) {
  try {
    const { serviceClient } = await getAuthenticatedClients();
    const { id } = await params;
    requireUuid(id, 'id');

    const { data, error } = await serviceClient
      .from('book_cache')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, 'Book not found');

    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
