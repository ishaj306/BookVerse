'use client';

import { useCallback, useEffect, useState } from 'react';

/** Call one of our own API routes. Throws an Error with the server's message. */
export async function api(path, { method = 'GET', body } = {}) {
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
 */
export function useApi(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const key = path ? `${path}#${tick}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    api(path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((error) => !cancelled && setResult({ key, data: null, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const settled = result.key === key;

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: Boolean(key) && !settled,
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
