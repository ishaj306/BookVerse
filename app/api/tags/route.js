import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { normalizeTag } from '@/lib/validate';

/**
 * GET /api/tags?q=<prefix>
 *
 * The user's tags with usage counts, most used first. `q` filters by prefix
 * for autocomplete in the composer.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const prefix = normalizeTag(searchParams.get('q') || '');

    const { data, error } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', userId);
    if (error) throw error;

    const counts = new Map();
    for (const entry of data || []) {
      for (const raw of entry.tags || []) {
        const tag = normalizeTag(raw);
        if (tag && tag.startsWith(prefix)) counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    const tags = [...counts]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    return Response.json({ data: tags });
  } catch (error) {
    return handleApiError(error);
  }
}
