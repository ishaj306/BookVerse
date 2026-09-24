# BookVerse — Project Documentation

A digital archive for a reading life, built in the lineage of *Kathak Journal*. Designed with "The Illuminated Archive" aesthetic (warm parchment, oxblood, antique gold, and literary serif typography).

---

## Quick Start

### 1. Install & Run Locally

```bash
cd bookverse-app
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

To verify the build:
```bash
npm run build
```

---

## Configuration (`.env.local`)

Edit `bookverse-app/.env.local` with your credentials:

```ini
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Books API
GOOGLE_BOOKS_API_KEY=AIzaSy...
```

---

## Database Setup (Supabase)

Run the following scripts in your Supabase SQL Editor in order:
1. `bookverse-app/supabase/schema.sql` — Creates tables, indexes, and triggers.
2. `bookverse-app/supabase/rls_policies.sql` — Sets up Row-Level Security for Clerk auth.

### Tables Overview

| Table | Purpose |
|---|---|
| `book_cache` | Shared metadata cache for books fetched via Google Books |
| `users` | User profile details keyed to Clerk user IDs |
| `user_books` | Personal library entries (`want`, `reading`, `read`, `paused`, `dnf`, progress, ratings) |
| `journal_entries` | Inscriptions (notes, quotes, page references, and tags) |
| `shelves` & `shelf_books` | Custom shelves/collections |
| `reading_sessions` | Granular reading sessions (pages read, duration) powering streaks and heatmaps |
| `book_connections` | Reading Constellation edges (manual connections + shared tags/genres) |
| `goals` | Yearly reading goals and tracked progress |

---

## API Reference

All routes are in `bookverse-app/app/api/` and require Clerk authentication (except `/api/health`):

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check (public) |
| `/api/user` | `GET`, `PATCH` | Fetch or update user profile |
| `/api/books/search?q={query}` | `GET` | Search Google Books (cached automatically) |
| `/api/books/{id}` | `GET` | Get cached book details |
| `/api/library` | `GET`, `POST`, `PATCH`, `DELETE` | Manage user reading library |
| `/api/journal` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD for journal notes & quotes (auto-updates graph) |
| `/api/shelves` | `GET`, `POST`, `PATCH`, `DELETE` | Manage custom shelves |
| `/api/shelves/{id}/books` | `GET`, `POST`, `DELETE` | Add/remove books in shelves |
| `/api/sessions` | `GET`, `POST`, `DELETE` | Log reading sessions (auto-updates progress) |
| `/api/connections` | `GET`, `POST`, `DELETE` | Manage manual "reminds me of" book connections |
| `/api/constellation` | `GET`, `POST` | Get graph nodes & edges / trigger edge recalculation |
| `/api/analytics?year={year}` | `GET` | Annual reading statistics, streaks, and heatmap data |
| `/api/goals` | `GET`, `POST`, `DELETE` | Track reading goals |
| `/api/tags` | `GET` | Autocomplete tags from previous journal entries |

---

## Design System Tokens (`globals.css`)

- **Palette:**
  - Ivory Parchment (`#F6F1E7`) & Secondary Surface (`#EDE6D6`)
  - Deep Oxblood (`#4A141C`) & Oxblood Accent (`#6B1E2A`)
  - Antique Gold (`#B08D57`)
  - Muted Sage (`#6E7A5E`)
  - Ink (`#1F1B18`) & Charcoal (`#2B2521`)
- **Typography:**
  - Headings / Book Titles: *Cormorant Garamond* (Serif)
  - UI / Body / Numbers: *DM Sans* (Clean sans-serif with tabular numerals)
- **Motifs:** Folios (books), Inscriptions (journal entries), Manuscript (collection).
