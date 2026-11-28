-- =============================================================================
-- RegistrarDocs AI — Milestone 4 Architecture Alignment (Supabase PostgreSQL)
-- Migration: 0001_profiles_rbac_storage.sql
--
-- Creates:
--   1. public.profiles table linked 1:1 to auth.users(id)
--   2. Unique case-insensitive indexes for email, student_id, and employee_id
--   3. Strict CHECK constraints for roles and account statuses
--   4. Triggers to maintain updated_at and block self role/status escalation
--   5. Row Level Security (RLS) policies on public.profiles
--   6. Private Supabase Storage bucket `student-ids` with restricted RLS
-- =============================================================================

-- 1. Profiles table linked to Supabase Auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  student_id text,
  employee_id text,
  role text not null default 'requester'
    check (role in ('requester', 'staff', 'admin')),
  status text not null default 'pending_approval'
    check (
      status in (
        'pending_approval',
        'approved',
        'needs_correction',
        'rejected',
        'invitation_pending',
        'active',
        'inactive'
      )
    ),
  student_id_image_path text,
  student_id_image_mime text,
  student_id_image_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 2. Case-insensitive uniqueness & lookup indexes
create unique index if not exists idx_profiles_email_lower_unique
  on public.profiles (lower(email));

create unique index if not exists idx_profiles_student_id_lower_unique
  on public.profiles (lower(student_id))
  where student_id is not null;

create unique index if not exists idx_profiles_employee_id_lower_unique
  on public.profiles (lower(employee_id))
  where employee_id is not null;

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_status on public.profiles (status);

-- 3. Automatic updated_at timestamp trigger
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- 4. Prevent non-service-role updates from altering role, status, or id
create or replace function public.prevent_self_role_or_status_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.id is distinct from old.id then
      raise exception 'Modifying role or account status is not permitted.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_escalation on public.profiles;
create trigger trg_profiles_prevent_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_or_status_change();

-- 5. Helper function for RLS (avoids recursive policy queries)
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- 6. Enable Row Level Security & table grants on public.profiles
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.profiles enable row level security;

-- Authenticated users can read only their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Active admins can read all profiles (for future Admin approval / user management)
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_active_admin());

-- Note: INSERT, UPDATE (role/status), and DELETE are intentionally NOT granted
-- to anon/authenticated roles via RLS; they are executed strictly by trusted
-- Node.js server endpoints using the server-only Supabase service_role key.

-- 7. Private Supabase Storage bucket for Student ID images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-ids',
  'student-ids',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png'];

-- Only active admins (or server-side service_role) may view private Student ID uploads
drop policy if exists "student_ids_admin_read" on storage.objects;
create policy "student_ids_admin_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'student-ids'
    and public.is_active_admin()
  );
