-- =============================================================================
-- RegistrarDocs AI — Milestone 9 Incremental Migration
-- Migration: 0003_staff_review_and_history.sql
--
-- Non-destructive incremental migration. Preserves all existing profiles,
-- document_requests, and notifications records.
--
-- Adds:
--   1. Staff review columns on public.document_requests:
--      - assigned_staff_id (responsible Registrar Staff user)
--      - requester_remarks (requester-visible instructions / correction / rejection reason)
--      - internal_staff_notes (STRICTLY Staff-only internal notes; never exposed to requesters)
--      - is_resubmitted (flags corrected requests returned for Staff re-review)
--      - processing_started_at (timestamp when processing began)
--   2. Table public.request_status_history (real chronological audit events)
--   3. Grants and Row Level Security (RLS)
-- =============================================================================

-- 1. Add review & separation columns to public.document_requests
alter table public.document_requests
  add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists requester_remarks text,
  add column if not exists internal_staff_notes text,
  add column if not exists is_resubmitted boolean not null default false,
  add column if not exists processing_started_at timestamptz;

create index if not exists idx_document_requests_assigned_staff
  on public.document_requests (assigned_staff_id);

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
  requester_remarks text,
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_request_status_history_request_created
  on public.request_status_history (request_id, created_at asc);

-- 3. Explicit grants
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.request_status_history to service_role;

-- 4. Enable Row Level Security (RLS) on request_status_history
-- Note: Direct client access is intentionally denied so internal_notes can never
-- be queried directly by requesters. Trusted Node.js API routes enforce role
-- scoping and strip internal_notes from all requester responses.
alter table public.request_status_history enable row level security;
