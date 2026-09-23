import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { searchBooksWithCache } from '@/lib/google-books';

/**
 * GET /api/books/search?q=<query>&maxResults=20&startIndex=0
 *
 * Search for books via Google Books API (with local cache).
 * Returns normalized book objects with their cache IDs.
 */
export async function GET(request) {
  try {
    const { serviceClient } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q');
    if (!query) {
      return Response.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const maxResults = parseInt(searchParams.get('maxResults') || '20', 10);
    const startIndex = parseInt(searchParams.get('startIndex') || '0', 10);

    const result = await searchBooksWithCache(query, serviceClient, {
      maxResults,
      startIndex,
    });

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
