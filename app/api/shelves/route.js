import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { ApiError, readJson } from '@/lib/http';
import { optionalText, requireUuid } from '@/lib/validate';

function requireName(value) {
  const name = optionalText(value, 'name', 80);
  if (!name) throw new ApiError(400, 'Shelf name is required');
  return name;
}

/**
 * GET /api/shelves
 *
 * All custom shelves for the user, each with a book count.
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

    const shelves = (data || []).map(({ shelf_books, ...shelf }) => ({
      ...shelf,
      book_count: shelf_books?.length || 0,
    }));

    return Response.json({ data: shelves });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/shelves
 *
 * Body: { name, description? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const name = requireName(body.name);
    const description = optionalText(body.description, 'description', 500);

    await ensureUser(userId, supabase);

    const { data, error } = await supabase
      .from('shelves')
      .insert({ user_id: userId, name, description })
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
 * Body: { id, name?, description? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const id = requireUuid(body.id, 'id');
    const updates = {};
    if (body.name !== undefined) updates.name = requireName(body.name);
    if (body.description !== undefined) {
      updates.description = optionalText(body.description, 'description', 500);
    }
    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nothing to update. Allowed: name, description');
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
 * Deletes the shelf (its shelf_books rows cascade). Books stay in the library.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { error } = await supabase.from('shelves').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
