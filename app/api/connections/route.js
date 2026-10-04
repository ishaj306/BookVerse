import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { ApiError, readJson } from '@/lib/http';
import { optionalText, requireUuid } from '@/lib/validate';

/**
 * GET /api/connections
 *
 * The user's manual "this reminded me of" connections.
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const { data, error } = await supabase
      .from('book_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connection_type', 'manual')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Response.json({ data: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/connections
 *
 * Draw a manual connection between two library books. If the pair is already
 * connected (in either direction) its label is updated instead.
 * Body: { from_book_id, to_book_id, label? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const from = requireUuid(body.from_book_id, 'from_book_id');
    const to = requireUuid(body.to_book_id, 'to_book_id');
    const label = optionalText(body.label, 'label', 120);

    if (from === to) throw new ApiError(400, 'Cannot connect a book to itself');

    await ensureUser(userId, supabase);

    const { count, error: libraryError } = await supabase
      .from('user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('book_id', [from, to]);
    if (libraryError) throw libraryError;
    if (count !== 2) throw new ApiError(400, 'Both books must be in your library');

    const { data: existing, error: existingError } = await supabase
      .from('book_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('connection_type', 'manual')
      .or(`and(from_book_id.eq.${from},to_book_id.eq.${to}),and(from_book_id.eq.${to},to_book_id.eq.${from})`)
      .limit(1);
    if (existingError) throw existingError;

    let result;
    if (existing && existing.length > 0) {
      result = await supabase
        .from('book_connections')
        .update({ label })
        .eq('id', existing[0].id)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('book_connections')
        .insert({
          user_id: userId,
          from_book_id: from,
          to_book_id: to,
          connection_type: 'manual',
          label,
          weight: 1,
        })
        .select()
        .single();
    }
    if (result.error) throw result.error;

    return Response.json({ data: result.data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/connections
 *
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { error } = await supabase
      .from('book_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('connection_type', 'manual');
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
