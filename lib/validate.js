import { ApiError } from './http.js';

export const BOOK_STATUSES = ['want', 'reading', 'read', 'paused', 'dnf'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function requireUuid(value, name) {
  if (!isUuid(value)) throw new ApiError(400, `${name} must be a valid id`);
  return value;
}

export function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A YYYY-MM-DD string, null/'' -> null, anything else -> 400. */
export function optionalDate(value, name) {
  if (value === undefined || value === null || value === '') return null;
  if (!isDateString(value)) throw new ApiError(400, `${name} must be a date (YYYY-MM-DD)`);
  return value;
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The client's local "today" if it sent a sane one, else UTC today.
 * Sending the local date is what keeps streaks correct across timezones.
 */
export function resolveToday(clientToday) {
  if (!isDateString(clientToday)) return todayUTC();
  const skewMs = Math.abs(Date.parse(`${clientToday}T00:00:00Z`) - Date.parse(`${todayUTC()}T00:00:00Z`));
  return skewMs <= 2 * 86400000 ? clientToday : todayUTC();
}

export function optionalInt(value, name, { min = 0, max = 1_000_000 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ApiError(400, `${name} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

export function optionalNumber(value, name, { min = 0, max = 1_000_000 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ApiError(400, `${name} must be a number between ${min} and ${max}`);
  }
  return n;
}

export function optionalRating(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 5 || Math.round(n * 2) !== n * 2) {
    throw new ApiError(400, 'rating must be between 0 and 5 in steps of 0.5');
  }
  return n;
}

export function optionalText(value, name, max) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ApiError(400, `${name} must be text`);
  const s = value.trim();
  if (s.length > max) throw new ApiError(400, `${name} must be at most ${max} characters`);
  return s || null;
}

export function requireStatus(value) {
  if (!BOOK_STATUSES.includes(value)) {
    throw new ApiError(400, `status must be one of: ${BOOK_STATUSES.join(', ')}`);
  }
  return value;
}

/** Lowercase, collapse whitespace, drop a leading '#', cap length. */
export function normalizeTag(tag) {
  return String(tag).toLowerCase().replace(/\s+/g, ' ').replace(/^#+/, '').trim().slice(0, 40);
}

/** Validate + normalise a tags array. Returns a deduplicated array. */
export function normalizeTags(tags) {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    throw new ApiError(400, 'tags must be an array of strings');
  }
  const out = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  if (out.length > 20) throw new ApiError(400, 'A journal entry can have at most 20 tags');
  return out;
}
