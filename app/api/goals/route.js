import { getAuthenticatedClients, ensureUser, handleApiError } from '@/lib/auth';
import { computeGoalProgress, requireGoalType } from '@/lib/goals';
import { ApiError, readJson } from '@/lib/http';
import { optionalDate, optionalInt, requireUuid } from '@/lib/validate';

function currentYear() {
  return new Date().getUTCFullYear();
}

/**
 * GET /api/goals?year=<year>
 *
 * The user's goals for a year. `current` is computed live from the user's
 * books and sessions, not read from a stored counter.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const year = optionalInt(searchParams.get('year') ?? currentYear(), 'year', { min: 1900, max: 2200 });

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year);
    if (error) throw error;

    const goals = await Promise.all(
      (data || []).map(async (goal) => ({
        ...goal,
        current: await computeGoalProgress(supabase, userId, goal.type, goal.year),
      }))
    );

    return Response.json({ data: goals });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/goals
 *
 * Create or update the goal for a type and year (one per type per year).
 * Body: { type, target, year?, deadline? }
 */
export async function POST(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);

    const type = requireGoalType(body.type);
    const target = optionalInt(body.target, 'target', { min: 1, max: 1_000_000 });
    if (!target) throw new ApiError(400, 'target is required');
    const year = optionalInt(body.year ?? currentYear(), 'year', { min: 1900, max: 2200 });
    const deadline = optionalDate(body.deadline, 'deadline');

    await ensureUser(userId, supabase);

    const current = await computeGoalProgress(supabase, userId, type, year);

    const { data, error } = await supabase
      .from('goals')
      .upsert(
        { user_id: userId, type, target, year, deadline, current },
        { onConflict: 'user_id,type,year' }
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
 * DELETE /api/goals
 *
 * Body: { id }
 */
export async function DELETE(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const body = await readJson(request);
    const id = requireUuid(body.id, 'id');

    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
