-- Sanjivani — demo seed (spec §14)
-- All demo accounts use the password: Passw0rd!
-- Run with: supabase db reset  (local)  or paste into the SQL editor (hosted)

begin;

-- ============ auth users ============
-- NOTE: GoTrue (the Supabase auth server) scans token/identity columns as
-- non-null strings — a seeded user with NULL confirmation_token /
-- recovery_token / email_change / email_change_token_new makes the row
-- UNLOADABLE ("converting NULL to string is unsupported"), which surfaces
-- as "Invalid login credentials" for every seeded account. Seed those
-- columns exactly the way GoTrue itself writes them. Do NOT set confirmed_at
-- on current GoTrue: it is a GENERATED column (derived from
-- email_confirmed_at / phone_confirmed_at) and inserting it is an error.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        confirmation_token, recovery_token,
                        email_change, email_change_token_new,
                        email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data,
                        last_sign_in_at, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@sanjivani.test',      crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000001', 'email', 'admin@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '160 days', now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'greenearth@sanjivani.test', crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000002', 'email', 'greenearth@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '150 days', now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'brightfutures@sanjivani.test', crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000003', 'email', 'brightfutures@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '140 days', now()),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'newhope@sanjivani.test',    crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000004', 'email', 'newhope@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '5 days', now()),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'meera@sanjivani.test',      crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000005', 'email', 'meera@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '120 days', now()),
  ('a0000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arvind@sanjivani.test',    crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000006', 'email', 'arvind@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '110 days', now()),
  ('a0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@sanjivani.test',     crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000007', 'email', 'priya@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '130 days', now()),
  ('a0000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul@sanjivani.test',     crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000008', 'email', 'rahul@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '100 days', now()),
  ('a0000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aisha@sanjivani.test',     crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000009', 'email', 'aisha@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '40 days', now()),
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vikram@sanjivani.test',    crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-00000000000a', 'email', 'vikram@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '90 days', now()),
  ('a0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sneha@sanjivani.test',     crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-00000000000b', 'email', 'sneha@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '80 days', now()),
  ('a0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tarun@sanjivani.test',     crypt('Passw0rd!', gen_salt('bf')), '', '', '', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('sub', 'a0000000-0000-4000-8000-00000000000c', 'email', 'tarun@sanjivani.test', 'email_verified', true, 'phone_verified', false), now(), now() - interval '70 days', now())
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select u.id, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', u.id::text, u.created_at, u.created_at, u.created_at
from auth.users u
where u.email like '%@sanjivani.test'
on conflict (id) do nothing;

-- ============ profiles ============
insert into public.profiles (id, role, name, location, avatar_url, suspended, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'admin',     'Platform Admin',  'Pune',       '/demo/avatar-platform-admin.svg',        false, now() - interval '160 days'),
  ('a0000000-0000-4000-8000-000000000002', 'ngo',       'Green Earth Foundation', 'Pune', '/demo/avatar-green-earth-foundation.svg', false, now() - interval '150 days'),
  ('a0000000-0000-4000-8000-000000000003', 'ngo',       'Bright Futures Trust', 'Mumbai', '/demo/avatar-bright-futures-trust.svg', false, now() - interval '140 days'),
  ('a0000000-0000-4000-8000-000000000004', 'ngo',       'New Hope Collective', 'Nashik',  '/demo/avatar-new-hope-collective.svg',  false, now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000005', 'staff',     'Meera Deshpande', 'Pune',      '/demo/avatar-meera-deshpande.svg',       false, now() - interval '120 days'),
  ('a0000000-0000-4000-8000-000000000006', 'staff',     'Arvind Kulkarni', 'Mumbai',    '/demo/avatar-arvind-kulkarni.svg',       false, now() - interval '110 days'),
  ('a0000000-0000-4000-8000-000000000007', 'volunteer', 'Priya Sharma',    'Pune',      '/demo/avatar-priya-sharma.svg',          false, now() - interval '130 days'),
  ('a0000000-0000-4000-8000-000000000008', 'volunteer', 'Rahul Patil',     'Pune',      '/demo/avatar-rahul-patil.svg',           false, now() - interval '100 days'),
  ('a0000000-0000-4000-8000-000000000009', 'volunteer', 'Aisha Khan',      'Mumbai',    '/demo/avatar-aisha-khan.svg',            false, now() - interval '40 days'),
  ('a0000000-0000-4000-8000-00000000000a', 'volunteer', 'Vikram Joshi',    'Pune',      '/demo/avatar-vikram-joshi.svg',          false, now() - interval '90 days'),
  ('a0000000-0000-4000-8000-00000000000b', 'volunteer', 'Sneha Iyer',      'Nashik',    '/demo/avatar-sneha-iyer.svg',            false, now() - interval '80 days'),
  ('a0000000-0000-4000-8000-00000000000c', 'volunteer', 'Tarun Mehta',     'Pune',      '/demo/avatar-tarun-mehta.svg',           true,  now() - interval '70 days')
on conflict (id) do nothing;

-- ============ ngos ============
-- (join dates come from profiles.created_at — the ngos table has no timestamp column)
insert into public.ngos (profile_id, org_name, registration_number, verification_status, logo_url) values
  ('a0000000-0000-4000-8000-000000000002', 'Green Earth Foundation', 'GE-2019-114', 'approved', '/demo/logo-green-earth.svg'),
  ('a0000000-0000-4000-8000-000000000003', 'Bright Futures Trust',  'BF-2017-052', 'approved', '/demo/logo-bright-futures.svg'),
  ('a0000000-0000-4000-8000-000000000004', 'New Hope Collective',   'NH-2026-003', 'pending',  '/demo/logo-new-hope.svg')
on conflict (profile_id) do nothing;

-- ============ volunteers ============
-- (verification dates come from profiles.created_at — the volunteers table has no timestamp column)
insert into public.volunteers (profile_id, skills, interests, availability, verification_status) values
  ('a0000000-0000-4000-8000-000000000007', array['Teaching','First Aid','Event Coordination'], array['Education','Environment'], 'Weekends',     'approved'),
  ('a0000000-0000-4000-8000-000000000008', array['Photography','Logistics'],                   array['Environment','Animals'],  'Evenings',     'approved'),
  ('a0000000-0000-4000-8000-000000000009', array['Writing','Social Media'],                    array['Education','Health'],     'Weekends',     'pending'),
  ('a0000000-0000-4000-8000-00000000000a', array['Driving','Inventory Management'],            array['Community Kitchens'],     'Flexible',     'pending'),
  ('a0000000-0000-4000-8000-00000000000b', array['Graphic Design','Poster Making'],            array['Arts','Culture'],         'Weekends',     'rejected'),
  ('a0000000-0000-4000-8000-00000000000c', array['General Volunteering'],                      array['Any Cause'],              'Unspecified',  'pending')
on conflict (profile_id) do nothing;

-- ============ ngo_staff ============
insert into public.ngo_staff (ngo_id, profile_id, invited_email, invited_name, status, created_at) values
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'meera@sanjivani.test',   'Meera Deshpande', 'active',  now() - interval '120 days'),
  ('a0000000-0000-4000-8000-000000000002', null, 'kavita@sanjivani.test',  'Kavita Rao',     'invited', now() - interval '3 days'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006', 'arvind@sanjivani.test',  'Arvind Kulkarni', 'active',  now() - interval '110 days'),
  ('a0000000-0000-4000-8000-000000000003', null, 'deepak@sanjivani.test',  'Deepak Naik',    'invited', now() - interval '2 days');

-- ============ campaigns ============
insert into public.campaigns (id, ngo_id, title, description, objectives, location, start_date, end_date, type, status, total_budget, image_url, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'River Clean-Up Drive',
   'A community drive to remove plastic and solid waste from the Mula riverbank, followed by a segregation and awareness session with local schools.',
   'Clear 3 km of riverbank; segregate and weigh collected waste; run 2 awareness sessions with schools; document before/after conditions.',
   'Mula Riverbank, Pune', current_date + 14, current_date + 21, 'public', 'upcoming', 20000, '/demo/campaign-river.svg', now() - interval '7 days'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   'After-School Tutoring Program',
   'Ongoing evening tutoring for 60 students from low-income families, covering maths, reading and computer basics, run in two batches.',
   'Reach 60 students weekly; maintain 80% attendance; train 4 new volunteer tutors; publish a monthly progress report for parents.',
   'Dharavi Community Centre, Mumbai', current_date - 30, current_date + 30, 'public', 'ongoing', 50000, '/demo/campaign-tutoring.svg', now() - interval '45 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002',
   'Tree Plantation Marathon',
   'A one-day marathon planting 1,000 native saplings along the city ring road with 40 volunteers, followed by a 3-month care rota.',
   'Plant 1,000 saplings; achieve 85% survival at 3 months; assign a care buddy to every 25 saplings.',
   'Ring Road Green Belt, Pune', current_date - 90, current_date - 20, 'public', 'completed', 30000, '/demo/campaign-trees.svg', now() - interval '95 days'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003',
   'Winter Shelter Support',
   'Invite-only campaign for trusted volunteers to run night shelters: bedding, hot meals and health checks for 80 homeless residents.',
   'Staff 2 shelters nightly for 6 weeks; serve 1 meal per guest per night; conduct weekly health checks.',
   'Byculla & Dadar Shelters, Mumbai', current_date + 21, current_date + 77, 'invite', 'upcoming', 40000, '/demo/campaign-health.svg', now() - interval '4 days')
on conflict (id) do nothing;

-- ============ applications ============
-- (accepted applications first so team_members validation passes)
insert into public.applications (id, volunteer_id, campaign_id, status, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'accepted', now() - interval '44 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000002', 'accepted', now() - interval '43 days'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003', 'accepted', now() - interval '92 days'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000003', 'accepted', now() - interval '92 days'),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000003', 'accepted', now() - interval '91 days'),
  -- pending applications for the NGO dashboard demo
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000002', 'pending', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'pending', now() - interval '1 days'),
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'pending', now() - interval '1 days');

-- ============ campaign_invites ============
insert into public.campaign_invites (id, campaign_id, volunteer_id, invited_by, status, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'accepted', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003', 'pending',  now() - interval '2 days');

-- accepted invite → accepted application (matches the invite-accept flow)
insert into public.applications (volunteer_id, campaign_id, status, created_at) values
  ('a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'accepted', now() - interval '3 days');

-- ============ teams ============
-- (the teams table has no timestamp column)
insert into public.teams (id, campaign_id, name) values
  ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'Educators'),
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003', 'Core Team'),
  ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004', 'Night Crew');

-- ============ team_members ============
insert into public.team_members (team_id, user_id, member_type, hours_logged) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', 'staff',     0),
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'volunteer', 0),
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008', 'volunteer', 0),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'staff',     24),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 'volunteer', 18),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008', 'volunteer', 15),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'volunteer', 9),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006', 'staff',     0),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'volunteer', 0);

-- ============ fund allocations (ongoing campaign) ============
insert into public.fund_allocations (campaign_id, member_id, amount, note, status, created_at) values
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 1500, 'Travel reimbursement for site visits', 'paid',    now() - interval '20 days'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 2000, 'Teaching materials for batch A',      'pending', now() - interval '5 days');

-- ============ chat rooms ============
insert into public.chat_rooms (id, campaign_id, name, created_by, created_at) values
  ('11000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'Planning Room', 'a0000000-0000-4000-8000-000000000003', now() - interval '40 days'),
  ('11000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Field Updates', 'a0000000-0000-4000-8000-000000000003', now() - interval '12 days'),
  ('11000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Crew Coordination', 'a0000000-0000-4000-8000-000000000002', now() - interval '85 days');

insert into public.chat_room_members (room_id, user_id) values
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008'),
  ('11000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003'),
  ('11000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006'),
  ('11000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007');

-- ============ messages ============
insert into public.messages (room_id, sender_id, text, created_at) values
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Welcome everyone! Batch A starts Monday at 5 pm. Arvind, can you confirm the centre is unlocked?', now() - interval '39 days'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', 'Confirmed. I will pick up the keys from the trust office by 4:30.', now() - interval '39 days'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'I can bring the maths workbooks I prepared. 30 copies should be enough for Monday.', now() - interval '38 days'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008', 'I will handle attendance and click photos for the monthly report.', now() - interval '38 days'),
  ('11000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Perfect. Priya, your material budget has been recorded in the fund ledger.', now() - interval '5 days'),
  ('11000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'Reminder: field visit tomorrow. Please reach the centre by 4 pm.', now() - interval '11 days'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Crew leads - the sapling truck arrives at 6:30 am. Please collect your zone maps at the gate.', now() - interval '84 days'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005', 'I will brief the buddy groups and hand out gloves and first-aid kits.', now() - interval '84 days'),
  ('11000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'Got it. My group takes the ring road east stretch.', now() - interval '83 days'),
  ('11000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008', 'On my way with the projector. Traffic is heavy, may be 10 minutes late.', now() - interval '11 days');

-- ============ ratings (completed campaign, bidirectional) ============
insert into public.ratings (campaign_id, from_user_id, to_user_id, score, comment, created_at) values
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 5, 'Priya took charge of the care rota and kept every buddy group on track. Outstanding.', now() - interval '18 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008', 4, 'Reliable volunteer, great photo documentation for our report.', now() - interval '18 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 3, 'Slow to respond on coordination day but fine in the field.', now() - interval '18 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 5, 'Well-organized campaign. Materials and route maps were ready before time.', now() - interval '17 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 4, 'Good coordination overall; transport could have been planned better.', now() - interval '17 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 4, 'Clear instructions and friendly team leads.', now() - interval '17 days');

-- ============ volunteer report (open, for the admin queue) ============
insert into public.volunteer_reports (volunteer_id, reported_by, campaign_id, reason, status, created_at) values
  ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003',
   'Missed two of the four care-rota rounds without notice and was unreachable on the plantation weekend. Other volunteers had to cover the assigned sapling zone.',
   'open', now() - interval '10 days');

-- ============ a few read notifications for demo history ============
insert into public.notifications (user_id, type, message, read, created_at) values
  ('a0000000-0000-4000-8000-000000000002', 'ngo_verification', 'Your NGO "Green Earth Foundation" was approved.', true, now() - interval '147 days'),
  ('a0000000-0000-4000-8000-000000000002', 'system',           'Welcome to Sanjivani! Create your first campaign to get started.', true, now() - interval '147 days'),
  ('a0000000-0000-4000-8000-000000000003', 'ngo_verification', 'Your NGO "Bright Futures Trust" was approved.', true, now() - interval '137 days'),
  ('a0000000-0000-4000-8000-000000000007', 'volunteer_verification', 'Your volunteer verification was approved.', true, now() - interval '60 days'),
  ('a0000000-0000-4000-8000-000000000007', 'system',           'Welcome to Sanjivani! Browse campaigns to find one you like.', true, now() - interval '130 days'),
  ('a0000000-0000-4000-8000-000000000008', 'volunteer_verification', 'Your volunteer verification was approved.', true, now() - interval '55 days');

commit;
