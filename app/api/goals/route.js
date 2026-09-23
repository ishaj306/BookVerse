import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/goals?year=<year>
 *
 * Get the user's reading goals for a given year.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString(),
      10
    );

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year);

    if (error) throw error;

    return Response.json({ data: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/goals
 *
 * Create or update a reading goal.
 * Body: { type, target, year?, deadline? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { type, target, year, deadline } = body;

    if (!type || !target) {
      return Response.json(
        { error: 'type and target are required' },
        { status: 400 }
      );
    }

    const goalYear = year || new Date().getFullYear();

    // Calculate current progress based on goal type
    let current = 0;
    if (type === 'yearly_books') {
      const { count } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'read')
        .gte('finished_at', `${goalYear}-01-01`)
        .lte('finished_at', `${goalYear}-12-31`);

      current = count || 0;
    } else if (type === 'yearly_pages') {
      const { data: sessions } = await supabase
        .from('reading_sessions')
        .select('pages_read')
        .eq('user_id', userId)
        .gte('session_date', `${goalYear}-01-01`)
        .lte('session_date', `${goalYear}-12-31`);

      current = (sessions || []).reduce((sum, s) => sum + (s.pages_read || 0), 0);
    }

    // Upsert: one goal per type per year
    const { data: existing } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('year', goalYear)
      .single();

    let data, error;

    if (existing) {
      ({ data, error } = await supabase
        .from('goals')
        .update({ target, current, deadline: deadline || null })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          type,
          target,
          current,
          year: goalYear,
          deadline: deadline || null,
        })
        .select()
        .single());
    }

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/goals
 *
 * Delete a goal.
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await request.json();

    const { id } = body;
    if (!id) {
      return Response.json(
        { error: 'id (goals.id) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
