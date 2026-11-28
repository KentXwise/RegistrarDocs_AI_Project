-- =============================================================================
-- RegistrarDocs AI — Staff Onboarding & First-Login Password Change
-- Migration: 0006_staff_onboarding_and_password_change.sql
--
-- Fully idempotent & non-destructive.
-- Adds `must_change_password` (default false) to `public.profiles` so existing
-- accounts are unaffected, while newly provisioned Staff accounts are required
-- by both frontend and backend RBAC to change their temporary password on first
-- login before accessing Staff dashboards or APIs.
-- =============================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Extend anti-escalation trigger so non-service_role updates cannot clear
-- must_change_password directly.
create or replace function public.prevent_self_role_or_status_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.id is distinct from old.id
       or new.must_change_password is distinct from old.must_change_password then
      raise exception 'Modifying role, account status, or password-change policy is not permitted.';
    end if;
  end if;
  return new;
end;
$$;
