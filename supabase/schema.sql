-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ytemurvflobeksxmidow/sql

-- ─── TABLES ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

create table public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table public.memberships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade not null,
  role text check (role in ('admin', 'member')) default 'member',
  created_at timestamptz default now(),
  unique(user_id, org_id)
);

create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null unique,
  plan text check (plan in ('personal', 'team', 'business')) not null,
  status text check (status in ('active', 'inactive', 'past_due', 'canceled')) default 'inactive',
  seats int not null default 1,
  minutes_limit int not null,
  stripe_subscription_id text,
  google_purchase_token text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table public.processings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  org_id uuid references public.organizations(id),
  duration_seconds int not null default 0,
  result_json jsonb,
  created_at timestamptz default now()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.processings enable row level security;

-- profiles
create policy "user reads own profile" on public.profiles for select using (auth.uid() = id);
create policy "user updates own profile" on public.profiles for update using (auth.uid() = id);

-- organizations (references memberships — must come after memberships table)
create policy "members read org" on public.organizations for select
  using (exists (
    select 1 from public.memberships m
    where m.org_id = public.organizations.id and m.user_id = auth.uid()
  ));
create policy "owner updates org" on public.organizations for update using (owner_id = auth.uid());

-- memberships
create policy "members read org memberships" on public.memberships for select
  using (exists (
    select 1 from public.memberships m2
    where m2.org_id = public.memberships.org_id and m2.user_id = auth.uid()
  ));
create policy "admin manages memberships" on public.memberships for all
  using (exists (
    select 1 from public.memberships m3
    where m3.org_id = public.memberships.org_id and m3.user_id = auth.uid() and m3.role = 'admin'
  ));

-- subscriptions (only service_role writes — no insert/update policy needed)
create policy "members read subscription" on public.subscriptions for select
  using (exists (
    select 1 from public.memberships m
    where m.org_id = public.subscriptions.org_id and m.user_id = auth.uid()
  ));

-- processings (only service_role inserts)
create policy "user reads own processings" on public.processings for select using (user_id = auth.uid());
create policy "org members read processings" on public.processings for select
  using (org_id is not null and exists (
    select 1 from public.memberships m
    where m.org_id = public.processings.org_id and m.user_id = auth.uid()
  ));

-- ─── TRIGGER: auto-create profile on signup ──────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── HELPER: minutes used this month ────────────────────────────────────────

create or replace function public.minutes_used_this_month(p_user_id uuid, p_org_id uuid)
returns int language sql security definer as $$
  select coalesce(sum(duration_seconds) / 60, 0)::int
  from public.processings
  where user_id = p_user_id
    and (p_org_id is null or org_id = p_org_id)
    and created_at >= date_trunc('month', now());
$$;
