-- Members, their earlier memberships, and their check-ins.
--
-- Access: this is a public portfolio demo holding only generated data, so
-- anyone may read it and nobody may write through the API. Row-level
-- security is on for every table with a single read-only policy each.
-- A real deployment would replace those policies with staff sign-in and
-- per-gym rules.

create table public.members (
  id text primary key,
  name text not null,
  date_of_birth date not null,

  membership_type text not null
    check (membership_type in ('monthly', 'annual', 'punch_pass', 'day_pass')),
  membership_start_date date not null,
  frozen_from date,
  frozen_to date,
  -- Date the member asked to cancel.
  cancelled_at date,
  -- Date access ends after cancelling; can be in the future.
  membership_end_date date,
  cancellation_reason text
    check (cancellation_reason in (
      'moved', 'cost', 'injury', 'too_busy', 'not_enough_new_routes',
      'too_crowded', 'other'
    )),

  -- Canadian dollars per billing period of the membership type.
  price numeric(8, 2) not null check (price >= 0),
  failed_payment_count integer not null default 0
    check (failed_payment_count >= 0),

  acquisition_source text
    check (acquisition_source in (
      'friend_referral', 'walk_in', 'social_media', 'web_search', 'event'
    )),
  day_pass_visits_before_joining integer not null default 0
    check (day_pass_visits_before_joining >= 0),

  took_intro_class boolean not null default false,
  had_orientation boolean not null default true,
  belay_test_passed_on date,

  owns_shoes boolean not null default false,
  owns_harness boolean not null default false,

  -- Self-reported at sign-up; null when not given.
  experience_level text
    check (experience_level in (
      'first_timer', 'under_1_year', '1_to_3_years', 'over_3_years'
    )),
  preferred_discipline text
    check (preferred_discipline in ('boulder', 'top_rope', 'lead')),
  -- Bouldering V grades (V0 to V10) or rope grades (5.6 to 5.13).
  max_grade text,
  project_grade text,
  height_cm smallint check (height_cm between 100 and 250),
  gender text check (gender in ('woman', 'man', 'non_binary')),
  main_goal text
    check (main_goal in ('fitness', 'social', 'training', 'competition')),
  -- First three characters of the home postal code, such as 'M5V'.
  postal_area text check (postal_area ~ '^[A-Z][0-9][A-Z]$'),

  constraint freeze_has_both_dates
    check ((frozen_from is null) = (frozen_to is null)),
  constraint freeze_ends_after_it_starts check (frozen_to >= frozen_from),
  constraint cancellation_after_joining
    check (cancelled_at >= membership_start_date),
  constraint access_ends_after_cancelling
    check (membership_end_date >= cancelled_at)
);

create table public.previous_memberships (
  id bigint generated always as identity primary key,
  member_id text not null references public.members (id) on delete cascade,
  membership_type text not null
    check (membership_type in ('monthly', 'annual', 'punch_pass', 'day_pass')),
  start_date date not null,
  end_date date not null,
  constraint ends_after_it_starts check (end_date > start_date)
);

create index previous_memberships_member_id_idx
  on public.previous_memberships (member_id);

create table public.check_ins (
  id text primary key,
  member_id text not null references public.members (id) on delete cascade,
  checked_in_at timestamptz not null
);

-- Supports "latest visit per member" and "visits in a date range".
create index check_ins_member_id_checked_in_at_idx
  on public.check_ins (member_id, checked_in_at);
create index check_ins_checked_in_at_idx
  on public.check_ins (checked_in_at);

alter table public.members enable row level security;
alter table public.previous_memberships enable row level security;
alter table public.check_ins enable row level security;

create policy "Anyone can read members"
  on public.members for select
  to anon, authenticated
  using (true);

create policy "Anyone can read previous memberships"
  on public.previous_memberships for select
  to anon, authenticated
  using (true);

create policy "Anyone can read check-ins"
  on public.check_ins for select
  to anon, authenticated
  using (true);
