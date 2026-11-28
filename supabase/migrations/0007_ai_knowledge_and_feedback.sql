-- =============================================================================
-- RegistrarDocs AI — AI Registrar Assistant & Feedback Analyzer
-- Migration: 0007_ai_knowledge_and_feedback.sql
--
-- Fully idempotent & non-destructive.
--   1. Extends public.ai_knowledge_sources with verification metadata
--      (is_verified, last_verified_at, document_type_code, checklist_verified, seed_key)
--   2. Creates public.user_feedback with strict `is_synthetic` separation so
--      TEST/SYNTHETIC feedback is never mixed with real DNSC user feedback.
--   3. Enables RLS and grants on public.user_feedback.
-- =============================================================================

-- 1. Extend public.ai_knowledge_sources with verification & document-checklist metadata
alter table public.ai_knowledge_sources
  add column if not exists is_verified boolean not null default true,
  add column if not exists last_verified_at date default current_date,
  add column if not exists document_type_code text,
  add column if not exists checklist_verified boolean not null default false,
  add column if not exists seed_key text;

create unique index if not exists idx_ai_knowledge_sources_seed_key_unique
  on public.ai_knowledge_sources (seed_key)
  where seed_key is not null;

-- 2. User Feedback table (supports real requester feedback + strictly isolated synthetic test data)
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null default 'General',
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  comment text not null,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_feedback_synthetic_created
  on public.user_feedback (is_synthetic, created_at desc);

grant usage on schema public to anon, authenticated, service_role;
grant all on table public.user_feedback to service_role;
grant insert on table public.user_feedback to authenticated;

alter table public.user_feedback enable row level security;

-- Authenticated users may submit their own non-synthetic feedback
drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own"
  on public.user_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id and is_synthetic = false);

-- Active admins may read all feedback via RLS (and backend uses service_role)
drop policy if exists "user_feedback_select_admin" on public.user_feedback;
create policy "user_feedback_select_admin"
  on public.user_feedback
  for select
  to authenticated
  using (public.is_active_admin());
