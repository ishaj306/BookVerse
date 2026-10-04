import { currentUser } from '@clerk/nextjs/server';
import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { ApiError, readJson } from '@/lib/http';
import { optionalText } from '@/lib/validate';

/**
 * GET /api/user
 *
 * The authenticated user's profile. Created on first call, pre-filled from
 * their Clerk name and avatar.
 */
export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedClients();

    const { data: existing, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (existing) return Response.json({ data: existing });

    let name = null;
    let avatarUrl = null;
    try {
      const clerkUser = await currentUser();
      name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null;
      avatarUrl = clerkUser?.imageUrl || null;
    } catch (clerkError) {
      console.error('Could not read Clerk profile:', clerkError);
    }

    const { data: created, error: insertError } = await supabase
      .from('users')
      .upsert({ id: userId, name, avatar_url: avatarUrl }, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (insertError) throw insertError;

    if (created) return Response.json({ data: created });

    // A concurrent request created it first.
    const { data: again, error: againError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (againError) throw againError;
    return Response.json({ data: again });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/user
 *
 * Body: { name?, bio?, avatar_url? }
 */
export async function PATCH(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const updates = {};
    if (body.name !== undefined) updates.name = optionalText(body.name, 'name', 80);
    if (body.bio !== undefined) updates.bio = optionalText(body.bio, 'bio', 500);
    if (body.avatar_url !== undefined) {
      const url = optionalText(body.avatar_url, 'avatar_url', 500);
      if (url && !/^https:\/\//i.test(url)) throw new ApiError(400, 'avatar_url must be an https URL');
      updates.avatar_url = url;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nothing to update. Allowed: name, bio, avatar_url');
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
