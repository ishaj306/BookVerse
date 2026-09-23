-- ============================================================
-- BookVerse v1 — Row Level Security Policies
-- 
-- Clerk is the auth provider (NOT Supabase Auth).
-- Clerk issues JWTs → Supabase verifies via third-party auth.
-- User id is extracted from: (auth.jwt() ->> 'sub')
-- 
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- ============================================================

-- Enable RLS on all tables
alter table book_cache enable row level security;
alter table users enable row level security;
alter table user_books enable row level security;
alter table journal_entries enable row level security;
alter table shelves enable row level security;
alter table shelf_books enable row level security;
alter table reading_sessions enable row level security;
alter table book_connections enable row level security;
alter table goals enable row level security;

-- ============================================================
-- book_cache: shared read-only for all authenticated users
-- Writes restricted to service role (populates after Google Books calls)
-- ============================================================

create policy "book_cache_select_all"
  on book_cache for select
  to authenticated
  using (true);

-- No insert/update/delete policies for authenticated users.
-- Only the service role (used in API routes) can write to book_cache.

-- ============================================================
-- users: users can read/update their own profile
-- ============================================================

create policy "users_select_own"
  on users for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = id);

create policy "users_insert_own"
  on users for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = id);

create policy "users_update_own"
  on users for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = id)
  with check ((auth.jwt() ->> 'sub') = id);

-- ============================================================
-- user_books: users can CRUD their own library entries
-- ============================================================

create policy "user_books_select_own"
  on user_books for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "user_books_insert_own"
  on user_books for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "user_books_update_own"
  on user_books for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "user_books_delete_own"
  on user_books for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- journal_entries: users can CRUD their own entries
-- ============================================================

create policy "journal_entries_select_own"
  on journal_entries for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "journal_entries_insert_own"
  on journal_entries for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "journal_entries_update_own"
  on journal_entries for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "journal_entries_delete_own"
  on journal_entries for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- shelves: users can CRUD their own shelves
-- ============================================================

create policy "shelves_select_own"
  on shelves for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "shelves_insert_own"
  on shelves for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "shelves_update_own"
  on shelves for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "shelves_delete_own"
  on shelves for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- shelf_books: access through shelf ownership
-- Users can manage books on their own shelves
-- ============================================================

create policy "shelf_books_select_own"
  on shelf_books for select
  to authenticated
  using (
    exists (
      select 1 from shelves
      where shelves.id = shelf_books.shelf_id
      and (auth.jwt() ->> 'sub') = shelves.user_id
    )
  );

create policy "shelf_books_insert_own"
  on shelf_books for insert
  to authenticated
  with check (
    exists (
      select 1 from shelves
      where shelves.id = shelf_books.shelf_id
      and (auth.jwt() ->> 'sub') = shelves.user_id
    )
  );

create policy "shelf_books_delete_own"
  on shelf_books for delete
  to authenticated
  using (
    exists (
      select 1 from shelves
      where shelves.id = shelf_books.shelf_id
      and (auth.jwt() ->> 'sub') = shelves.user_id
    )
  );

-- ============================================================
-- reading_sessions: users can CRUD their own sessions
-- ============================================================

create policy "reading_sessions_select_own"
  on reading_sessions for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "reading_sessions_insert_own"
  on reading_sessions for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "reading_sessions_update_own"
  on reading_sessions for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "reading_sessions_delete_own"
  on reading_sessions for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- book_connections: users can CRUD their own connections
-- ============================================================

create policy "book_connections_select_own"
  on book_connections for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "book_connections_insert_own"
  on book_connections for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "book_connections_update_own"
  on book_connections for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "book_connections_delete_own"
  on book_connections for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- goals: users can CRUD their own goals
-- ============================================================

create policy "goals_select_own"
  on goals for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "goals_insert_own"
  on goals for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "goals_update_own"
  on goals for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "goals_delete_own"
  on goals for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);
