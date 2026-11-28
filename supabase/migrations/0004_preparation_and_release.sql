-- =============================================================================
-- RegistrarDocs AI — Milestones 9 & 10 Consolidated Incremental Migration
-- Migration: 0004_preparation_and_release.sql
--
-- Fully idempotent & non-destructive. Safe to run whether or not 0003 was
-- previously applied. Preserves all existing profiles, document_requests,
-- and notifications records.
--
-- Adds:
--   1. Milestone 9 review & separation columns on public.document_requests
--   2. Milestone 10 preparation, attachment, collection, identity verification,
--      and release columns on public.document_requests
--   3. Table public.request_status_history with RLS (Staff/Admin audit trail)
--   4. Private Supabase Storage bucket `prepared-documents` (PDF/JPG/PNG, 10 MB)
-- =============================================================================

-- 1. Milestone 9 + Milestone 10 columns on public.document_requests
alter table public.document_requests
  add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists requester_remarks text,
  add column if not exists internal_staff_notes text,
  add column if not exists is_resubmitted boolean not null default false,
  add column if not exists processing_started_at timestamptz,
  add column if not exists prepared_document_path text,
  add column if not exists prepared_document_name text,
  add column if not exists prepared_document_mime text,
  add column if not exists prepared_document_size integer,
  add column if not exists prepared_at timestamptz,
  add column if not exists prepared_by_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists collection_instructions text,
  add column if not exists ready_for_release_at timestamptz,
  add column if not exists ready_for_release_by uuid references public.profiles(id) on delete set null,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists collector_type text
    check (collector_type is null or collector_type in ('requester', 'authorized_representative')),
  add column if not exists collector_name text,
  add column if not exists release_remarks text,
  add column if not exists released_at timestamptz,
  add column if not exists released_by_staff_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_document_requests_assigned_staff
  on public.document_requests (assigned_staff_id);

create index if not exists idx_document_requests_released_at
  on public.document_requests (released_at desc)
  where released_at is not null;

-- 2. Request status history / audit events table
create table if not exists public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  from_status text,
  to_status text not null
    check (
      to_status in (
        'pending',
        'processing',
        'needs_correction',
        'ready_for_release',
        'released',
        'rejected'
      )
    ),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null check (actor_role in ('requester', 'staff', 'admin')),
  actor_name text not null,
  actor_account_ref text,
  action_type text,
  stage text,
  checklist_results jsonb,
  verification_remarks text,
  confirmations jsonb,
  requester_remarks text,
  internal_notes text,
  created_at timestamptz not null default now()
);

-- Idempotent column additions in case request_status_history was created earlier
alter table public.request_status_history
  add column if not exists actor_account_ref text,
  add column if not exists action_type text,
  add column if not exists stage text,
  add column if not exists checklist_results jsonb,
  add column if not exists verification_remarks text,
  add column if not exists confirmations jsonb;

create index if not exists idx_request_status_history_request_created
  on public.request_status_history (request_id, created_at asc);

-- 3. Explicit grants
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.request_status_history to service_role;

-- 4. Row Level Security (RLS) on request_status_history
-- Direct client access is denied so internal_notes can never leak to requesters.
alter table public.request_status_history enable row level security;

-- 5. Private Supabase Storage bucket for Staff-prepared final documents
-- Public access is strictly disabled (public = false). Requesters cannot access
-- unreleased final documents; Staff access is mediated through authenticated
-- Node.js backend endpoints.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prepared-documents',
  'prepared-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];
