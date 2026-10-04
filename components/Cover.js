'use client';

import { useState } from 'react';

// Dusty roses, burgundy, plum, peach and sand: enough depth to read against blush paper.
const PALETTE = [
  ['#C8375F', '#FFFFFF'],
  ['#3A2028', '#F5C2D2'],
  ['#F5C2D2', '#761634'],
  ['#8E3A52', '#FDEEF2'],
  ['#E3C39A', '#4A2C17'],
  ['#A8234B', '#FDEEF2'],
  ['#B5546F', '#FFFFFF'],
  ['#761634', '#FADDE6'],
  ['#F6D5C4', '#7A2E3F'],
  ['#4A1F3D', '#F5C2D2'],
  ['#9C6B86', '#FFFFFF'],
  ['#EBD7C5', '#6E4829'],
];

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Tilt toward the pointer and catch the light. Mouse only, never touch. */
const tiltHandlers = {
  onPointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${((x - 0.5) * 16).toFixed(1)}deg`);
    el.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(1)}deg`);
    el.style.setProperty('--ty', '-6px');
    el.style.setProperty('--sx', `${(x * 100).toFixed(0)}%`);
    el.style.setProperty('--sy2', `${(y * 100).toFixed(0)}%`);
  },
  onPointerLeave(e) {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--ty', '0px');
  },
};

/**
 * A book cover. Uses the real cover image when there is one, otherwise a
 * painted cover in the palette, picked from the title so it stays stable.
 * `interactive` makes it tilt toward the pointer.
 */
export default function Cover({ book, width = 100, height, fill = false, showAuthor = true, interactive = false, style }) {
  const [failed, setFailed] = useState(false);
  const title = book?.title || 'Untitled';
  const [bg, fg] = PALETTE[hash(title) % PALETTE.length];
  // A fluid cover with no explicit height keeps a 2:3 book shape at any width.
  const fluid = fill && !height;
  const box = fluid
    ? { width: '100%', aspectRatio: '2 / 3', ...style }
    : { width: fill ? '100%' : width, height: height || Math.round(width * 1.5), ...style };
  const cls = interactive ? 'tilt' : '';
  const handlers = interactive ? tiltHandlers : {};

  if (book?.cover_url && !failed) {
    return (
      <div className={`cover cover-img ${cls}`} style={box} {...handlers}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={book.cover_url} alt={`Cover of ${title}`} loading="lazy" onError={() => setFailed(true)} />
      </div>
    );
  }

  const size = Math.max(11, Math.round((fill ? 150 : width) / 5.4));
  return (
    <div className={`cover ${fluid ? 'cover-fluid' : ''} ${cls}`} style={{ ...box, background: bg, color: fg }} role="img" aria-label={`Cover of ${title}`} {...handlers}>
      <div className="t" style={fluid ? undefined : { fontSize: size }}>{title}</div>
      {showAuthor && book?.author && width >= 60 && <div className="a">{book.author}</div>}
    </div>
  );
}
