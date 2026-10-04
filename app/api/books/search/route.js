import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { searchBooksWithCache } from '@/lib/google-books';
import { ApiError, rateLimit } from '@/lib/http';
import { optionalInt } from '@/lib/validate';

/**
 * GET /api/books/search?q=<query>&maxResults=20&startIndex=0
 *
 * Search for books. Checks the local cache first, then Google Books, then
 * Open Library. Returns normalized books with their cache ids and the
 * `source` that answered.
 */
export async function GET(request) {
  try {
    const { userId, serviceClient } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);

    const query = (searchParams.get('q') || '').trim();
    if (query.length < 2) throw new ApiError(400, 'Query parameter "q" must be at least 2 characters');
    if (query.length > 200) throw new ApiError(400, 'Query is too long');

    const maxResults = optionalInt(searchParams.get('maxResults') ?? 20, 'maxResults', { min: 1, max: 40 });
    const startIndex = optionalInt(searchParams.get('startIndex') ?? 0, 'startIndex', { min: 0, max: 1000 });

    rateLimit(`search:${userId}`, 30, 60_000);

    const result = await searchBooksWithCache(query, serviceClient, { maxResults, startIndex });
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
