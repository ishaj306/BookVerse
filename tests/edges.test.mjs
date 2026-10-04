import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPairEdges, diffEdges, edgeRows, makeGenreSkip, pairKey, splitPairKey } from '../lib/edges.js';

const A = '3f2b8c1e-1111-4a2b-8c3d-000000000001';
const B = '9a7d6e5f-2222-4b3c-9d4e-000000000002';
const C = '0c1d2e3f-3333-4c4d-8e5f-000000000003';

test('edge keys survive a round trip even though UUIDs contain hyphens', () => {
  const key = pairKey(B, A);
  assert.deepEqual(splitPairKey(key), [A, B].sort());
  assert.equal(pairKey(A, B), pairKey(B, A));
});

test('edgeRows produces full UUIDs in from/to', () => {
  const rows = edgeRows(new Map([[pairKey(A, B), 2]]), 'user_1', 'shared_tag');
  assert.equal(rows.length, 1);
  assert.match(rows[0].from_book_id, /^[0-9a-f-]{36}$/);
  assert.match(rows[0].to_book_id, /^[0-9a-f-]{36}$/);
  assert.equal(rows[0].weight, 2);
});

test('buildPairEdges weights by number of shared labels', () => {
  const groups = new Map([
    ['grief', new Set([A, B, C])],
    ['myth', new Set([A, B])],
    ['solo', new Set([C])],
  ]);
  const edges = buildPairEdges(groups);
  assert.equal(edges.get(pairKey(A, B)), 2);
  assert.equal(edges.get(pairKey(A, C)), 1);
  assert.equal(edges.get(pairKey(B, C)), 1);
  assert.equal(edges.size, 3);
});

test('buildPairEdges skips oversized and explicitly skipped groups', () => {
  const groups = new Map([['a', [A, B]], ['b', [A, C]]]);
  const edges = buildPairEdges(groups, { skip: (label) => label === 'b' });
  assert.equal(edges.size, 1);
  assert.equal(buildPairEdges(groups, { maxGroupSize: 1 }).size, 0);
});

test('diffEdges upserts only changes and reports stale rows', () => {
  const existing = [
    { id: 'r1', from_book_id: A, to_book_id: B, weight: 1 },
    { id: 'r2', from_book_id: C, to_book_id: A, weight: 1 },
  ];
  const desired = new Map([[pairKey(A, B), 2], [pairKey(B, C), 1]]);
  const { upsert, staleIds } = diffEdges(existing, desired, 'u', 'shared_tag');
  assert.equal(upsert.length, 2);
  assert.deepEqual(staleIds, ['r2']);

  const unchanged = diffEdges([existing[0]], new Map([[pairKey(A, B), 1]]), 'u', 'shared_tag');
  assert.equal(unchanged.upsert.length, 0);
  assert.equal(unchanged.staleIds.length, 0);
});

test('genre skip ignores genres covering most of a big library only', () => {
  const skip = makeGenreSkip(10);
  assert.equal(skip('fiction', new Array(6).fill('x')), true);
  assert.equal(skip('gothic', new Array(3).fill('x')), false);
  assert.equal(makeGenreSkip(4)('fiction', new Array(4).fill('x')), false);
});
