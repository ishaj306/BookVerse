'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Cover from './Cover';
import { Bow, Glasses } from './ornaments';

const GAP = 8;

/** Slightly varied heights so shelves look like real, mixed books. */
function heightFor(book, width) {
  const seed = [...String(book.title || book.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Math.round(width * (1.4 + (seed % 25) / 100));
}

/**
 * Books standing on wooden shelves. Rows are computed from the available
 * width, so it works from a phone to a wide desktop.
 *
 * @param {object[]} books - { id, title, author, cover_url }
 * @param {(book) => string} [hrefFor]
 */
export default function Bookcase({ books, hrefFor, coverWidth, bow = true, glasses = true }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cw = coverWidth || (width && width < 520 ? 70 : 100);
  const perRow = width ? Math.max(2, Math.floor((width + GAP) / (cw + GAP))) : 4;

  const rows = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));
  if (rows.length === 0) rows.push([]);

  const rowHeight = Math.round(cw * 1.65);
  const lastRow = rows[rows.length - 1];
  const room = perRow - lastRow.length;

  return (
    <div className="case-wrap">
      <div className="pstring" />
      {bow && <div className="bow"><Bow width={64} /></div>}
      <div className="case wood" style={{ paddingTop: 28 }}>
        <div className="case-back">
          <div ref={ref}>
            {rows.map((row, r) => (
              <div key={r}>
                <div className="case-row" style={{ minHeight: rowHeight + 14, paddingTop: r === 0 ? 0 : 14 }}>
                  {row.map((book) => {
                    const cover = <Cover book={book} width={cw} height={heightFor(book, cw)} />;
                    return hrefFor ? (
                      <Link key={book.id} className="cover-link" href={hrefFor(book)} aria-label={book.title}>
                        {cover}
                      </Link>
                    ) : (
                      <div key={book.id}>{cover}</div>
                    );
                  })}
                  {glasses && r === rows.length - 1 && room >= 1 && books.length > 0 && (
                    <div style={{ marginLeft: 6 }}><Glasses width={Math.min(96, cw)} /></div>
                  )}
                </div>
                <div className="shelf wood" style={{ margin: '0 -16px' }} />
              </div>
            ))}
            <div style={{ height: 22 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
