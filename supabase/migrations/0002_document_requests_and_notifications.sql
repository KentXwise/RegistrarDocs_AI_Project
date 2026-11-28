-- =============================================================================
-- RegistrarDocs AI — Milestone 6 Incremental Migration
-- Migration: 0002_document_requests_and_notifications.sql
--
-- Non-destructive incremental migration. Preserves public.profiles and all
-- existing records. Creates:
--   1. Sequence public.document_request_ref_seq for unique RD-YYYY-NNNNNN refs
--   2. Table public.document_requests with RLS & requester scoping
--   3. Table public.notifications with RLS & recipient scoping
--   4. Explicit table & sequence grants for authenticated and service_role
-- =============================================================================

-- 1. Sequence for sequential human-readable request reference numbers
create sequence if not exists public.document_request_ref_seq
  start with 1
  increment by 1
  minvalue 1
  cache 1;

-- 2. Document Requests table
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  document_type_code text not null
    check (document_type_code in ('tor', 'coe', 'diploma', 'other')),
  document_type_name text not null,
  purpose text not null,
  copies integer not null default 1 check (copies >= 1 and copies <= 10),
  additional_notes text,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'needs_correction',
        'ready_for_release',
        'released',
        'rejected'
      )
    ),
  idempotency_key text unique,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_requests_requester_id
  on public.document_requests (requester_id, submitted_at desc);

create index if not exists idx_document_requests_status
  on public.document_requests (status);

-- Keep updated_at current on updates
create or replace function public.set_document_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_document_requests_updated_at on public.document_requests;
create trigger trg_document_requests_updated_at
  before update on public.document_requests
  for each row
  execute function public.set_document_requests_updated_at();

-- Helper function to generate sequential RD-YYYY-NNNNNN reference numbers
create or replace function public.generate_request_reference_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'RD-' || extract(year from now())::int::text || '-' ||
         lpad(nextval('public.document_request_ref_seq')::text, 6, '0');
$$;

-- 3. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.document_requests(id) on delete set null,
  request_reference text,
  category text not null
    check (
      category in (
        'status_update',
        'missing_requirements',
        'processing_update',
        'ready_for_release',
        'collection_instructions'
      )
    ),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);

create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_id, is_read)
  where is_read = false;

-- 4. Table & sequence grants
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.document_requests to authenticated;
grant all on table public.document_requests to service_role;
grant select on table public.notifications to authenticated;
grant all on table public.notifications to service_role;
grant usage, select on sequence public.document_request_ref_seq to service_role;
grant execute on function public.generate_request_reference_number() to service_role;

-- 5. Enable Row Level Security (RLS)
alter table public.document_requests enable row level security;
alter table public.notifications enable row level security;

-- Requesters can view only their own document requests
drop policy if exists "document_requests_select_own" on public.document_requests;
create policy "document_requests_select_own"
  on public.document_requests
  for select
  to authenticated
  using (auth.uid() = requester_id);

-- Active admins can view all document requests (prepared for future milestones)
drop policy if exists "document_requests_select_admin" on public.document_requests;
create policy "document_requests_select_admin"
  on public.document_requests
  for select
  to authenticated
  using (public.is_active_admin());

-- Recipients can view only their own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = recipient_id);
