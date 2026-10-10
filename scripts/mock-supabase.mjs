#!/usr/bin/env node
/**
 * Mock Supabase backend (GoTrue auth + PostgREST REST + RPC subset)
 * -----------------------------------------------------------------
 * The sandbox has no Docker/Postgres, so this Node-only server stands in for
 * the local Supabase stack during UI/viewport audits. It serves the exact
 * seed dataset from supabase/seed.sql (12 accounts, password "Passw0rd!"),
 * implements the PostgREST features the app actually uses (select embeds with
 * FK hints and column shorthands, eq/neq/in/is/ilike/like filters, or=(),
 * order, limit, range, count=exact, maybeSingle/single, insert/update/upsert/
 * delete, volunteer_total_hours RPC) and the GoTrue endpoints supabase-js
 * calls (password + refresh token grants, user, signup, logout).
 *
 * No RLS / triggers — it is for rendering and flow testing, not security QA.
 */
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 54321);
const PASSWORD = "Passw0rd!";
const DAY = 86_400_000;
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 3_600_000).toISOString();
const inDays = (d) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
const backDays = (d) => new Date(Date.now() - d * DAY).toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();

// ---------- seeded ids ----------
const ADMIN = "a0000000-0000-4000-8000-000000000001";
const GREEN = "a0000000-0000-4000-8000-000000000002";
const BRIGHT = "a0000000-0000-4000-8000-000000000003";
const NEWHOPE = "a0000000-0000-4000-8000-000000000004";
const MEERA = "a0000000-0000-4000-8000-000000000005";
const ARVIND = "a0000000-0000-4000-8000-000000000006";
const PRIYA = "a0000000-0000-4000-8000-000000000007";
const RAHUL = "a0000000-0000-4000-8000-000000000008";
const AISHA = "a0000000-0000-4000-8000-000000000009";
const VIKRAM = "a0000000-0000-4000-8000-00000000000a";
const SNEHA = "a0000000-0000-4000-8000-00000000000b";
const TARUN = "a0000000-0000-4000-8000-00000000000c";
const C1 = "c0000000-0000-4000-8000-000000000001";
const C2 = "c0000000-0000-4000-8000-000000000002";
const C3 = "c0000000-0000-4000-8000-000000000003";
const C4 = "c0000000-0000-4000-8000-000000000004";
const A1 = "d0000000-0000-4000-8000-000000000001";
const A2 = "d0000000-0000-4000-8000-000000000002";
const A3 = "d0000000-0000-4000-8000-000000000003";
const A4 = "d0000000-0000-4000-8000-000000000004";
const A5 = "d0000000-0000-4000-8000-000000000005";
const A6 = "d0000000-0000-4000-8000-000000000006";
const A7 = "d0000000-0000-4000-8000-000000000007";
const A8 = "d0000000-0000-4000-8000-000000000008";
const A9 = "d0000000-0000-4000-8000-000000000009";
const I1 = "e0000000-0000-4000-8000-000000000001";
const I2 = "e0000000-0000-4000-8000-000000000002";
const T1 = "f0000000-0000-4000-8000-000000000001";
const T2 = "f0000000-0000-4000-8000-000000000002";
const T3 = "f0000000-0000-4000-8000-000000000003";
const R1 = "11000000-0000-4000-8000-000000000001";
const R2 = "11000000-0000-4000-8000-000000000002";
const R3 = "11000000-0000-4000-8000-000000000003";
const REP1 = "12000000-0000-4000-8000-000000000001";

// ---------- FK registry: {name, table, column, refTable, refColumn} ----------
const FKS = [
  { name: "ngos_profile_id_fkey", table: "ngos", column: "profile_id", refTable: "profiles", refColumn: "id" },
  { name: "volunteers_profile_id_fkey", table: "volunteers", column: "profile_id", refTable: "profiles", refColumn: "id" },
  { name: "ngo_staff_ngo_id_fkey", table: "ngo_staff", column: "ngo_id", refTable: "ngos", refColumn: "profile_id" },
  { name: "ngo_staff_profile_id_fkey", table: "ngo_staff", column: "profile_id", refTable: "profiles", refColumn: "id" },
  { name: "campaigns_ngo_id_fkey", table: "campaigns", column: "ngo_id", refTable: "ngos", refColumn: "profile_id" },
  { name: "volunteer_reports_volunteer_id_fkey", table: "volunteer_reports", column: "volunteer_id", refTable: "profiles", refColumn: "id" },
  { name: "volunteer_reports_reported_by_fkey", table: "volunteer_reports", column: "reported_by", refTable: "profiles", refColumn: "id" },
  { name: "volunteer_reports_campaign_id_fkey", table: "volunteer_reports", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "teams_campaign_id_fkey", table: "teams", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "team_members_team_id_fkey", table: "team_members", column: "team_id", refTable: "teams", refColumn: "id" },
  { name: "team_members_user_id_fkey", table: "team_members", column: "user_id", refTable: "profiles", refColumn: "id" },
  { name: "applications_volunteer_id_fkey", table: "applications", column: "volunteer_id", refTable: "profiles", refColumn: "id" },
  { name: "applications_campaign_id_fkey", table: "applications", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "campaign_invites_campaign_id_fkey", table: "campaign_invites", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "campaign_invites_volunteer_id_fkey", table: "campaign_invites", column: "volunteer_id", refTable: "profiles", refColumn: "id" },
  { name: "campaign_invites_invited_by_fkey", table: "campaign_invites", column: "invited_by", refTable: "profiles", refColumn: "id" },
  { name: "fund_allocations_campaign_id_fkey", table: "fund_allocations", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "fund_allocations_member_id_fkey", table: "fund_allocations", column: "member_id", refTable: "profiles", refColumn: "id" },
  { name: "chat_rooms_campaign_id_fkey", table: "chat_rooms", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "chat_rooms_created_by_fkey", table: "chat_rooms", column: "created_by", refTable: "profiles", refColumn: "id" },
  { name: "chat_room_members_room_id_fkey", table: "chat_room_members", column: "room_id", refTable: "chat_rooms", refColumn: "id" },
  { name: "chat_room_members_user_id_fkey", table: "chat_room_members", column: "user_id", refTable: "profiles", refColumn: "id" },
  { name: "messages_room_id_fkey", table: "messages", column: "room_id", refTable: "chat_rooms", refColumn: "id" },
  { name: "messages_sender_id_fkey", table: "messages", column: "sender_id", refTable: "profiles", refColumn: "id" },
  { name: "notifications_user_id_fkey", table: "notifications", column: "user_id", refTable: "profiles", refColumn: "id" },
  { name: "ratings_campaign_id_fkey", table: "ratings", column: "campaign_id", refTable: "campaigns", refColumn: "id" },
  { name: "ratings_from_user_id_fkey", table: "ratings", column: "from_user_id", refTable: "profiles", refColumn: "id" },
  { name: "ratings_to_user_id_fkey", table: "ratings", column: "to_user_id", refTable: "profiles", refColumn: "id" },
];
const FK_BY_NAME = Object.fromEntries(FKS.map((f) => [f.name, f]));

// ---------- tables ----------
const db = {
  profiles: [
    { id: ADMIN, role: "admin", name: "Platform Admin", location: "Pune", avatar_url: "/demo/avatar-platform-admin.svg", suspended: false, created_at: ago(160) },
    { id: GREEN, role: "ngo", name: "Green Earth Foundation", location: "Pune", avatar_url: "/demo/avatar-green-earth-foundation.svg", suspended: false, created_at: ago(150) },
    { id: BRIGHT, role: "ngo", name: "Bright Futures Trust", location: "Mumbai", avatar_url: "/demo/avatar-bright-futures-trust.svg", suspended: false, created_at: ago(140) },
    { id: NEWHOPE, role: "ngo", name: "New Hope Collective", location: "Nashik", avatar_url: "/demo/avatar-new-hope-collective.svg", suspended: false, created_at: ago(5) },
    { id: MEERA, role: "staff", name: "Meera Deshpande", location: "Pune", avatar_url: "/demo/avatar-meera-deshpande.svg", suspended: false, created_at: ago(120) },
    { id: ARVIND, role: "staff", name: "Arvind Kulkarni", location: "Mumbai", avatar_url: "/demo/avatar-arvind-kulkarni.svg", suspended: false, created_at: ago(110) },
    { id: PRIYA, role: "volunteer", name: "Priya Sharma", location: "Pune", avatar_url: "/demo/avatar-priya-sharma.svg", suspended: false, created_at: ago(130) },
    { id: RAHUL, role: "volunteer", name: "Rahul Patil", location: "Pune", avatar_url: "/demo/avatar-rahul-patil.svg", suspended: false, created_at: ago(100) },
    { id: AISHA, role: "volunteer", name: "Aisha Khan", location: "Mumbai", avatar_url: "/demo/avatar-aisha-khan.svg", suspended: false, created_at: ago(40) },
    { id: VIKRAM, role: "volunteer", name: "Vikram Joshi", location: "Pune", avatar_url: "/demo/avatar-vikram-joshi.svg", suspended: false, created_at: ago(90) },
    { id: SNEHA, role: "volunteer", name: "Sneha Iyer", location: "Nashik", avatar_url: "/demo/avatar-sneha-iyer.svg", suspended: false, created_at: ago(80) },
    { id: TARUN, role: "volunteer", name: "Tarun Mehta", location: "Pune", avatar_url: "/demo/avatar-tarun-mehta.svg", suspended: true, created_at: ago(70) },
  ],
  ngos: [
    { profile_id: GREEN, org_name: "Green Earth Foundation", registration_number: "GE-2019-114", verification_status: "approved", logo_url: "/demo/logo-green-earth.svg", avg_rating: 4.33 },
    { profile_id: BRIGHT, org_name: "Bright Futures Trust", registration_number: "BF-2017-052", verification_status: "approved", logo_url: "/demo/logo-bright-futures.svg", avg_rating: 0 },
    { profile_id: NEWHOPE, org_name: "New Hope Collective", registration_number: "NH-2026-003", verification_status: "pending", logo_url: "/demo/logo-new-hope.svg", avg_rating: 0 },
  ],
  volunteers: [
    { profile_id: PRIYA, skills: ["Teaching", "First Aid", "Event Coordination"], interests: ["Education", "Environment"], availability: "Weekends", avg_rating: 5, verification_status: "approved" },
    { profile_id: RAHUL, skills: ["Photography", "Logistics"], interests: ["Environment", "Animals"], availability: "Evenings", avg_rating: 4, verification_status: "approved" },
    { profile_id: AISHA, skills: ["Writing", "Social Media"], interests: ["Education", "Health"], availability: "Weekends", avg_rating: 0, verification_status: "pending" },
    { profile_id: VIKRAM, skills: ["Driving", "Inventory Management"], interests: ["Community Kitchens"], availability: "Flexible", avg_rating: 3, verification_status: "pending" },
    { profile_id: SNEHA, skills: ["Graphic Design", "Poster Making"], interests: ["Arts", "Culture"], availability: "Weekends", avg_rating: 0, verification_status: "rejected" },
    { profile_id: TARUN, skills: ["General Volunteering"], interests: ["Any Cause"], availability: "Unspecified", avg_rating: 0, verification_status: "pending" },
  ],
  ngo_staff: [
    { id: "13000000-0000-4000-8000-000000000001", ngo_id: GREEN, profile_id: MEERA, invited_email: "meera@sanjivani.test", invited_name: "Meera Deshpande", status: "active", created_at: ago(120) },
    { id: "13000000-0000-4000-8000-000000000002", ngo_id: GREEN, profile_id: null, invited_email: "kavita@sanjivani.test", invited_name: "Kavita Rao", status: "invited", created_at: ago(3) },
    { id: "13000000-0000-4000-8000-000000000003", ngo_id: BRIGHT, profile_id: ARVIND, invited_email: "arvind@sanjivani.test", invited_name: "Arvind Kulkarni", status: "active", created_at: ago(110) },
    { id: "13000000-0000-4000-8000-000000000004", ngo_id: BRIGHT, profile_id: null, invited_email: "deepak@sanjivani.test", invited_name: "Deepak Naik", status: "invited", created_at: ago(2) },
  ],
  campaigns: [
    { id: C1, ngo_id: GREEN, title: "River Clean-Up Drive", description: "A community drive to remove plastic and solid waste from the Mula riverbank, followed by a segregation and awareness session with local schools.", objectives: "Clear 3 km of riverbank; segregate and weigh collected waste; run 2 awareness sessions with schools; document before/after conditions.", location: "Mula Riverbank, Pune", start_date: inDays(14), end_date: inDays(21), type: "public", status: "upcoming", total_budget: 20000, remaining_budget: 20000, image_url: "/demo/campaign-river.svg", created_at: ago(7) },
    { id: C2, ngo_id: BRIGHT, title: "After-School Tutoring Program", description: "Ongoing evening tutoring for 60 students from low-income families, covering maths, reading and computer basics, run in two batches.", objectives: "Reach 60 students weekly; maintain 80% attendance; train 4 new volunteer tutors; publish a monthly progress report for parents.", location: "Dharavi Community Centre, Mumbai", start_date: backDays(30), end_date: inDays(30), type: "public", status: "ongoing", total_budget: 50000, remaining_budget: 46500, image_url: "/demo/campaign-tutoring.svg", created_at: ago(45) },
    { id: C3, ngo_id: GREEN, title: "Tree Plantation Marathon", description: "A one-day marathon planting 1,000 native saplings along the city ring road with 40 volunteers, followed by a 3-month care rota.", objectives: "Plant 1,000 saplings; achieve 85% survival at 3 months; assign a care buddy to every 25 saplings.", location: "Ring Road Green Belt, Pune", start_date: backDays(90), end_date: backDays(20), type: "public", status: "completed", total_budget: 30000, remaining_budget: 30000, image_url: "/demo/campaign-trees.svg", created_at: ago(95) },
    { id: C4, ngo_id: BRIGHT, title: "Winter Shelter Support", description: "Invite-only campaign for trusted volunteers to run night shelters: bedding, hot meals and health checks for 80 homeless residents.", objectives: "Staff 2 shelters nightly for 6 weeks; serve 1 meal per guest per night; conduct weekly health checks.", location: "Byculla & Dadar Shelters, Mumbai", start_date: inDays(21), end_date: inDays(77), type: "invite", status: "upcoming", total_budget: 40000, remaining_budget: 40000, image_url: "/demo/campaign-health.svg", created_at: ago(4) },
  ],
  applications: [
    { id: A1, volunteer_id: PRIYA, campaign_id: C2, status: "accepted", created_at: ago(44) },
    { id: A2, volunteer_id: RAHUL, campaign_id: C2, status: "accepted", created_at: ago(43) },
    { id: A3, volunteer_id: PRIYA, campaign_id: C3, status: "accepted", created_at: ago(92) },
    { id: A4, volunteer_id: RAHUL, campaign_id: C3, status: "accepted", created_at: ago(92) },
    { id: A5, volunteer_id: VIKRAM, campaign_id: C3, status: "accepted", created_at: ago(91) },
    { id: A6, volunteer_id: AISHA, campaign_id: C2, status: "pending", created_at: ago(2) },
    { id: A7, volunteer_id: AISHA, campaign_id: C1, status: "pending", created_at: ago(1) },
    { id: A8, volunteer_id: VIKRAM, campaign_id: C1, status: "pending", created_at: ago(1) },
    { id: A9, volunteer_id: PRIYA, campaign_id: C4, status: "accepted", created_at: ago(3) },
  ],
  campaign_invites: [
    { id: I1, campaign_id: C4, volunteer_id: PRIYA, invited_by: BRIGHT, status: "accepted", created_at: ago(3) },
    { id: I2, campaign_id: C4, volunteer_id: AISHA, invited_by: BRIGHT, status: "pending", created_at: ago(2) },
  ],
  teams: [
    { id: T1, campaign_id: C2, name: "Educators" },
    { id: T2, campaign_id: C3, name: "Core Team" },
    { id: T3, campaign_id: C4, name: "Night Crew" },
  ],
  team_members: [
    { id: uuid(), team_id: T1, user_id: ARVIND, member_type: "staff", hours_logged: 0 },
    { id: uuid(), team_id: T1, user_id: PRIYA, member_type: "volunteer", hours_logged: 0 },
    { id: uuid(), team_id: T1, user_id: RAHUL, member_type: "volunteer", hours_logged: 0 },
    { id: uuid(), team_id: T2, user_id: MEERA, member_type: "staff", hours_logged: 24 },
    { id: uuid(), team_id: T2, user_id: PRIYA, member_type: "volunteer", hours_logged: 18 },
    { id: uuid(), team_id: T2, user_id: RAHUL, member_type: "volunteer", hours_logged: 15 },
    { id: uuid(), team_id: T2, user_id: VIKRAM, member_type: "volunteer", hours_logged: 9 },
    { id: uuid(), team_id: T3, user_id: ARVIND, member_type: "staff", hours_logged: 0 },
    { id: uuid(), team_id: T3, user_id: PRIYA, member_type: "volunteer", hours_logged: 0 },
  ],
  fund_allocations: [
    { id: uuid(), campaign_id: C2, member_id: ARVIND, amount: 1500, note: "Travel reimbursement for site visits", status: "paid", created_at: ago(20) },
    { id: uuid(), campaign_id: C2, member_id: PRIYA, amount: 2000, note: "Teaching materials for batch A", status: "pending", created_at: ago(5) },
  ],
  chat_rooms: [
    { id: R1, campaign_id: C2, name: "Planning Room", created_by: BRIGHT, created_at: ago(40) },
    { id: R2, campaign_id: C2, name: "Field Updates", created_by: BRIGHT, created_at: ago(12) },
    { id: R3, campaign_id: C3, name: "Crew Coordination", created_by: GREEN, created_at: ago(85) },
  ],
  chat_room_members: [
    { id: uuid(), room_id: R1, user_id: BRIGHT },
    { id: uuid(), room_id: R1, user_id: ARVIND },
    { id: uuid(), room_id: R1, user_id: PRIYA },
    { id: uuid(), room_id: R1, user_id: RAHUL },
    { id: uuid(), room_id: R2, user_id: BRIGHT },
    { id: uuid(), room_id: R2, user_id: ARVIND },
    { id: uuid(), room_id: R2, user_id: RAHUL },
    { id: uuid(), room_id: R3, user_id: GREEN },
    { id: uuid(), room_id: R3, user_id: MEERA },
    { id: uuid(), room_id: R3, user_id: PRIYA },
  ],
  messages: [
    { id: uuid(), room_id: R1, sender_id: BRIGHT, text: "Welcome everyone! Batch A starts Monday at 5 pm. Arvind, can you confirm the centre is unlocked?", created_at: ago(39) },
    { id: uuid(), room_id: R1, sender_id: ARVIND, text: "Confirmed. I will pick up the keys from the trust office by 4:30.", created_at: ago(39) },
    { id: uuid(), room_id: R1, sender_id: PRIYA, text: "I can bring the maths workbooks I prepared. 30 copies should be enough for Monday.", created_at: ago(38) },
    { id: uuid(), room_id: R1, sender_id: RAHUL, text: "I will handle attendance and click photos for the monthly report.", created_at: ago(38) },
    { id: uuid(), room_id: R1, sender_id: BRIGHT, text: "Perfect. Priya, your material budget has been recorded in the fund ledger.", created_at: ago(5) },
    { id: uuid(), room_id: R2, sender_id: ARVIND, text: "Reminder: field visit tomorrow. Please reach the centre by 4 pm.", created_at: ago(11) },
    { id: uuid(), room_id: R2, sender_id: RAHUL, text: "On my way with the projector. Traffic is heavy, may be 10 minutes late.", created_at: ago(11) },
    { id: uuid(), room_id: R3, sender_id: GREEN, text: "Crew leads - the sapling truck arrives at 6:30 am. Please collect your zone maps at the gate.", created_at: ago(84) },
    { id: uuid(), room_id: R3, sender_id: MEERA, text: "I will brief the buddy groups and hand out gloves and first-aid kits.", created_at: ago(84) },
    { id: uuid(), room_id: R3, sender_id: PRIYA, text: "Got it. My group takes the ring road east stretch.", created_at: ago(83) },
  ],
  ratings: [
    { id: uuid(), campaign_id: C3, from_user_id: GREEN, to_user_id: PRIYA, score: 5, comment: "Priya took charge of the care rota and kept every buddy group on track. Outstanding.", created_at: ago(18) },
    { id: uuid(), campaign_id: C3, from_user_id: GREEN, to_user_id: RAHUL, score: 4, comment: "Reliable volunteer, great photo documentation for our report.", created_at: ago(18) },
    { id: uuid(), campaign_id: C3, from_user_id: GREEN, to_user_id: VIKRAM, score: 3, comment: "Slow to respond on coordination day but fine in the field.", created_at: ago(18) },
    { id: uuid(), campaign_id: C3, from_user_id: PRIYA, to_user_id: GREEN, score: 5, comment: "Well-organized campaign. Materials and route maps were ready before time.", created_at: ago(17) },
    { id: uuid(), campaign_id: C3, from_user_id: RAHUL, to_user_id: GREEN, score: 4, comment: "Good coordination overall; transport could have been planned better.", created_at: ago(17) },
    { id: uuid(), campaign_id: C3, from_user_id: VIKRAM, to_user_id: GREEN, score: 4, comment: "Clear instructions and friendly team leads.", created_at: ago(17) },
  ],
  volunteer_reports: [
    { id: REP1, volunteer_id: VIKRAM, reported_by: GREEN, campaign_id: C3, reason: "Missed two of the four care-rota rounds without notice and was unreachable on the plantation weekend. Other volunteers had to cover the assigned sapling zone.", status: "open", created_at: ago(10) },
  ],
  notifications: [
    { id: uuid(), user_id: GREEN, type: "ngo_verification", message: 'Your NGO "Green Earth Foundation" was approved.', read: true, created_at: ago(147) },
    { id: uuid(), user_id: GREEN, type: "system", message: "Welcome to Sanjivani! Create your first campaign to get started.", read: true, created_at: ago(147) },
    { id: uuid(), user_id: BRIGHT, type: "ngo_verification", message: 'Your NGO "Bright Futures Trust" was approved.', read: true, created_at: ago(137) },
    { id: uuid(), user_id: PRIYA, type: "volunteer_verification", message: "Your volunteer verification was approved.", read: true, created_at: ago(60) },
    { id: uuid(), user_id: PRIYA, type: "system", message: "Welcome to Sanjivani! Browse campaigns to find one you like.", read: true, created_at: ago(130) },
    { id: uuid(), user_id: RAHUL, type: "volunteer_verification", message: "Your volunteer verification was approved.", read: true, created_at: ago(55) },
  ],
};

// auth users: id -> {email, password}
const users = new Map(
  [
    [ADMIN, "admin@sanjivani.test"],
    [GREEN, "greenearth@sanjivani.test"],
    [BRIGHT, "brightfutures@sanjivani.test"],
    [NEWHOPE, "newhope@sanjivani.test"],
    [MEERA, "meera@sanjivani.test"],
    [ARVIND, "arvind@sanjivani.test"],
    [PRIYA, "priya@sanjivani.test"],
    [RAHUL, "rahul@sanjivani.test"],
    [AISHA, "aisha@sanjivani.test"],
    [VIKRAM, "vikram@sanjivani.test"],
    [SNEHA, "sneha@sanjivani.test"],
    [TARUN, "tarun@sanjivani.test"],
  ].map(([id, email]) => [id, { id, email, password: PASSWORD, created_at: ago(160), last_sign_in_at: ago(1) }])
);
const emailToId = new Map([...users.values()].map((u) => [u.email, u.id]));

// access token -> userId; refresh token -> userId
const accessTokens = new Map();
const refreshTokens = new Map();

// ---------- JWT (HS256, unsigned-trust — clients never verify the sig) ----------
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
function mintAccessToken(userId) {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: userId,
    email: users.get(userId)?.email,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
  const sig = crypto.createHmac("sha256", "mock-supabase").update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}
function issueSession(userId) {
  const access = mintAccessToken(userId);
  const refresh = crypto.randomBytes(24).toString("hex");
  accessTokens.set(access, userId);
  refreshTokens.set(refresh, userId);
  return { access, refresh };
}
function userFromToken(token) {
  if (!token) return null;
  return accessTokens.get(token) ?? null;
}
function gotrueUser(id) {
  const u = users.get(id);
  const profile = db.profiles.find((p) => p.id === id);
  if (!u) return null;
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.created_at,
    phone: "",
    confirmed_at: u.created_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: profile?.name ?? "", full_name: profile?.name ?? "" },
    identities: [
      {
        id: u.id,
        user_id: u.id,
        identity_data: { sub: u.id, email: u.email, email_verified: true },
        provider: "email",
        provider_id: u.id,
        last_sign_in_at: u.created_at,
        created_at: u.created_at,
        updated_at: u.created_at,
      },
    ],
    created_at: u.created_at,
    updated_at: new Date().toISOString(),
  };
}

// ---------- PostgREST select parsing ----------
function splitTop(spec) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of spec) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Parse `a,b:table!hint(c,d:inner(...))` → {cols, embeds} */
function parseSelectSpec(spec) {
  const cols = [];
  const embeds = [];
  for (const part of splitTop(spec)) {
    const m = part.match(/^(?:([\w]+)\s*:\s*)?([\w]+)(?:!([\w!]+))?(?:\((.*)\))?$/s);
    if (!m) {
      cols.push(part);
      continue;
    }
    const [, alias, target, hint, inner] = m;
    if (inner === undefined && hint === undefined && alias === undefined) {
      // plain token: a column (or whole-table embed — PostgREST needs parens for embeds)
      cols.push(target);
      continue;
    }
    const hints = (hint ?? "").split("!").filter(Boolean);
    const fkHint = hints.find((h) => h !== "inner" && h !== "left") ?? null;
    embeds.push({
      alias: alias ?? target,
      target,
      hint: fkHint,
      inner: hints.includes("inner"),
      spec: inner ?? "*",
    });
  }
  return { cols, embeds };
}

/** Resolve how `table` embeds from `fromTable` (m2o or o2m). */
function resolveEmbed(fromTable, e) {
  // FK-column shorthand: volunteer:volunteer_id(...)
  const fromCols = Object.keys(db[fromTable]?.[0] ?? {});
  if (!db[e.target] && fromCols.includes(e.target)) {
    const fk = FKS.find((f) => f.table === fromTable && f.column === e.target);
    if (fk) return { kind: "m2o", col: fk.column, refCol: fk.refColumn, table: fk.refTable };
    return null;
  }
  if (!db[e.target]) return null;
  if (e.hint && FK_BY_NAME[e.hint]) {
    const fk = FK_BY_NAME[e.hint];
    if (fk.table === fromTable) return { kind: "m2o", col: fk.column, refCol: fk.refColumn, table: e.target };
    if (fk.table === e.target && fk.refTable === fromTable)
      return { kind: "o2m", col: fk.column, refCol: fk.refColumn, table: e.target };
  }
  // no hint: FK on target pointing back (one-to-many)
  const back = FKS.find((f) => f.table === e.target && f.refTable === fromTable);
  if (back) return { kind: "o2m", col: back.column, refCol: back.refColumn, table: e.target };
  // or FK on fromTable pointing forward (many-to-one)
  const fwd = FKS.find((f) => f.table === fromTable && f.refTable === e.target);
  if (fwd) return { kind: "m2o", col: fwd.column, refCol: fwd.refColumn, table: e.target };
  return null;
}

function project(row, fromTable, spec) {
  const { cols, embeds } = parseSelectSpec(spec);
  const out = {};
  if (cols.includes("*")) {
    Object.assign(out, row);
  } else {
    for (const c of cols) if (c in row) out[c] = row[c];
  }
  for (const e of embeds) {
    const rel = resolveEmbed(fromTable, e);
    if (!rel) {
      out[e.alias] = null;
      continue;
    }
    if (rel.kind === "m2o") {
      const key = row[rel.col];
      if (key == null) out[e.alias] = null;
      else {
        const target = db[rel.table].find((t) => t[rel.refCol] === key) ?? null;
        out[e.alias] = target ? project(target, rel.table, e.spec) : null;
      }
    } else {
      const targets = db[rel.table].filter((t) => t[rel.col] === row[rel.refCol]);
      out[e.alias] = targets.map((t) => project(t, rel.table, e.spec));
    }
  }
  return out;
}

// ---------- filters ----------
const RESERVED = new Set(["select", "order", "limit", "offset", "count", "on_conflict", "columns", "apikey", "and", "or"]);
function literal(v) {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  return v !== "" && !Number.isNaN(n) && /^-?[\d.eE+]+$/.test(v) ? n : v;
}
function likeToRegex(pattern) {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, (ch) => (ch === "*" ? ".*" : ch === "." ? "\\." : "\\" + ch));
  return new RegExp(`^${esc}$`, "i");
}
function cmp(rowVal, op, raw) {
  const val = literal(raw);
  switch (op) {
    case "eq":
      if (rowVal == null) return val === null;
      if (typeof rowVal === "boolean") return rowVal === (val === true || val === "true");
      if (typeof rowVal === "number") return Number(val) === rowVal;
      return String(rowVal) === String(val);
    case "neq":
      return !cmp(rowVal, "eq", raw);
    case "in": {
      const list = raw.startsWith("(") ? raw.slice(1, -1) : raw;
      const items = splitTop(list).map((s) => literal(s.trim()));
      return items.some((v) => cmp(rowVal, "eq", typeof v === "string" ? v : String(v)));
    }
    case "is":
      if (raw === "null" || raw === "not.null") return raw === "null" ? rowVal == null : rowVal != null;
      return false;
    case "gt": case "gte": case "lt": case "lte": {
      const a = Number(rowVal), b = Number(val);
      if (Number.isNaN(a) || Number.isNaN(b)) {
        const sa = String(rowVal ?? ""), sb = String(val);
        return op === "gt" ? sa > sb : op === "gte" ? sa >= sb : op === "lt" ? sa < sb : sa <= sb;
      }
      return op === "gt" ? a > b : op === "gte" ? a >= b : op === "lt" ? a < b : a <= b;
    }
    case "like": case "ilike": {
      const re = likeToRegex(raw);
      return re.test(String(rowVal ?? ""));
    }
    default:
      return false;
  }
}
function applyFilters(rows, params) {
  let out = rows;
  const conds = [];
  const orCond = [];
  for (const [key, value] of params.entries()) {
    if (RESERVED.has(key)) continue;
    const v = String(value);
    if (key === "or" || key === "and") {
      const inner = v.startsWith("(") ? v.slice(1, -1) : v;
      // each condition: col.op.val — commas inside quotes not used by this app
      for (const part of splitTop(inner)) {
        const m = part.match(/^([\w.]+)\.(eq|neq|in|is|gt|gte|lt|lte|like|ilike)\.(.*)$/s);
        if (m) {
          const cond = { col: m[1], op: m[2], val: m[3] };
          (key === "or" ? orCond : conds).push(cond);
        }
      }
      continue;
    }
    const m = v.match(/^(eq|neq|in|is|gt|gte|lt|lte|like|ilike)\.(.*)$/s);
    if (!m) continue;
    conds.push({ col: key, op: m[1], val: m[2] });
  }
  out = out.filter((row) => conds.every((c) => cmp(row[c.col], c.op, c.val)));
  if (orCond.length) {
    out = out.filter((row) => orCond.some((c) => cmp(row[c.col], c.op, c.val)));
  }
  return out;
}
function applyOrder(rows, orderParam) {
  if (!orderParam) return rows;
  const specs = String(orderParam).split(",").map((s) => s.trim()).filter(Boolean);
  const keyed = [...rows];
  for (const spec of [...specs].reverse()) {
    const m = spec.match(/^([\w]+)\.(asc|desc)(?:\.(nullsfirst|nullslast))?$/);
    if (!m) continue;
    const [, col, dir, nulls] = m;
    keyed.sort((a, b) => {
      const av = a[col], bv = b[col];
      const aNull = av == null, bNull = bv == null;
      if (aNull && bNull) return 0;
      if (aNull) return nulls === "nullsfirst" ? -1 : 1; // default: nulls last for asc
      if (bNull) return nulls === "nullsfirst" ? 1 : -1;
      const an = Number(av), bn = Number(bv);
      const r =
        !Number.isNaN(an) && !Number.isNaN(bn) && typeof av !== "boolean"
          ? an - bn
          : String(av).localeCompare(String(bv));
      return dir === "desc" ? -r : r;
    });
  }
  return keyed;
}

// ---------- write ops ----------
const DEFAULTS = {
  profiles: { suspended: false, created_at: () => new Date().toISOString() },
  ngos: { verification_status: "pending", avg_rating: 0 },
  volunteers: { avg_rating: 0, verification_status: "pending" },
  ngo_staff: { status: "invited", created_at: () => new Date().toISOString() },
  campaigns: { type: "public", status: "upcoming", total_budget: 0, remaining_budget: 0, created_at: () => new Date().toISOString() },
  applications: { status: "pending", created_at: () => new Date().toISOString() },
  campaign_invites: { status: "pending", created_at: () => new Date().toISOString() },
  fund_allocations: { status: "pending", created_at: () => new Date().toISOString() },
  chat_rooms: { created_at: () => new Date().toISOString() },
  messages: { created_at: () => new Date().toISOString() },
  notifications: { read: false, created_at: () => new Date().toISOString() },
  ratings: { created_at: () => new Date().toISOString() },
  volunteer_reports: { status: "open", created_at: () => new Date().toISOString() },
  team_members: { hours_logged: 0 },
  teams: {},
  chat_room_members: {},
};
const PK = {
  profiles: "id", ngos: "profile_id", volunteers: "profile_id",
  ngo_staff: "id", campaigns: "id", applications: "id", campaign_invites: "id",
  teams: "id", team_members: "id", fund_allocations: "id", chat_rooms: "id",
  chat_room_members: "id", messages: "id", notifications: "id", ratings: "id",
  volunteer_reports: "id",
};
function applyDefaults(table, row) {
  const defs = DEFAULTS[table] ?? {};
  const out = { ...row };
  for (const [k, v] of Object.entries(defs)) if (out[k] === undefined) out[k] = typeof v === "function" ? v() : v;
  const pk = PK[table];
  if (pk && !out[pk]) out[pk] = uuid();
  return out;
}
function syncBudgets() {
  for (const c of db.campaigns) {
    const allocated = db.fund_allocations
      .filter((f) => f.campaign_id === c.id)
      .reduce((s, f) => s + Number(f.amount ?? 0), 0);
    c.remaining_budget = Number(c.total_budget ?? 0) - allocated;
  }
}

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (status, body, headers = {}) => {
    const h = { "Content-Type": "application/json", ...headers };
    res.writeHead(status, h);
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  // CORS (browser-side supabase client)
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] ?? "*");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const readBody = () =>
    new Promise((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    });

  try {
    const path = url.pathname;

    // ---------------- auth (GoTrue subset) ----------------
    if (path.startsWith("/auth/v1/")) {
      const body = req.method === "POST" ? await readBody() : {};
      if (path === "/auth/v1/token") {
        const grant = url.searchParams.get("grant_type");
        if (grant === "password") {
          const email = String(body.email ?? "").trim().toLowerCase();
          const userId = emailToId.get(email);
          if (!userId || body.password !== PASSWORD) {
            send(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
            return;
          }
          const { access, refresh } = issueSession(userId);
          send(200, {
            access_token: access,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: refresh,
            user: gotrueUser(userId),
          });
          return;
        }
        if (grant === "refresh_token") {
          const userId = refreshTokens.get(String(body.refresh_token ?? ""));
          if (!userId) {
            send(400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
            return;
          }
          const { access, refresh } = issueSession(userId);
          send(200, {
            access_token: access,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: refresh,
            user: gotrueUser(userId),
          });
          return;
        }
        send(400, { error: "unsupported_grant_type" });
        return;
      }
      if (path === "/auth/v1/user" && req.method === "GET") {
        const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        const userId = userFromToken(token);
        if (!userId) {
          send(401, { message: "invalid claim: missing sub claim", code: 401 });
          return;
        }
        send(200, gotrueUser(userId));
        return;
      }
      if (path === "/auth/v1/signup" && req.method === "POST") {
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        if (emailToId.has(email)) {
          send(400, { msg: "User already registered", code: 400 });
          return;
        }
        if (password.length < 6) {
          send(400, { msg: "Password should be at least 6 characters", code: 400 });
          return;
        }
        const id = uuid();
        users.set(id, { id, email, password, created_at: new Date().toISOString() });
        emailToId.set(email, id);
        const { access, refresh } = issueSession(id);
        send(200, {
          access_token: access,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: refresh,
          user: gotrueUser(id),
        });
        return;
      }
      if (path === "/auth/v1/logout") {
        const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        accessTokens.delete(token);
        send(204, undefined);
        return;
      }
      if (path === "/auth/v1/settings") {
        send(200, { external: { email: true }, disable_signup: false, mailer_autoconfirm: true, phone_autoconfirm: true });
        return;
      }
      send(404, { message: "Not found" });
      return;
    }

    // ---------------- storage (not needed — demo media is served by Next /public) ----------------
    if (path.startsWith("/storage/v1/")) {
      send(400, { error: "storage not implemented in mock" });
      return;
    }

    // ---------------- realtime (optional — client retries harmlessly) ----------------
    if (path.startsWith("/realtime/")) {
      send(404, { error: "realtime not implemented in mock" });
      return;
    }

    // ---------------- REST ----------------
    if (path.startsWith("/rest/v1/")) {
      const rest = path.slice("/rest/v1/".length);
      const prefer = String(req.headers.prefer ?? "");
      const accept = String(req.headers.accept ?? "");

      // RPC
      if (rest.startsWith("rpc/")) {
        const fn = rest.slice(4);
        const body = await readBody();
        if (fn === "volunteer_total_hours") {
          const total = db.team_members
            .filter((t) => t.user_id === body.p_volunteer_id)
            .reduce((s, t) => s + Number(t.hours_logged ?? 0), 0);
          send(200, total);
          return;
        }
        send(404, { message: `function ${fn} not found` });
        return;
      }

      const table = rest;
      if (!db[table]) {
        send(404, { message: `relation "${table}" does not exist`, code: "42P01" });
        return;
      }

      const selectSpec = url.searchParams.get("select") ?? "*";
      const wantObject = accept.includes("vnd.pgrst.object");

      // ---- filtering (GET/PATCH/DELETE share it) ----
      let rows = applyFilters(db[table], url.searchParams);
      const total = rows.length;

      // ---- INSERT ----
      if (req.method === "POST") {
        const body = await readBody();
        const list = Array.isArray(body) ? body : [body];
        const onConflict = url.searchParams.get("on_conflict");
        const ignoreDup = prefer.includes("resolution=ignore-duplicates");
        const inserted = [];
        for (const raw of list) {
          const row = applyDefaults(table, raw);
          if (onConflict) {
            const existing = db[table].find((r) => r[onConflict] === row[onConflict]);
            if (existing) {
              if (ignoreDup) continue;
              Object.assign(existing, row);
              inserted.push(existing);
              continue;
            }
          }
          db[table].push(row);
          inserted.push(row);
        }
        syncBudgets();
        if (prefer.includes("return=minimal")) {
          send(201, undefined);
          return;
        }
        send(201, wantObject ? project(inserted[0], table, selectSpec) : inserted.map((r) => project(r, table, selectSpec)));
        return;
      }

      // ---- UPDATE (PATCH) ----
      if (req.method === "PATCH") {
        const body = await readBody();
        const updated = [];
        for (const row of rows) {
          Object.assign(row, body);
          updated.push(row);
        }
        syncBudgets();
        if (prefer.includes("return=minimal")) {
          send(204, undefined);
          return;
        }
        send(200, wantObject ? project(updated[0] ?? {}, table, selectSpec) : updated.map((r) => project(r, table, selectSpec)));
        return;
      }

      // ---- DELETE ----
      if (req.method === "DELETE") {
        const removed = rows;
        db[table] = db[table].filter((r) => !removed.includes(r));
        syncBudgets();
        if (prefer.includes("return=minimal") || !prefer.includes("return=representation")) {
          send(204, undefined);
          return;
        }
        send(200, removed.map((r) => project(r, table, selectSpec)));
        return;
      }

      // ---- GET / HEAD ----
      rows = applyOrder(rows, url.searchParams.get("order"));

      // Range header (supabase-js .range())
      let start = 0, end = rows.length - 1;
      const rangeHeader = req.headers.range;
      if (rangeHeader && String(rangeHeader).includes("=")) {
        const [unit, range] = String(rangeHeader).split("=");
        if (unit.trim() === "items") {
          const [s, e] = range.split("-").map((n) => Number(n));
          start = Number.isFinite(s) ? s : 0;
          end = Number.isFinite(e) ? e : rows.length - 1;
        }
      } else {
        const limit = Number(url.searchParams.get("limit") ?? NaN);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (Number.isFinite(limit) && limit >= 0) {
          start = offset;
          end = offset + limit - 1;
        } else if (offset > 0) {
          start = offset;
        }
      }
      const page = rows.slice(start, end + 1);
      const projected = page.map((r) => project(r, table, selectSpec));

      const contentRange = `${req.method === "HEAD" ? "*" : `${start}-${Math.min(end, total - 1)}`}/${total}`;
      if (wantObject) {
        if (projected.length === 0) {
          send(406, {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
            details: `Results contain 0 rows`,
            hint: null,
          });
          return;
        }
        send(200, projected[0], { "Content-Range": contentRange });
        return;
      }
      if (req.method === "HEAD") {
        res.writeHead(204, { "Content-Range": contentRange, "Content-Type": "application/json" });
        res.end();
        return;
      }
      send(200, projected, { "Content-Range": contentRange });
      return;
    }

    send(404, { message: `no route: ${path}` });
  } catch (err) {
    console.error("[mock-supabase] error:", req.method, req.url, err);
    send(500, { message: String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-supabase] listening on http://127.0.0.1:${PORT}`);
  console.log(`[mock-supabase] ${users.size} seeded accounts, password "${PASSWORD}"`);
});
