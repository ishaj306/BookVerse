import { getAuthenticatedClients, handleApiError } from '@/lib/auth';
import { computeGoalProgress } from '@/lib/goals';
import { computeStreak, monthOf } from '@/lib/dates';
import { optionalInt, resolveToday } from '@/lib/validate';

/**
 * GET /api/analytics?year=<year>&today=<YYYY-MM-DD>
 *
 * Reading analytics for the authenticated user: books/pages/time for the
 * year, monthly stats, activity heatmap, streaks, genre breakdown, goals, and
 * the books currently being read.
 *
 * Pass `today` as the reader's local date so streaks match their timezone.
 * Streaks are computed over all sessions, not just the requested year.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const today = resolveToday(searchParams.get('today'));
    const year = optionalInt(searchParams.get('year') ?? today.slice(0, 4), 'year', {
      min: 1900,
      max: 2200,
    });

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [booksReadResult, sessionsResult, allDatesResult, readingResult, goalsResult] = await Promise.all([
      supabase
        .from('user_books')
        .select('book_id, rating, finished_at')
        .eq('user_id', userId)
        .eq('status', 'read')
        .gte('finished_at', yearStart)
        .lte('finished_at', yearEnd),
      supabase
        .from('reading_sessions')
        .select('pages_read, duration_minutes, session_date')
        .eq('user_id', userId)
        .gte('session_date', yearStart)
        .lte('session_date', yearEnd),
      supabase
        .from('reading_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .limit(20000),
      supabase
        .from('user_books')
        .select('id, book_id, progress, started_at, book:book_cache(id, title, author, cover_url, pages)')
        .eq('user_id', userId)
        .eq('status', 'reading')
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase.from('goals').select('*').eq('user_id', userId).eq('year', year),
    ]);

    for (const result of [booksReadResult, sessionsResult, allDatesResult, readingResult, goalsResult]) {
      if (result.error) throw result.error;
    }

    const booksRead = booksReadResult.data || [];
    const sessions = sessionsResult.data || [];

    const totalPages = sessions.reduce((sum, s) => sum + (s.pages_read || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    const ratings = booksRead.filter((b) => b.rating != null).map((b) => Number(b.rating));
    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
        : null;

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      booksRead: 0,
      pagesRead: 0,
      readingMinutes: 0,
    }));
    for (const book of booksRead) {
      monthlyStats[monthOf(book.finished_at) - 1].booksRead++;
    }

    const heatmapData = {};
    for (const session of sessions) {
      monthlyStats[monthOf(session.session_date) - 1].pagesRead += session.pages_read || 0;
      monthlyStats[monthOf(session.session_date) - 1].readingMinutes += session.duration_minutes || 0;

      const day = (heatmapData[session.session_date] ||= { pages: 0, minutes: 0, sessions: 0 });
      day.pages += session.pages_read || 0;
      day.minutes += session.duration_minutes || 0;
      day.sessions++;
    }

    const streak = computeStreak((allDatesResult.data || []).map((s) => s.session_date), today);
    const activeDays = Object.keys(heatmapData).length;

    // Genre breakdown for the year's finished books.
    const genreCounts = new Map();
    const finishedIds = booksRead.map((b) => b.book_id);
    if (finishedIds.length > 0) {
      const { data: books, error } = await supabase
        .from('book_cache')
        .select('genres')
        .in('id', finishedIds);
      if (error) throw error;
      for (const book of books || []) {
        for (const genre of book.genres || []) {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        }
      }
    }
    const genreBreakdown = [...genreCounts]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    const goals = await Promise.all(
      (goalsResult.data || []).map(async (goal) => ({
        ...goal,
        current: await computeGoalProgress(supabase, userId, goal.type, goal.year),
      }))
    );

    return Response.json({
      year,
      booksReadCount: booksRead.length,
      totalPages,
      totalMinutes,
      averageRating,
      pagesPerActiveDay: activeDays > 0 ? Math.round(totalPages / activeDays) : 0,
      monthlyStats,
      heatmapData,
      streak,
      genreBreakdown,
      currentlyReading: readingResult.data || [],
      goals,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
