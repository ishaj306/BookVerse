import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/connections
 *
 * Get all manual book connections for the user.
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
 * Create a manual "this reminded me of X" connection between two books.
 * Body: { from_book_id, to_book_id, label? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { from_book_id, to_book_id, label } = body;

    if (!from_book_id || !to_book_id) {
      return Response.json(
        { error: 'from_book_id and to_book_id are required' },
        { status: 400 }
      );
    }

    if (from_book_id === to_book_id) {
      return Response.json(
        { error: 'Cannot connect a book to itself' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('book_connections')
      .upsert(
        {
          user_id: userId,
          from_book_id,
          to_book_id,
          connection_type: 'manual',
          label: label || null,
          weight: 1,
        },
        { onConflict: 'user_id,from_book_id,to_book_id,connection_type' }
      )
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/connections
 *
 * Remove a manual connection.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (book_connections.id) is required' },
        { status: 400 }
      );
    }

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
