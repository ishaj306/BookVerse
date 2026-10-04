import { ApiError } from './http.js';

export const GOAL_TYPES = ['yearly_books', 'yearly_pages', 'yearly_minutes'];

export function requireGoalType(type) {
  if (!GOAL_TYPES.includes(type)) {
    throw new ApiError(400, `type must be one of: ${GOAL_TYPES.join(', ')}`);
  }
  return type;
}

/**
 * Live progress for a goal, computed from the source tables so it can never
 * drift out of sync the way a stored counter would.
 */
export async function computeGoalProgress(supabase, userId, type, year) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  if (type === 'yearly_books') {
    const { count, error } = await supabase
      .from('user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'read')
      .gte('finished_at', start)
      .lte('finished_at', end);
    if (error) throw error;
    return count || 0;
  }

  const { data, error } = await supabase
    .from('reading_sessions')
    .select('pages_read, duration_minutes')
    .eq('user_id', userId)
    .gte('session_date', start)
    .lte('session_date', end);
  if (error) throw error;

  const field = type === 'yearly_pages' ? 'pages_read' : 'duration_minutes';
  return (data || []).reduce((sum, row) => sum + (row[field] || 0), 0);
}
