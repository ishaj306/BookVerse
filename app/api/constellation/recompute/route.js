import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { recomputeAllConnections } from '@/lib/constellation';

/**
 * POST /api/constellation/recompute
 *
 * Rebuild all computed edges (tags and genres). Use it if edges look out of
 * sync, or after a bulk import.
 */
export async function POST() {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const result = await recomputeAllConnections(userId, supabase, serviceClient);

    return Response.json({
      success: true,
      tagEdges: result.tags.edgesCreated,
      genreEdges: result.genres.edgesCreated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
