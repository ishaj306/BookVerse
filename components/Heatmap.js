const SHADES = ['#FDEEF2', '#FADDE6', '#F2A7BD', '#D9648A', '#A8234B'];

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function level(day) {
  if (!day) return 0;
  const amount = day.pages || day.minutes / 2 || 1;
  return amount >= 60 ? 4 : amount >= 30 ? 3 : amount >= 10 ? 2 : 1;
}

/** GitHub-style activity grid, `weeks` columns ending this week. */
export default function Heatmap({ data = {}, today, weeks = 26 }) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = addDays(today, -(weeks - 1) * 7 - weekday);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i);
    const future = date > today;
    const day = data[date];
    cells.push(
      <span
        key={date}
        title={future ? undefined : `${date}${day ? `: ${day.pages} pages` : ''}`}
        style={{ background: future ? 'transparent' : SHADES[level(day)] }}
      />
    );
  }
  return <div className="heatmap" role="img" aria-label="Reading activity over the last months">{cells}</div>;
}
