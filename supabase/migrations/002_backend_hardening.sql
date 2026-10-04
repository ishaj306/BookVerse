-- ============================================================
-- BookVerse — 002 backend hardening
-- Run in the Supabase SQL Editor after schema.sql and rls_policies.sql.
-- Safe to run more than once.
-- ============================================================

-- 1. One goal per type per year (the goals API upserts on this).
--    Remove any duplicates first, keeping the newest.
delete from goals a
  using goals b
  where a.user_id = b.user_id
    and a.type = b.type
    and a.year = b.year
    and (a.created_at, a.id) < (b.created_at, b.id);

do $$ begin
  alter table goals add constraint goals_user_type_year_key unique (user_id, type, year);
exception when duplicate_object or duplicate_table then null; end $$;

-- 2. Data-quality constraints. NOT VALID checks new writes without failing on
--    any old rows.
do $$ begin
  alter table goals add constraint goals_type_check
    check (type in ('yearly_books', 'yearly_pages', 'yearly_minutes')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table reading_sessions add constraint reading_sessions_positive
    check (coalesce(pages_read, 1) > 0 and coalesce(duration_minutes, 1) > 0) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table journal_entries add constraint journal_entries_has_body
    check (content is not null or quote is not null) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table book_connections add constraint book_connections_no_self_link
    check (from_book_id <> to_book_id) not valid;
exception when duplicate_object then null; end $$;

-- 3. Indexes for the queries the API actually runs.
create index if not exists idx_user_books_finished
  on user_books (user_id, finished_at) where status = 'read';

create index if not exists idx_book_connections_type
  on book_connections (user_id, connection_type);

-- Fast ilike search over the shared book cache (cache-first search).
create extension if not exists pg_trgm;

create index if not exists idx_book_cache_title_trgm
  on book_cache using gin (title gin_trgm_ops);

create index if not exists idx_book_cache_author_trgm
  on book_cache using gin (author gin_trgm_ops);
