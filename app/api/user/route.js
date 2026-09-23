import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/user
 *
 * Get the authenticated user's profile.
 * Auto-creates the profile on first call (from Clerk data).
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User not found — auto-create from Clerk
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return Response.json({ data: newUser });
    }

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/user
 *
 * Update the authenticated user's profile.
 * Body: { name?, bio?, avatar_url? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const allowedFields = ['name', 'bio', 'avatar_url'];
    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: 'No valid fields to update. Allowed: name, bio, avatar_url' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
