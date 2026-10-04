import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { quarterOf } from '@/lib/dates';
import { normalizeTag } from '@/lib/validate';

/**
 * GET /api/insights
 *
 * Rule-based reading insights, no LLM: the user's top tags overall, and the
 * dominant tags in each quarter (by when books were finished), which is what
 * makes reading "phases" visible.
 *
 * Returns { topTags, phases, headline }.
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const [booksResult, entriesResult] = await Promise.all([
      supabase
        .from('user_books')
        .select('book_id, finished_at')
        .eq('user_id', userId)
        .eq('status', 'read')
        .not('finished_at', 'is', null),
      supabase.from('journal_entries').select('book_id, tags').eq('user_id', userId),
    ]);
    for (const result of [booksResult, entriesResult]) {
      if (result.error) throw result.error;
    }

    const bookTags = new Map();
    for (const entry of entriesResult.data || []) {
      if (!bookTags.has(entry.book_id)) bookTags.set(entry.book_id, new Set());
      for (const raw of entry.tags || []) {
        const tag = normalizeTag(raw);
        if (tag) bookTags.get(entry.book_id).add(tag);
      }
    }

    const overall = new Map();
    for (const tags of bookTags.values()) {
      for (const tag of tags) overall.set(tag, (overall.get(tag) || 0) + 1);
    }
    const topTags = rank(overall).slice(0, 10);

    // Tag counts per quarter, counting each book once per tag.
    const quarters = new Map();
    for (const book of booksResult.data || []) {
      const period = quarterOf(book.finished_at);
      const q = quarters.get(period) || { period, books: 0, tags: new Map() };
      q.books++;
      for (const tag of bookTags.get(book.book_id) || []) {
        q.tags.set(tag, (q.tags.get(tag) || 0) + 1);
      }
      quarters.set(period, q);
    }

    const phases = [...quarters.values()]
      .sort((a, b) => (a.period < b.period ? 1 : -1))
      .slice(0, 8)
      .map((q) => ({ period: q.period, books: q.books, topTags: rank(q.tags).slice(0, 3) }));

    const latest = phases.find((p) => p.topTags.length > 0);
    const headline = latest
      ? `In ${latest.period.replace('-', ' ')}, you kept coming back to "${latest.topTags[0].tag}" (${latest.topTags[0].count} of ${latest.books} books).`
      : null;

    return Response.json({ topTags, phases, headline });
  } catch (error) {
    return handleApiError(error);
  }
}

function rank(counts) {
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
