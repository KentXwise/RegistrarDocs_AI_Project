-- =============================================================================
-- RegistrarDocs AI — Milestone 11: Admin Dashboard & Management
-- Migration: 0005_admin_management_and_audit.sql
--
-- Fully idempotent & non-destructive. Preserves all existing profiles,
-- document_requests, request_status_history, and notifications records.
--
-- Adds:
--   1. Admin review metadata columns on public.profiles (approval_remarks,
--      reviewed_by_admin_id, reviewed_at)
--   2. Relaxes hardcoded 4-item document_type_code CHECK on document_requests
--      so Admin-created document types can be requested cleanly
--   3. public.document_types & public.document_requirements (seeded idempotently
--      from existing catalog entries)
--   4. public.faqs (Admin-managed FAQs for Requester Help & Assistant)
--   5. public.ai_knowledge_sources (Approved informational AI knowledge sources)
--   6. public.admin_audit_logs (Immutable administrative audit trail)
--   7. Strict RLS policies & explicit grants on all new tables
-- =============================================================================

-- 1. Profile approval/review metadata columns
alter table public.profiles
  add column if not exists approval_remarks text,
  add column if not exists reviewed_by_admin_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- 2. Allow Admin-managed document type codes in document_requests
alter table public.document_requests
  drop constraint if exists document_requests_document_type_code_check;

-- 3. Document Types Catalog table
create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_label text not null,
  category text not null default 'Registrar Document',
  short_description text not null,
  full_description text not null,
  instructions text,
  processing_info text,
  requires_additional_notes boolean not null default false,
  additional_notes_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_types_active
  on public.document_types (is_active, name);

-- 4. Document Requirements table (linked to document_types)
create table if not exists public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  document_type_id uuid not null references public.document_types(id) on delete cascade,
  title text not null,
  description text,
  is_mandatory boolean not null default true,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_requirements_doc_order
  on public.document_requirements (document_type_id, display_order asc);

-- 5. FAQs table
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faqs_published_category
  on public.faqs (is_published, category);

-- 6. Approved AI Knowledge Sources table (informational grounding only)
create table if not exists public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Registrar Information',
  source_type text not null default 'official_document'
    check (
      source_type in (
        'official_document',
        'registrar_procedure',
        'document_requirements',
        'institutional_faq',
        'official_webpage'
      )
    ),
  source_url text,
  content_summary text not null,
  is_enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_knowledge_sources_enabled
  on public.ai_knowledge_sources (is_enabled, category);

-- 7. Immutable Administrative Audit Logs table
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text not null default 'admin',
  actor_account_ref text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text,
  description text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);

create index if not exists idx_admin_audit_logs_entity_action
  on public.admin_audit_logs (entity_type, action);

-- 8. Shared updated_at trigger for Admin tables
create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_document_types_updated_at on public.document_types;
create trigger trg_document_types_updated_at
  before update on public.document_types
  for each row execute function public.set_generic_updated_at();

drop trigger if exists trg_document_requirements_updated_at on public.document_requirements;
create trigger trg_document_requirements_updated_at
  before update on public.document_requirements
  for each row execute function public.set_generic_updated_at();

drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_generic_updated_at();

drop trigger if exists trg_ai_knowledge_sources_updated_at on public.ai_knowledge_sources;
create trigger trg_ai_knowledge_sources_updated_at
  before update on public.ai_knowledge_sources
  for each row execute function public.set_generic_updated_at();

-- 9. Explicit Grants & Row Level Security
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.document_types to service_role;
grant all on table public.document_requirements to service_role;
grant all on table public.faqs to service_role;
grant all on table public.ai_knowledge_sources to service_role;
grant all on table public.admin_audit_logs to service_role;

grant select on table public.document_types to authenticated;
grant select on table public.document_requirements to authenticated;
grant select on table public.faqs to authenticated;

alter table public.document_types enable row level security;
alter table public.document_requirements enable row level security;
alter table public.faqs enable row level security;
alter table public.ai_knowledge_sources enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Authenticated users can read active document types, active requirements, and published FAQs.
-- All write operations and Admin audit/knowledge access are strictly mediated via service_role
-- inside Admin-authenticated Node.js API endpoints.
drop policy if exists "document_types_select_active" on public.document_types;
create policy "document_types_select_active"
  on public.document_types for select to authenticated
  using (is_active = true or public.is_active_admin());

drop policy if exists "document_requirements_select_active" on public.document_requirements;
create policy "document_requirements_select_active"
  on public.document_requirements for select to authenticated
  using (is_active = true or public.is_active_admin());

drop policy if exists "faqs_select_published" on public.faqs;
create policy "faqs_select_published"
  on public.faqs for select to authenticated
  using (is_published = true or public.is_active_admin());

-- 10. Idempotent Seed of Existing Proposal-Scoped Document Types
insert into public.document_types (
  code, name, short_label, category, short_description, full_description,
  instructions, processing_info, requires_additional_notes, additional_notes_label, is_active
)
values
  (
    'tor',
    'Transcript of Records',
    'TOR',
    'Academic Record',
    'Official academic record summarizing completed courses, earned credits, and grades across terms.',
    'The Transcript of Records (TOR) is an official institutional record of your completed coursework, academic units, and grades. It is typically requested for employment, transfer, board examinations, or graduate studies.',
    'Review preparation reminders, submit your request for a reference number, and present valid identification upon claiming.',
    'Official fees, clearance requirements, and processing schedules must be confirmed with the DNSC Registrar''s Office.',
    false,
    'Additional Details (Optional)',
    true
  ),
  (
    'coe',
    'Certificate of Enrollment',
    'COE',
    'Enrollment Certification',
    'Formal verification confirming a student''s current or prior enrollment status for a given term.',
    'The Certificate of Enrollment (COE) formally verifies your enrollment status for a specific academic term. It is commonly requested for scholarships, financial assistance, or institutional verification.',
    'State your academic term and purpose clearly, then wait for Registrar Staff updates before visiting the office.',
    'Final eligibility, applicable fees, and release schedules must be confirmed by the DNSC Registrar''s Office.',
    false,
    'Academic Term / Additional Details (Optional)',
    true
  ),
  (
    'diploma',
    'Diploma & Graduation Documents',
    'Diploma / Graduation',
    'Graduation Credential',
    'Documents confirming degree completion, graduation credentials, and related certifications.',
    'Covers requests related to degree completion credentials, graduation certifications, or duplicate/certified copies subject to DNSC Registrar''s Office policies.',
    'Specify the graduation document needed and wait for Registrar Staff eligibility verification.',
    'Availability, clearance prerequisites, and issuance rules depend on official DNSC Registrar''s Office guidelines.',
    false,
    'Document Details / Year Graduated (Optional)',
    true
  ),
  (
    'other',
    'Other Registrar''s Office Documents',
    'Other Certification',
    'General Registrar Record',
    'Additional certifications and academic records issued through the Registrar''s Office.',
    'Use this option for other Registrar''s Office certifications or academic records not listed separately above. Describe the specific document so Registrar Staff can review availability and requirements.',
    'Clearly specify the exact document name in the details field before submitting.',
    'Availability, required clearances, and applicable fees will be confirmed by the DNSC Registrar''s Office.',
    true,
    'Specific Document Name & Details',
    true
  )
on conflict (code) do nothing;
