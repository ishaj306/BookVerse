'use client';

import { useCallback, useEffect, useState } from 'react';

/** Call one of our own API routes. Throws an Error with the server's message. */
export async function api(path, { method = 'GET', body } = {}) {
  // Development only: /mock turns on sample data. This whole block is removed
  // from production builds, so the fixtures are never shipped.
  if (process.env.NODE_ENV !== 'production' && typeof document !== 'undefined' && document.cookie.includes('bv_mock=1')) {
    const { mockApi } = await import('./mock-api');
    return mockApi(path, { method, body });
  }

  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty or non-JSON body
  }

  if (!response.ok) {
    throw new Error(data?.error || `Something went wrong (${response.status})`);
  }
  return data;
}

const pad = (n) => String(n).padStart(2, '0');

/** The reader's local date as YYYY-MM-DD (what the API wants for `today`). */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Load JSON from an API route. Pass null to skip. Returns
 * { data, error, loading, reload }.
 *
 * `loading` is only true until the first answer for a path arrives. A
 * `reload()` refreshes quietly and keeps the old data on screen, so pages do
 * not flash back to a skeleton after every action.
 */
export function useApi(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ path: null, data: null, error: null });

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    api(path)
      .then((data) => !cancelled && setResult({ path, data, error: null }))
      .catch((error) => !cancelled && setResult((prev) => ({ path, data: prev.path === path ? prev.data : null, error: error.message })));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = result.path === path;

  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: Boolean(path) && !current,
    reload,
  };
}

export const STATUS_LABELS = {
  want: 'Want to read',
  reading: 'Reading',
  read: 'Read',
  paused: 'Paused',
  dnf: 'Did not finish',
};

export const STATUSES = ['want', 'reading', 'read', 'paused', 'dnf'];

/** Title-case a lowercase genre/tag for display. */
export function titleCase(text) {
  return String(text).replace(/\b\w/g, (c) => c.toUpperCase());
}
