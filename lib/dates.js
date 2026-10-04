/**
 * Date-string helpers. Everything works on YYYY-MM-DD strings and whole day
 * numbers so results do not depend on the server's timezone.
 */

export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 1-12 from a YYYY-MM-DD string. */
export function monthOf(dateStr) {
  return parseInt(dateStr.slice(5, 7), 10);
}

/** YYYY-Qn for a YYYY-MM-DD string. */
export function quarterOf(dateStr) {
  return `${dateStr.slice(0, 4)}-Q${Math.ceil(monthOf(dateStr) / 3)}`;
}

/**
 * Current and longest streak of consecutive reading days.
 * The current streak stays alive if the last session was today or yesterday.
 *
 * @param {string[]} dates - session dates (any order, duplicates allowed)
 * @param {string} today - YYYY-MM-DD in the reader's timezone
 */
export function computeStreak(dates, today) {
  const days = [...new Set(dates)].map(dayNumber).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const last = days[days.length - 1];
  const current = dayNumber(today) - last <= 1 ? run : 0;
  return { current, longest };
}
