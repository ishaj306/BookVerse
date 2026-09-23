import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/tags
 *
 * Get all unique tags the user has used in journal entries.
 * Used for tag autocomplete in the journal entry composer.
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const { data, error } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', userId);

    if (error) throw error;

    // Flatten and deduplicate tags
    const tagSet = new Set();
    for (const entry of data || []) {
      for (const tag of entry.tags || []) {
        tagSet.add(tag.toLowerCase().trim());
      }
    }

    const tags = Array.from(tagSet).sort();

    return Response.json({ data: tags });
  } catch (error) {
    return handleApiError(error);
  }
}
