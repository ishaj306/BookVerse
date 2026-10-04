/**
 * Small HTTP helpers shared by API routes.
 */

/** An error that maps directly to an HTTP response. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Parse a JSON object body, or throw a 400. */
export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }
  return body;
}

/** Copy only the listed keys (that are present) from an object. */
export function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

/**
 * In-memory sliding-window rate limiter. Per server instance only, which is
 * enough to protect the Google Books quota from a single runaway client.
 */
const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    throw new ApiError(429, 'Too many requests. Please slow down.');
  }
  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
}
