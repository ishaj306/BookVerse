import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { recomputeTagConnections, safeRecompute } from '@/lib/constellation';
import { ApiError, readJson } from '@/lib/http';
import {
  normalizeTag,
  normalizeTags,
  optionalInt,
  optionalText,
  requireUuid,
} from '@/lib/validate';

const MAX_CONTENT = 10000;
const MAX_QUOTE = 2000;

/**
 * GET /api/journal?book_id=<id>&tag=<tag>&limit=<n>&offset=<n>
 *
 * Get the user's journal entries (inscriptions), newest first.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('book_id');
    const tag = searchParams.get('tag');
    const limit = optionalInt(searchParams.get('limit') ?? 100, 'limit', { min: 1, max: 500 });
    const offset = optionalInt(searchParams.get('offset') ?? 0, 'offset', { min: 0 });

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookId) query = query.eq('book_id', requireUuid(bookId, 'book_id'));
    if (tag) query = query.contains('tags', [normalizeTag(tag)]);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/journal
 *
 * Create a new journal entry (inscription).
 * Body: { book_id, content?, quote?, page_number?, tags?[] }
 * The book must already be in the user's library.
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const bookId = requireUuid(body.book_id, 'book_id');
    const content = optionalText(body.content, 'content', MAX_CONTENT);
    const quote = optionalText(body.quote, 'quote', MAX_QUOTE);
    const pageNumber = optionalInt(body.page_number, 'page_number', { min: 0, max: 100000 });
    const tags = normalizeTags(body.tags);

    if (!content && !quote) {
      throw new ApiError(400, 'An inscription needs some content or a quote');
    }

    await ensureUser(userId, supabase);

    const { count, error: libraryError } = await supabase
      .from('user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId);
    if (libraryError) throw libraryError;
    if (!count) throw new ApiError(400, 'Add this book to your library before writing about it');

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ user_id: userId, book_id: bookId, content, quote, page_number: pageNumber, tags })
      .select()
      .single();
    if (error) throw error;

    if (tags.length > 0) {
      await safeRecompute('journal create', () => recomputeTagConnections(userId, supabase));
    }

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/journal
 *
 * Update a journal entry.
 * Body: { id, content?, quote?, page_number?, tags?[] }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const id = requireUuid(body.id, 'id');
    const updates = {};

    if (body.content !== undefined) updates.content = optionalText(body.content, 'content', MAX_CONTENT);
    if (body.quote !== undefined) updates.quote = optionalText(body.quote, 'quote', MAX_QUOTE);
    if (body.page_number !== undefined) {
      updates.page_number = optionalInt(body.page_number, 'page_number', { min: 0, max: 100000 });
    }
    if (body.tags !== undefined) updates.tags = normalizeTags(body.tags);

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nothing to update. Allowed: content, quote, page_number, tags');
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;

    if (updates.tags !== undefined) {
      await safeRecompute('journal update', () => recomputeTagConnections(userId, supabase));
    }

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/journal
 *
 * Delete a journal entry.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;

    await safeRecompute('journal delete', () => recomputeTagConnections(userId, supabase));

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
