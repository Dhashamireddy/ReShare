-- ══════════════════════════════════════════
-- Give & Gather — Supabase Setup SQL
-- Run this in: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id       uuid references auth.users on delete cascade primary key,
  name     text not null,
  role     text not null check (role in ('donor','ngo')),
  org      text,
  area     text,
  phone    text,
  created_at timestamptz default now()
);

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role, org, area)
  values (new.id, '', 'donor', null, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. DONATIONS
create table if not exists public.donations (
  id          uuid default gen_random_uuid() primary key,
  donor_id    uuid references public.profiles(id) on delete cascade,
  category    text not null check (category in ('clothes','books','food')),
  title       text not null,
  qty         text,
  area        text,
  expiry      text,
  notes       text,
  urgent      boolean default false,
  claimed     boolean default false,
  created_at  timestamptz default now()
);

-- 3. REQUESTS (NGO needs)
create table if not exists public.requests (
  id          uuid default gen_random_uuid() primary key,
  ngo_id      uuid references public.profiles(id) on delete cascade,
  category    text not null check (category in ('clothes','books','food')),
  title       text not null,
  qty         text,
  area        text,
  urgency     text default 'mid' check (urgency in ('high','mid','low')),
  status      text default 'pending' check (status in ('pending','matched','fulfilled')),
  desc        text,
  created_at  timestamptz default now()
);

-- 4. MESSAGES
create table if not exists public.messages (
  id          uuid default gen_random_uuid() primary key,
  thread_id   text not null,
  sender_id   uuid references public.profiles(id) on delete cascade,
  text        text not null,
  created_at  timestamptz default now()
);

-- ── ROW LEVEL SECURITY ──

alter table public.profiles  enable row level security;
alter table public.donations enable row level security;
alter table public.requests  enable row level security;
alter table public.messages  enable row level security;

-- Profiles: users can read all, update only their own
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Donations: anyone logged in can read; donors can insert their own
create policy "donations_read"   on public.donations for select using (auth.role() = 'authenticated');
create policy "donations_insert" on public.donations for insert with check (auth.uid() = donor_id);
create policy "donations_update" on public.donations for update using (auth.uid() = donor_id);

-- Requests: anyone logged in can read; NGOs can insert/update their own
create policy "requests_read"   on public.requests for select using (auth.role() = 'authenticated');
create policy "requests_insert" on public.requests for insert with check (auth.uid() = ngo_id);
create policy "requests_update" on public.requests for update using (auth.uid() = ngo_id);
create policy "requests_delete" on public.requests for delete using (auth.uid() = ngo_id);

-- Messages: participants can read and send
create policy "messages_read"   on public.messages for select using (auth.role() = 'authenticated');
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);

-- ══════════════════════════════════════════
-- DONE. Your database is ready.
-- Now add your SUPABASE_URL and SUPABASE_ANON
-- keys into supabase.js and deploy!
-- ══════════════════════════════════════════
