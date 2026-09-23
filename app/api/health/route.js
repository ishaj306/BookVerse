/**
 * GET /api/health
 *
 * Simple health check endpoint (public, no auth required).
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'bookverse',
    timestamp: new Date().toISOString(),
  });
}
