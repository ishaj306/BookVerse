import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { recomputeTagConnections } from '@/lib/constellation';

/**
 * GET /api/journal?book_id=<book_id>
 *
 * Get all journal entries for the user, optionally filtered by book.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('book_id');

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookId) {
      query = query.eq('book_id', bookId);
    }

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
 *
 * After creation, recomputes shared-tag constellation edges.
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { book_id, content, quote, page_number, tags } = body;

    if (!book_id) {
      return Response.json(
        { error: 'book_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        book_id,
        content: content || null,
        quote: quote || null,
        page_number: page_number || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Recompute constellation edges if tags were provided
    if (tags && tags.length > 0) {
      try {
        await recomputeTagConnections(userId, supabase);
      } catch (constellationError) {
        // Log but don't fail the request — entry was saved successfully
        console.error('Constellation recompute failed:', constellationError);
      }
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
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: 'id (journal_entries.id) is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Recompute constellation edges if tags changed
    if (updates.tags !== undefined) {
      try {
        await recomputeTagConnections(userId, supabase);
      } catch (constellationError) {
        console.error('Constellation recompute failed:', constellationError);
      }
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
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (journal_entries.id) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Recompute constellation edges after deletion
    try {
      await recomputeTagConnections(userId, supabase);
    } catch (constellationError) {
      console.error('Constellation recompute failed:', constellationError);
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
