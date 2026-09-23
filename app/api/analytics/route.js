import { getAuthenticatedClients, handleApiError } from '@/lib/auth';

/**
 * GET /api/analytics?year=<year>
 *
 * Get reading analytics for the authenticated user.
 * Returns: books read, pages read, reading time, genre breakdown,
 *          average rating, monthly stats, heatmap data, and streak info.
 */
export async function GET(request) {
  try {
    const { userId, supabase } = await getAuthenticatedClients();
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString(),
      10
    );

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // 1. Books read this year
    const { data: booksRead } = await supabase
      .from('user_books')
      .select('id, book_id, rating, finished_at')
      .eq('user_id', userId)
      .eq('status', 'read')
      .gte('finished_at', yearStart)
      .lte('finished_at', yearEnd);

    // 2. Reading sessions this year (for pages, time, heatmap)
    const { data: sessions } = await supabase
      .from('reading_sessions')
      .select('pages_read, duration_minutes, session_date')
      .eq('user_id', userId)
      .gte('session_date', yearStart)
      .lte('session_date', yearEnd)
      .order('session_date', { ascending: true });

    // 3. All-time currently reading
    const { data: currentlyReading } = await supabase
      .from('user_books')
      .select('id, book_id, progress, started_at')
      .eq('user_id', userId)
      .eq('status', 'reading')
      .order('updated_at', { ascending: false })
      .limit(5);

    // --- Compute analytics ---

    // Total pages & reading time
    const totalPages = (sessions || []).reduce((sum, s) => sum + (s.pages_read || 0), 0);
    const totalMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    // Average rating
    const ratings = (booksRead || []).filter((b) => b.rating != null).map((b) => b.rating);
    const averageRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
      : null;

    // Monthly breakdown
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      booksRead: 0,
      pagesRead: 0,
      readingMinutes: 0,
    }));

    for (const book of booksRead || []) {
      if (book.finished_at) {
        const month = new Date(book.finished_at).getMonth();
        monthlyStats[month].booksRead++;
      }
    }

    for (const session of sessions || []) {
      const month = new Date(session.session_date).getMonth();
      monthlyStats[month].pagesRead += session.pages_read || 0;
      monthlyStats[month].readingMinutes += session.duration_minutes || 0;
    }

    // Heatmap data: date -> intensity
    const heatmapData = {};
    for (const session of sessions || []) {
      const date = session.session_date;
      if (!heatmapData[date]) {
        heatmapData[date] = { pages: 0, minutes: 0, sessions: 0 };
      }
      heatmapData[date].pages += session.pages_read || 0;
      heatmapData[date].minutes += session.duration_minutes || 0;
      heatmapData[date].sessions++;
    }

    // Reading streak (consecutive days with sessions)
    const streak = computeStreak(sessions || []);

    // Genre breakdown (from books read this year)
    const genreBreakdown = await computeGenreBreakdown(
      (booksRead || []).map((b) => b.book_id),
      supabase
    );

    // Reading goal
    const { data: goalData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('type', 'yearly_books')
      .single();

    return Response.json({
      year,
      booksReadCount: (booksRead || []).length,
      totalPages,
      totalMinutes,
      averageRating,
      monthlyStats,
      heatmapData,
      streak,
      genreBreakdown,
      currentlyReading: currentlyReading || [],
      goal: goalData || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Compute current and longest reading streaks from sessions.
 */
function computeStreak(sessions) {
  if (sessions.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Get unique session dates sorted ascending
  const uniqueDates = [...new Set(sessions.map((s) => s.session_date))].sort();

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Check if current streak extends to today
  const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const diffToday = (today - lastDate) / (1000 * 60 * 60 * 24);

  if (diffToday <= 1) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Compute genre breakdown from a list of book IDs.
 */
async function computeGenreBreakdown(bookIds, supabase) {
  if (bookIds.length === 0) return [];

  // Use service client to read book_cache
  const { data: books } = await supabase
    .from('book_cache')
    .select('genres')
    .in('id', bookIds);

  const genreCounts = {};
  for (const book of books || []) {
    for (const genre of book.genres || []) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  }

  return Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}
