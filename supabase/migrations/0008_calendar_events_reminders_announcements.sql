-- =============================================================================
-- RegistrarDocs AI — Migration 0008
-- Academic Calendar, Office Scheduling, Reminders, and Public Announcements
-- =============================================================================

-- 1. Extend notifications category constraint non-destructively to support
--    calendar reminders and public announcements
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.notifications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%category%';

  if constraint_name is not null then
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_category_check
  check (
    category in (
      'status_update',
      'missing_requirements',
      'processing_update',
      'ready_for_release',
      'collection_instructions',
      'calendar_reminder',
      'public_announcement'
    )
  );

-- 2. Calendar Events table (Academic Calendar, Holidays, Office Events,
--    Reminders, Public Announcements, Collection/Release Notices)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null,
  description text not null default '',
  category text not null check (
    category in (
      'academic_calendar',
      'national_holiday',
      'local_holiday',
      'office_event',
      'office_deadline',
      'internal_reminder',
      'public_announcement',
      'collection_notice',
      'personal_reminder'
    )
  ),
  visibility text not null check (visibility in ('public', 'office', 'personal')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  start_date date not null,
  end_date date not null,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  location text,
  recurrence text not null default 'none' check (
    recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')
  ),
  expires_at timestamptz,
  action_url text,
  source_type text not null default 'manual' check (
    source_type in ('dnsc_academic_calendar', 'official_holiday', 'manual')
  ),
  source_label text,
  source_url text,
  verified_at date,
  is_active boolean not null default true,
  notify_requesters_in_app boolean not null default false,
  notify_requesters_email boolean not null default false,
  announcement_notified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_date_order check (end_date >= start_date)
);

create index if not exists idx_calendar_events_dates
  on public.calendar_events (start_date, end_date);

create index if not exists idx_calendar_events_visibility_active
  on public.calendar_events (visibility, is_active, start_date);

create index if not exists idx_calendar_events_created_by
  on public.calendar_events (created_by);

-- 3. Calendar Event Reminders table (per-user reminder triggers in Asia/Manila)
create table if not exists public.calendar_event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  offset_minutes integer,
  custom_remind_at timestamptz,
  trigger_at timestamptz not null,
  delivery_in_app boolean not null default true,
  delivery_email boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  triggered_at timestamptz,
  dismissed_at timestamptz,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint calendar_event_reminders_unique_trigger unique (event_id, user_id, trigger_at)
);

create index if not exists idx_calendar_reminders_due
  on public.calendar_event_reminders (status, trigger_at)
  where status = 'pending';

create index if not exists idx_calendar_reminders_user
  on public.calendar_event_reminders (user_id, trigger_at);

-- 4. Updated_at trigger for calendar_events
create or replace function public.touch_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.touch_calendar_events_updated_at();

-- 5. Grants
grant select, insert, update, delete on table public.calendar_events to authenticated;
grant all on table public.calendar_events to service_role;
grant select, insert, update, delete on table public.calendar_event_reminders to authenticated;
grant all on table public.calendar_event_reminders to service_role;

-- 6. Helper function for active staff check in RLS
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
      and p.status = 'active'
  );
$$;

grant execute on function public.is_active_staff() to authenticated, service_role;

-- 7. Row Level Security (RLS)
alter table public.calendar_events enable row level security;
alter table public.calendar_event_reminders enable row level security;

-- Admin: full control over all calendar events
drop policy if exists "calendar_events_admin_all" on public.calendar_events;
create policy "calendar_events_admin_all"
  on public.calendar_events
  for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Requester: read active, non-expired public events only
drop policy if exists "calendar_events_requester_select" on public.calendar_events;
create policy "calendar_events_requester_select"
  on public.calendar_events
  for select
  to authenticated
  using (
    is_active = true
    and visibility = 'public'
    and (expires_at is null or expires_at > now())
  );

-- Staff: read active public & office events, plus own personal reminders
drop policy if exists "calendar_events_staff_select" on public.calendar_events;
create policy "calendar_events_staff_select"
  on public.calendar_events
  for select
  to authenticated
  using (
    public.is_active_staff()
    and is_active = true
    and (
      visibility in ('public', 'office')
      or (visibility = 'personal' and created_by = auth.uid())
    )
  );

-- Staff: create manual office or personal events/reminders only (not official/public)
drop policy if exists "calendar_events_staff_insert" on public.calendar_events;
create policy "calendar_events_staff_insert"
  on public.calendar_events
  for insert
  to authenticated
  with check (
    public.is_active_staff()
    and created_by = auth.uid()
    and source_type = 'manual'
    and visibility in ('office', 'personal')
    and category in (
      'office_event',
      'office_deadline',
      'internal_reminder',
      'personal_reminder'
    )
  );

-- Staff: update own manual office/personal events only
drop policy if exists "calendar_events_staff_update_own" on public.calendar_events;
create policy "calendar_events_staff_update_own"
  on public.calendar_events
  for update
  to authenticated
  using (
    public.is_active_staff()
    and created_by = auth.uid()
    and source_type = 'manual'
    and visibility in ('office', 'personal')
  )
  with check (
    public.is_active_staff()
    and created_by = auth.uid()
    and source_type = 'manual'
    and visibility in ('office', 'personal')
    and category in (
      'office_event',
      'office_deadline',
      'internal_reminder',
      'personal_reminder'
    )
  );

-- Staff: delete own manual office/personal events only
drop policy if exists "calendar_events_staff_delete_own" on public.calendar_events;
create policy "calendar_events_staff_delete_own"
  on public.calendar_events
  for delete
  to authenticated
  using (
    public.is_active_staff()
    and created_by = auth.uid()
    and source_type = 'manual'
    and visibility in ('office', 'personal')
  );

-- Reminders RLS: users manage their own reminders; admin can manage all
drop policy if exists "calendar_reminders_own_all" on public.calendar_event_reminders;
create policy "calendar_reminders_own_all"
  on public.calendar_event_reminders
  for all
  to authenticated
  using (user_id = auth.uid() or public.is_active_admin())
  with check (user_id = auth.uid() or public.is_active_admin());
