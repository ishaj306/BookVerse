-- ============================================================
-- BookVerse v1 — Database Schema
-- Run this in Supabase SQL Editor to create all tables.
-- ============================================================

-- 1. Cached book metadata (shared across all users)
-- Avoids hitting Google Books API on every render.
create table if not exists book_cache (
  id uuid primary key default gen_random_uuid(),
  source_id text unique not null,          -- Google Books volume id
  title text not null,
  author text,
  description text,
  isbn text,
  cover_url text,
  publication_date date,
  pages int,
  genres text[] default '{}',
  cached_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_book_cache_source_id on book_cache(source_id);
create index idx_book_cache_isbn on book_cache(isbn);

-- 2. Users (id is Clerk user id, text — NOT a Supabase Auth uuid)
create table if not exists users (
  id text primary key,                     -- e.g. "user_2abc..."
  name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. User's book library — status, progress, rating, dates
create table if not exists user_books (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  book_id uuid not null references book_cache(id) on delete cascade,
  status text not null check (status in ('want', 'reading', 'read', 'paused', 'dnf')),
  progress numeric default 0,             -- page number or percentage
  rating numeric check (rating >= 0 and rating <= 5),
  started_at date,
  finished_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, book_id)
);

create index idx_user_books_user_id on user_books(user_id);
create index idx_user_books_status on user_books(user_id, status);

-- 4. Reading Journal entries — the data source for the Constellation
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  book_id uuid not null references book_cache(id) on delete cascade,
  content text,                            -- main thought / note
  quote text,                              -- favorite quote
  page_number int,
  tags text[] default '{}',                -- raw material for the Constellation
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_journal_entries_user_id on journal_entries(user_id);
create index idx_journal_entries_book_id on journal_entries(user_id, book_id);
create index idx_journal_entries_tags on journal_entries using gin(tags);

-- 5. Custom shelves
create table if not exists shelves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create index idx_shelves_user_id on shelves(user_id);

-- 6. Many-to-many: shelves <-> books
create table if not exists shelf_books (
  shelf_id uuid not null references shelves(id) on delete cascade,
  book_id uuid not null references book_cache(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (shelf_id, book_id)
);

-- 7. Reading sessions — granular daily data for streaks + heatmap + pace
-- Log this from day one, even in v1.
create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  book_id uuid not null references book_cache(id) on delete cascade,
  pages_read int,
  duration_minutes int,
  session_date date not null default current_date,
  created_at timestamptz default now()
);

create index idx_reading_sessions_user_id on reading_sessions(user_id);
create index idx_reading_sessions_date on reading_sessions(user_id, session_date);

-- 8. Book connections — edges for the Reading Constellation
-- Manual "this reminded me of X" links + computed shared-tag/genre edges
create table if not exists book_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  from_book_id uuid not null references book_cache(id) on delete cascade,
  to_book_id uuid not null references book_cache(id) on delete cascade,
  connection_type text not null check (connection_type in ('manual', 'shared_tag', 'shared_genre')),
  label text,                              -- optional label for manual connections
  weight numeric default 1,
  created_at timestamptz default now(),
  unique (user_id, from_book_id, to_book_id, connection_type)
);

create index idx_book_connections_user_id on book_connections(user_id);
create index idx_book_connections_from on book_connections(user_id, from_book_id);
create index idx_book_connections_to on book_connections(user_id, to_book_id);

-- 9. Reading goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  type text not null,                      -- e.g. 'yearly_books', 'yearly_pages'
  target int not null,
  current int default 0,
  year int not null default extract(year from current_date),
  deadline date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_goals_user_id on goals(user_id);

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_book_cache_updated_at
  before update on book_cache
  for each row execute function update_updated_at_column();

create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at_column();

create trigger trg_user_books_updated_at
  before update on user_books
  for each row execute function update_updated_at_column();

create trigger trg_journal_entries_updated_at
  before update on journal_entries
  for each row execute function update_updated_at_column();

create trigger trg_goals_updated_at
  before update on goals
  for each row execute function update_updated_at_column();
