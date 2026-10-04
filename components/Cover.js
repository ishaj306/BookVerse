'use client';

import { useState } from 'react';

const PALETTE = [
  ['#C8375F', '#FFFFFF'],
  ['#3A2028', '#F5C2D2'],
  ['#F5C2D2', '#761634'],
  ['#FFF1E4', '#A8234B'],
  ['#E3C39A', '#4A2C17'],
  ['#A8234B', '#FDEEF2'],
  ['#EE9FB8', '#3A2028'],
  ['#761634', '#FADDE6'],
  ['#FADDE6', '#A8234B'],
  ['#EBD7C5', '#6E4829'],
  ['#6E4E58', '#FDEEF2'],
];

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * A book cover. Uses the real cover image when there is one, otherwise a
 * painted cover in the palette, picked from the title so it stays stable.
 */
export default function Cover({ book, width = 100, height, fill = false, showAuthor = true, style }) {
  const [failed, setFailed] = useState(false);
  const title = book?.title || 'Untitled';
  const h = height || Math.round(width * 1.5);
  const [bg, fg] = PALETTE[hash(title) % PALETTE.length];
  const box = { width: fill ? '100%' : width, height: h, ...style };

  if (book?.cover_url && !failed) {
    return (
      <div className="cover cover-img" style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={book.cover_url} alt={`Cover of ${title}`} loading="lazy" onError={() => setFailed(true)} />
      </div>
    );
  }

  const size = Math.max(11, Math.round((fill ? 150 : width) / 5.4));
  return (
    <div className="cover" style={{ ...box, background: bg, color: fg }} role="img" aria-label={`Cover of ${title}`}>
      <div className="t" style={{ fontSize: size }}>{title}</div>
      {showAuthor && book?.author && width >= 60 && <div className="a">{book.author}</div>}
    </div>
  );
}
