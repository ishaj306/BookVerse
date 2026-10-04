# BookVerse

A personal reading archive. The differentiator is the **Reading Constellation**: a graph of your books joined by shared tags, genres and links you draw yourself. See `docs/BookVerse PRD.html`.

Stack: Next.js 16 (App Router), Clerk (auth), Supabase (Postgres + RLS), Google Books with an Open Library fallback.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. In the Supabase SQL Editor run, in order:
   1. `supabase/schema.sql`
   2. `supabase/rls_policies.sql`
   3. `supabase/migrations/002_backend_hardening.sql`
   All three are safe to re-run.
4. In Supabase, add Clerk as a **third-party auth provider** (Authentication > Sign In / Up > Third-Party Auth). The API then uses Clerk's plain session token. If you still use the older JWT template, set `CLERK_SUPABASE_JWT_TEMPLATE=supabase`.
5. `npm run dev`, then `npm test` for the unit tests.

## API

Every route requires a signed-in user except `/api/health`. Errors are `{ "error": "..." }` with a 400 (bad input), 401, 404, 409, 429 or 500 status. Dates are `YYYY-MM-DD`. Send the reader's **local** date as `today` on routes that accept it, so streaks and auto-set dates are right in their timezone.

| Route | Methods | Notes |
| --- | --- | --- |
| `/api/user` | GET, PATCH | Profile; created on first GET from the Clerk name and avatar |
| `/api/books/search?q=` | GET | Cache, then Google Books, then Open Library. Returns `source`. 30 requests/min |
| `/api/books/[id]` | GET | One cached book |
| `/api/library` | GET, POST, PATCH, DELETE | GET takes `status`, `limit`, `offset`. DELETE also removes the book's constellation edges |
| `/api/journal` | GET, POST, PATCH, DELETE | GET takes `book_id`, `tag`. Tags are normalised; the book must be in the library |
| `/api/tags?q=` | GET | `[{ tag, count }]` for autocomplete |
| `/api/sessions` | GET, POST, DELETE | Logging pages advances progress; deleting takes them back |
| `/api/shelves` | GET, POST, PATCH, DELETE | |
| `/api/shelves/[id]/books` | GET, POST, DELETE | |
| `/api/connections` | GET, POST, DELETE | Manual "this reminded me of" links |
| `/api/constellation` | GET | `{ nodes, edges, topTags }`; `?year=` filters by finished year |
| `/api/constellation/recompute` | POST | Rebuild computed edges |
| `/api/analytics` | GET | `?year=&today=`. Streaks use all sessions, not just the year |
| `/api/insights` | GET | Top tags and per-quarter reading phases, no LLM |
| `/api/goals` | GET, POST, DELETE | One goal per type per year. `current` is computed live |
| `/api/import/goodreads` | POST | `{ csv, offset }`; call again with `nextOffset` until it is `null` |

## Notes

- Constellation edges are synced by diff (upsert, then delete stale), never wipe-and-rebuild.
- Genre edges are weighted at half a tag edge and skipped for genres that cover most of a library.
- Rate limiting is in memory per server instance. Use a shared store if you deploy several instances.
- `proxy.js` is Next 16's replacement for `middleware.js`.
