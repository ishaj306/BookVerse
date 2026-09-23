import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/shelves
 *
 * Get all custom shelves for the authenticated user.
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const { data, error } = await supabase
      .from('shelves')
      .select('*, shelf_books(book_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform: include book count per shelf
    const shelves = (data || []).map((shelf) => ({
      ...shelf,
      book_count: shelf.shelf_books?.length || 0,
      shelf_books: undefined, // Remove raw join data
    }));

    return Response.json({ data: shelves });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/shelves
 *
 * Create a new custom shelf.
 * Body: { name, description? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { name, description } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { error: 'Shelf name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shelves')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/shelves
 *
 * Update a shelf's name/description.
 * Body: { id, name?, description? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: 'id (shelves.id) is required' },
        { status: 400 }
      );
    }

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();
      if (!updates.name) {
        return Response.json(
          { error: 'Shelf name cannot be empty' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('shelves')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/shelves
 *
 * Delete a shelf (cascade deletes shelf_books entries).
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (shelves.id) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shelves')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
