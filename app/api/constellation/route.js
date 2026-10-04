import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { getConstellationGraph } from '@/lib/constellation';
import { optionalInt } from '@/lib/validate';

/**
 * GET /api/constellation?year=<year>
 *
 * The constellation graph for the authenticated user: { nodes, edges, topTags }.
 * Nodes carry startedAt/finishedAt so the client can draw a time axis.
 * `year` limits the graph to books finished that year.
 */
export async function GET(request) {
  try {
    const { userId, supabase, serviceClient } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const year = optionalInt(searchParams.get('year'), 'year', { min: 1900, max: 2200 });

    const graph = await getConstellationGraph(userId, supabase, serviceClient, {
      year: year || undefined,
    });

    return Response.json(graph);
  } catch (error) {
    return handleApiError(error);
  }
}
