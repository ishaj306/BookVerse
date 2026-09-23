import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import {
  getConstellationGraph,
  recomputeTagConnections,
  recomputeGenreConnections,
} from '@/lib/constellation';

/**
 * GET /api/constellation
 *
 * Get the full constellation graph data for the authenticated user.
 * Returns { nodes, edges } ready for d3-force rendering.
 */
export async function GET() {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();

    const graph = await getConstellationGraph(userId, supabase, serviceClient);

    return Response.json(graph);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/constellation/recompute
 *
 * Force a full recomputation of all constellation edges (tags + genres).
 * Use this if edges get out of sync or after bulk imports.
 */
export async function POST() {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();

    const [tagResult, genreResult] = await Promise.all([
      recomputeTagConnections(userId, supabase),
      recomputeGenreConnections(userId, supabase, serviceClient),
    ]);

    return Response.json({
      success: true,
      tagEdgesCreated: tagResult.edgesCreated,
      genreEdgesCreated: genreResult.edgesCreated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
