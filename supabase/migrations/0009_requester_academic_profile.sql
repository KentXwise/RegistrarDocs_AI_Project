-- =============================================================================
-- RegistrarDocs AI — Migration 0009
-- Requester Academic Profile (Institute & Program) + Request Snapshot Columns
-- =============================================================================

-- 1. Add nullable Institute & Program columns to existing public.profiles table
--    (non-destructive; no duplicate profile tables created)
alter table public.profiles
  add column if not exists institute text,
  add column if not exists program text;

-- 2. Add nullable historical snapshot columns to public.document_requests so
--    submitted requests preserve the requester's Institute & Program at the
--    time of submission for Staff and Admin review
alter table public.document_requests
  add column if not exists requester_institute text,
  add column if not exists requester_program text;

-- 3. Helpful index for reporting/filtering by institute on profiles
create index if not exists idx_profiles_institute_program
  on public.profiles (institute, program)
  where role = 'requester';
