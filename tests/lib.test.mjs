import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, dayNumber, monthOf, quarterOf } from '../lib/dates.js';
import { parseCsv } from '../lib/csv.js';
import { cleanDate, cleanIsbn, mapGoodreadsRow } from '../lib/goodreads.js';
import { normalizeGenres } from '../lib/genres.js';
import { normalizeDate, normalizeVolume } from '../lib/google-books.js';
import { normalizeTags, optionalRating, isDateString, resolveToday } from '../lib/validate.js';

test('streaks: longest, current alive today or yesterday, dead otherwise', () => {
  const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11', '2026-09-11'];
  assert.deepEqual(computeStreak(dates, '2026-09-12'), { current: 2, longest: 3 });
  assert.deepEqual(computeStreak(dates, '2026-09-11'), { current: 2, longest: 3 });
  assert.deepEqual(computeStreak(dates, '2026-09-13'), { current: 0, longest: 3 });
  assert.deepEqual(computeStreak([], '2026-09-13'), { current: 0, longest: 0 });
});

test('streaks work across a year boundary and are timezone independent', () => {
  assert.equal(dayNumber('2027-01-01') - dayNumber('2026-12-31'), 1);
  assert.deepEqual(computeStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01'), { current: 3, longest: 3 });
  assert.equal(monthOf('2026-03-09'), 3);
  assert.equal(quarterOf('2026-11-09'), '2026-Q4');
});

test('csv parser handles quotes, embedded commas/newlines, CRLF and BOM', () => {
  const csv = '﻿Title,Author,Notes\r\n"Circe","Miller, Madeline","line one\nline two"\r\n"Say ""hi""",X,\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Author, 'Miller, Madeline');
  assert.equal(rows[0].Notes, 'line one\nline two');
  assert.equal(rows[1].Title, 'Say "hi"');
  assert.equal(rows[1].Notes, '');
});

test('goodreads rows map to statuses, ratings, dates and isbns', () => {
  assert.equal(cleanIsbn('="9780316556347"'), '9780316556347');
  assert.equal(cleanIsbn('="1234"'), null);
  assert.equal(cleanDate('2023/05/14'), '2023-05-14');
  assert.equal(cleanDate('nonsense'), null);

  const read = mapGoodreadsRow({
    Title: 'Circe',
    Author: 'Madeline Miller',
    ISBN13: '="9780316556347"',
    'Exclusive Shelf': 'read',
    'My Rating': '5',
    'Date Read': '2023/05/14',
    'Number of Pages': '393',
  });
  assert.deepEqual(read, {
    title: 'Circe',
    author: 'Madeline Miller',
    isbn: '9780316556347',
    status: 'read',
    rating: 5,
    pages: 393,
    finishedAt: '2023-05-14',
    startedAt: null,
  });

  const want = mapGoodreadsRow({ Title: 'Rebecca', 'Exclusive Shelf': 'to-read', 'My Rating': '0' });
  assert.equal(want.status, 'want');
  assert.equal(want.rating, null);
  assert.equal(mapGoodreadsRow({ Title: '' }), null);
});

test('genres are split, lowercased and filtered', () => {
  assert.deepEqual(
    normalizeGenres(['Fiction / Romance / General', 'Fiction / Gothic']).sort(),
    ['fiction', 'gothic', 'romance']
  );
});

test('google publication dates are padded so Postgres accepts them', () => {
  assert.equal(normalizeDate('2011'), '2011-01-01');
  assert.equal(normalizeDate('2011-05'), '2011-05-01');
  assert.equal(normalizeDate('2011-05-17'), '2011-05-17');
  assert.equal(normalizeDate('c. 1850'), null);
  const book = normalizeVolume({
    id: 'v1',
    volumeInfo: { title: 'X', publishedDate: '1938', categories: ['Fiction / Gothic'] },
  });
  assert.equal(book.publication_date, '1938-01-01');
  assert.deepEqual(book.genres.sort(), ['fiction', 'gothic']);
});

test('validation helpers', () => {
  assert.deepEqual(normalizeTags(['  Grief ', '#grief', 'Manor  Houses']), ['grief', 'manor houses']);
  assert.throws(() => normalizeTags('nope'), { status: 400 });
  assert.equal(optionalRating('4.5'), 4.5);
  assert.throws(() => optionalRating('4.3'), { status: 400 });
  assert.throws(() => optionalRating(6), { status: 400 });
  assert.equal(isDateString('2026-02-30'), false);
  assert.equal(isDateString('2026-02-28'), true);
  assert.equal(resolveToday('2020-01-01').length, 10);
});
