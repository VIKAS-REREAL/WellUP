-- ═══════════════════════════════════════════════════════════
-- WellUP — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Policies are prefixed with "wellup_" to avoid conflicts
-- across multiple projects in the same Supabase account.
-- ═══════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  bio             text,
  avatar_url      text,
  storage_consent boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.wellup_handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists wellup_on_auth_user_created on auth.users;
create trigger wellup_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.wellup_handle_new_user();

-- updated_at trigger function
create or replace function public.wellup_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists wellup_profiles_updated_at on public.profiles;
create trigger wellup_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.wellup_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- HEALTH CONTEXT
-- ─────────────────────────────────────────────────────────────
create table if not exists public.health_context (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  allergies           text[],
  conditions          text[],
  medications         text[],
  age_range           text,
  preferred_language  text default 'en',
  overall_health      text,
  sleep_hours         text,
  exercise_frequency  text,
  diet_preference     text,
  goals               text[],
  notes               text,
  updated_at          timestamptz default now()
);

drop trigger if exists wellup_health_context_updated_at on public.health_context;
create trigger wellup_health_context_updated_at
  before update on public.health_context
  for each row execute procedure public.wellup_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null default 'Conversation',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists wellup_conversations_updated_at on public.conversations;
create trigger wellup_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.wellup_set_updated_at();

create index if not exists wellup_conversations_user_updated
  on public.conversations(user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  category        text default 'General Health',
  is_emergency    boolean default false,
  created_at      timestamptz default now()
);

create index if not exists wellup_messages_conv_created
  on public.messages(conversation_id, created_at asc);

create index if not exists wellup_messages_user_created
  on public.messages(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  file_name       text not null,
  file_path       text not null,
  summary         text,
  extracted_facts jsonb,
  report_date     date,
  created_at      timestamptz default now()
);

create index if not exists wellup_reports_user_created
  on public.reports(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  title            text not null,
  appointment_at   timestamptz,
  source_report_id uuid references public.reports(id) on delete set null,
  notes            text,
  created_at       timestamptz default now()
);

create index if not exists wellup_appointments_user_at
  on public.appointments(user_id, appointment_at asc);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- All policies are prefixed with "wellup_" to avoid conflicts.
-- ═══════════════════════════════════════════════════════════

-- PROFILES
alter table public.profiles enable row level security;

drop policy if exists "wellup_profiles_select" on public.profiles;
create policy "wellup_profiles_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "wellup_profiles_insert" on public.profiles;
create policy "wellup_profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "wellup_profiles_update" on public.profiles;
create policy "wellup_profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

-- HEALTH CONTEXT
alter table public.health_context enable row level security;

drop policy if exists "wellup_health_context_all" on public.health_context;
create policy "wellup_health_context_all"
  on public.health_context for all
  using (auth.uid() = user_id);

-- CONVERSATIONS
alter table public.conversations enable row level security;

drop policy if exists "wellup_conversations_all" on public.conversations;
create policy "wellup_conversations_all"
  on public.conversations for all
  using (auth.uid() = user_id);

-- MESSAGES
alter table public.messages enable row level security;

drop policy if exists "wellup_messages_all" on public.messages;
create policy "wellup_messages_all"
  on public.messages for all
  using (auth.uid() = user_id);

-- REPORTS
alter table public.reports enable row level security;

drop policy if exists "wellup_reports_all" on public.reports;
create policy "wellup_reports_all"
  on public.reports for all
  using (auth.uid() = user_id);

-- APPOINTMENTS
alter table public.appointments enable row level security;

drop policy if exists "wellup_appointments_all" on public.appointments;
create policy "wellup_appointments_all"
  on public.appointments for all
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET (run manually in Supabase Dashboard)
-- Storage → New Bucket → Name: "wellup-reports" → Private
-- ═══════════════════════════════════════════════════════════
-- Uncomment and run separately if you want storage via SQL:
-- insert into storage.buckets (id, name, public)
--   values ('wellup-reports', 'wellup-reports', false)
--   on conflict (id) do nothing;
-- ═══════════════════════════════════════════════════════════
