'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Cover from './Cover';
import { Glasses } from './ornaments';

const GAP = 12;

/** Slightly varied heights so shelves look like real, mixed books. */
function heightFor(book, width) {
  const seed = [...String(book.title || book.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Math.round(width * (1.4 + (seed % 25) / 100));
}

/**
 * Books standing on thin wooden ledges. Rows are worked out from the width
 * available, so it holds up from a phone to a wide desktop. Covers tilt toward
 * the pointer and rise in one after another.
 *
 * @param {object[]} books - { id, title, author, cover_url }
 * @param {(book) => string} [hrefFor]
 */
export default function Bookcase({ books, hrefFor, coverWidth, glasses = true }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cw = coverWidth || (width && width < 520 ? 72 : width && width < 900 ? 92 : 104);
  const perRow = width ? Math.max(2, Math.floor((width + GAP) / (cw + GAP))) : 4;

  const rows = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));
  if (rows.length === 0) rows.push([]);

  const rowHeight = Math.round(cw * 1.68);
  const lastRow = rows[rows.length - 1];
  const room = perRow - lastRow.length;

  return (
    <div className="shelves" ref={ref}>
      {rows.map((row, r) => (
        <div className="shelf-row" key={r}>
          <div className="shelf-books" style={{ minHeight: rowHeight }}>
            {row.map((book, i) => {
              const cover = <Cover book={book} width={cw} height={heightFor(book, cw)} interactive />;
              return (
                <div key={book.id} className="rise" style={{ animationDelay: `${Math.min(r * perRow + i, 28) * 35}ms` }}>
                  {hrefFor ? (
                    <Link className="cover-link tt" data-title={book.title} href={hrefFor(book)} aria-label={book.title}>
                      {cover}
                    </Link>
                  ) : (
                    cover
                  )}
                </div>
              );
            })}
            {glasses && r === rows.length - 1 && room >= 1 && books.length > 0 && (
              <div className="rise" style={{ marginLeft: 8, animationDelay: '400ms' }}><Glasses width={Math.min(92, cw)} /></div>
            )}
          </div>
          <div className="ledge wood" style={{ animationDelay: `${r * 120}ms` }} />
        </div>
      ))}
    </div>
  );
}
