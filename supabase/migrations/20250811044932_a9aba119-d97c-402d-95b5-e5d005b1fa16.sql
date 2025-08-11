-- Fix trigger creation without IF NOT EXISTS
-- 1) Profiles table for user metadata and username-based login
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Recreate timestamp trigger safely
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- RLS: users can view and manage their own profile
create policy if not exists "Profiles are viewable by owner"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy if not exists "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

create policy if not exists "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- 2) Roles system
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy if not exists "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

-- Function to check role (usable from client)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Function to lookup email by username (for username-based login)
create or replace function public.get_email_by_username(_username text)
returns text
language sql
stable
security definer set search_path = public
as $$
  select email from public.profiles where username = _username limit 1;
$$;

-- Trigger to create profile and default role on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  -- Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
