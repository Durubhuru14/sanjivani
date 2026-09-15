-- Sanjivani — initial schema (spec §7 / §17)
create extension if not exists pgcrypto;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('admin','ngo','volunteer','staff')) not null,
  name text,
  location text,
  avatar_url text,
  suspended boolean default false,
  created_at timestamptz default now()
);

-- ============ ngos ============
create table public.ngos (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  org_name text not null,
  registration_number text,
  verification_status text default 'pending' check (verification_status in ('pending','approved','rejected')),
  logo_url text,
  avg_rating numeric default 0
);

-- ============ volunteers ============
create table public.volunteers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  skills text[],
  interests text[],
  availability text,
  avg_rating numeric default 0,
  verification_status text default 'pending' check (verification_status in ('pending','approved','rejected'))
);

-- ============ ngo_staff ============
create table public.ngo_staff (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid references public.ngos(profile_id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  invited_email text not null,
  invited_name text,
  status text default 'invited' check (status in ('invited','active')),
  created_at timestamptz default now()
);
create unique index ngo_staff_active_email on public.ngo_staff (ngo_id, lower(invited_email)) where status = 'active';

-- ============ campaigns ============
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid references public.ngos(profile_id) on delete cascade,
  title text not null,
  description text,
  objectives text,
  location text,
  start_date date,
  end_date date,
  type text check (type in ('public','invite')) default 'public',
  status text default 'upcoming' check (status in ('upcoming','ongoing','completed','cancelled')),
  total_budget numeric default 0 check (total_budget >= 0),
  remaining_budget numeric default 0,
  image_url text,
  created_at timestamptz default now()
);
create index campaigns_browse on public.campaigns (status, type);

-- ============ volunteer_reports ============
create table public.volunteer_reports (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references public.profiles(id) on delete cascade,
  reported_by uuid references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz default now()
);

-- ============ teams ============
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  name text not null
);

-- ============ team_members ============
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  member_type text check (member_type in ('staff','volunteer')) not null,
  hours_logged numeric default 0 check (hours_logged >= 0)
);
create unique index team_members_unique on public.team_members (team_id, user_id);

-- ============ applications ============
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);
-- one pending/accepted application per volunteer per campaign (rejected may reapply)
create unique index applications_active_unique
  on public.applications (volunteer_id, campaign_id) where status in ('pending','accepted');

-- ============ campaign_invites ============
create table public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  volunteer_id uuid references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);
-- one pending invite per volunteer per campaign
create unique index campaign_invites_pending_unique
  on public.campaign_invites (campaign_id, volunteer_id) where status = 'pending';

-- ============ fund_allocations ============
create table public.fund_allocations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  status text default 'pending' check (status in ('pending','paid')),
  created_at timestamptz default now()
);

-- ============ chat_rooms ============
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ============ chat_room_members ============
create table public.chat_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.chat_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade
);
create unique index chat_room_members_unique on public.chat_room_members (room_id, user_id);

-- ============ messages ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.chat_rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz default now()
);
create index messages_room_time on public.messages (room_id, created_at);

-- ============ notifications ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);

-- ============ ratings ============
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id uuid references public.profiles(id) on delete cascade,
  score int check (score between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
-- one rating per rater/ratee/campaign
create unique index ratings_unique on public.ratings (campaign_id, from_user_id, to_user_id);
