# BookVerse — AI Session & Handoff Log

> **Note for AI Assistant / Future Models:**
> This document logs the architecture, implementation history, current status, pending frontend merge steps, and explicit action items for this repository. Read this file first before making changes.

---

## 1. Project Context & North Star

- **Product Name:** BookVerse
- **Lineage:** Sister product to *Kathak Journal*. Follows "The Illuminated Archive" design language (warm parchment, oxblood, antique gold, sage, Cormorant Garamond headings, DM Sans UI).
- **Core Differentiator:** **The Reading Constellation** — a personal knowledge graph showing how books connect through themes, genres, user-defined tags, and manual links.
- **Explicit Non-Goals (v1):** No social feed, no gamification badges, no AI chatbot, no public profiles.
- **North Star User Story:**
  > "As a reader, I finish a book, write down what I thought and a quote that mattered, tag it, and later — without doing anything else — I can look at a map of my last twenty books and see the invisible thread connecting my 'psychology' phase to my 'fantasy' phase."

---

## 2. Technology Stack & Strategy

| Layer | Choice | Details |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Located inside `/bookverse-app` |
| **Styling** | Vanilla CSS (`globals.css`) | No Tailwind; uses CSS variables matching PRD tokens |
| **Auth** | Clerk (Email + Google) | Configured in `middleware.js` & `app/layout.js` |
| **Database** | Supabase (Postgres) | RLS policies keyed to Clerk JWT subject: `(auth.jwt() ->> 'sub') = user_id` |
| **External API** | Google Books API | Cached in `book_cache` table to avoid repeated calls |
| **Graph Engine** | D3 (`d3-force`) | Force-directed node graph for the Constellation |
| **Typography** | Cormorant Garamond & DM Sans | Loaded via Google Fonts in `app/layout.js` |

---

## 3. Work Completed in This Session

### 3.1 Project Scaffolding
- Initialized Next.js App Router in `bookverse-app` (JavaScript, vanilla CSS, ESLint).
- Configured fonts (`Cormorant Garamond` display, `DM Sans` UI) and wrapped layout with `<ClerkProvider>`.
- Verified production build: `npm run build` succeeds with zero errors (all 14 routes statically/dynamically generated).

### 3.2 Database Layer (`bookverse-app/supabase/`)
1. **`schema.sql`**: Full schema with indexes and automated `updated_at` triggers for 9 tables:
   - `book_cache`: Shared cache for Google Books metadata.
   - `users`: Profile records keyed to Clerk user IDs.
   - `user_books`: Library entries (status: `want`, `reading`, `read`, `paused`, `dnf`, progress, rating).
   - `journal_entries`: "Inscriptions" (notes, quotes, page refs, tags).
   - `shelves` & `shelf_books`: Custom user collections.
   - `reading_sessions`: Daily session logs for streaks, pace, and heatmaps.
   - `book_connections`: Graph edges (`manual`, `shared_tag`, `shared_genre`, weight).
   - `goals`: Yearly reading targets.
2. **`rls_policies.sql`**: Row Level Security policies matching Clerk's JWT token structure (`(auth.jwt() ->> 'sub') = user_id`). `book_cache` is read-only for authenticated users and written only via the service-role client.

### 3.3 Core Backend Logic (`bookverse-app/lib/`)
- **`supabase.js`**: Factory for authenticated Supabase client (using Clerk session token) and service-role client (for system writes to `book_cache`).
- **`auth.js`**: Route authentication helper (`getAuthenticatedClients()`) ensuring valid Clerk session and structured error handling.
- **`google-books.js`**: Google Books API wrapper with `searchBooksWithCache()`, volume normalization, and deduplicated insertion into `book_cache`.
- **`constellation.js`**:
  - `recomputeTagConnections()`: Calculates shared-tag edge weights between books based on journal entries.
  - `recomputeGenreConnections()`: Calculates shared-genre edges from `book_cache`.
  - `getConstellationGraph()`: Formats nodes and edges for D3 force layout rendering.

### 3.4 API Routes (`bookverse-app/app/api/`)
All routes are built, authenticated, and verified:
- `GET /api/health` — Public health check.
- `GET, PATCH /api/user` — Profile management with auto-create on first login.
- `GET /api/books/search` — Cached Google Books search.
- `GET /api/books/[id]` — Single book details from cache.
- `GET, POST, PATCH, DELETE /api/library` — User library CRUD with date automation.
- `GET, POST, PATCH, DELETE /api/journal` — Inscriptions CRUD with auto-recomputation of constellation edges.
- `GET, POST, PATCH, DELETE /api/shelves` — Shelf CRUD with book counts.
- `GET, POST, DELETE /api/shelves/[id]/books` — Add/remove books from custom shelves.
- `GET, POST, DELETE /api/sessions` — Reading session logging with auto-sync to book progress.
- `GET, POST, DELETE /api/connections` — Manual book connections.
- `GET, POST /api/constellation` — Graph data extraction & manual recompute trigger.
- `GET /api/analytics` — Annual stats, reading streak calculation, genre breakdown, heatmap.
- `GET, POST, DELETE /api/goals` — Reading target tracking.
- `GET /api/tags` — Unique tag autocomplete endpoint for the journal composer.

### 3.5 Design System Tokens (`bookverse-app/app/globals.css`)
- Variables implemented: `--ink`, `--parchment`, `--parchment-dim`, `--oxblood`, `--oxblood-deep`, `--antique-gold`, `--sage-muted`, `--charcoal`.
- Dark-theme overrides configured for the Constellation view and general dark mode.
- Base utility classes: `.btn-primary`, `.btn-secondary`, `.tag-pill`, `.folio-card`, `.numeral`, `.inscription-quote`.

---

## 4. What Remains to Be Done (Next Steps)

### Step 1: Frontend Merge (Pending Stitch Folders)
The user will provide Google Stitch exported screens/folders. Once received, map them to the following Next.js pages:
1. **Screen 1 — Landing Page**: `app/(auth)/page.js` (Serif hero, 2 CTAs, 3 feature pillars, Roman-numeral footer).
2. **Screen 2 — Dashboard**: `app/(app)/dashboard/page.js` (Greeting, reading goal bar, Currently Reading card, GitHub-style activity heatmap, stat tiles).
3. **Screen 3 — Library / Shelves**: `app/(app)/library/page.js` (Understated serif tabs, book cover grid, custom shelves sidebar).
4. **Screen 4 — Folio (Book Detail)**: `app/(app)/book/[id]/page.js` (Cover drop shadow, star rating, status pills, Inscriptions list).
5. **Screen 5 — Reading Constellation**: `app/(app)/constellation/page.js` (Force-directed D3 graph on dark oxblood background, node click sidebar, edge legend).
6. **Screen 6 — Journal Composer**: `app/(app)/book/[id]/inscribe/page.js` or modal (Deckle-edge texture, italic textarea, quote input, tag autocomplete).

### Step 2: Auth Pages
- Set up Clerk `<SignIn />` and `<SignUp />` components at `app/(auth)/sign-in/[[...sign-in]]/page.js` and `app/(auth)/sign-up/[[...sign-up]]/page.js`.

---

## 5. What the User Needs to Do (Action Items)

1. **Supabase Database Setup:**
   - Open your Supabase project dashboard -> SQL Editor.
   - Run `bookverse-app/supabase/schema.sql`.
   - Run `bookverse-app/supabase/rls_policies.sql`.
   - In Supabase Auth -> Third-Party Auth, enable Clerk as an OpenID Connect / JWT provider so `(auth.jwt() ->> 'sub')` resolves to the Clerk user ID.

2. **Configure Environment Variables:**
   - In `bookverse-app/.env.local`, replace placeholders:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` (from Clerk Dashboard).
     - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Project Settings -> API).
     - `GOOGLE_BOOKS_API_KEY` (from Google Cloud Console -> APIs & Services -> Credentials).

3. **Provide Stitch Screen Outputs:**
   - Drop the Stitch exported folders or code into the project root when ready to assemble the UI.

---

## 6. How to Run the App Locally

```bash
cd bookverse-app
npm run dev
```
App will be running at `http://localhost:3000`.
Health check: `http://localhost:3000/api/health`.
