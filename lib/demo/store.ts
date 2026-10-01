/**
 * Demo mode — the in-memory seeded store (SERVER ONLY).
 *
 * Mirrors supabase/seed.sql: 12 accounts (password `Passw0rd!`), 3 NGOs,
 * 4 campaigns, teams, chat, funds, ratings, reports and notifications.
 * Kept on globalThis so Next.js dev hot-reloads don't wipe the state.
 */
import { randomUUID } from "node:crypto";

export type Row = Record<string, unknown>;

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

export interface DemoStore {
  users: DemoUser[];
  tables: Record<string, Row[]>;
  seq: number;
}

const DAY = 86_400_000;
const uuid = () => randomUUID();

export const DEMO_PASSWORD = "Passw0rd!";

export function uid(n: number): string {
  return `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function iso(daysAgo: number, hour = 10, minute = 0): string {
  const t = new Date();
  t.setUTCHours(hour, minute, 0, 0);
  return new Date(t.getTime() - daysAgo * DAY).toISOString();
}

function dateIn(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * DAY);
  return d.toISOString().slice(0, 10);
}

function seed(): DemoStore {
  const u = {
    admin: uid(1),
    greenearth: uid(2),
    brightfutures: uid(3),
    newhope: uid(4),
    meera: uid(5),
    arvind: uid(6),
    priya: uid(7),
    rahul: uid(8),
    aisha: uid(9),
    vikram: uid(10),
    sneha: uid(11),
    tarun: uid(12),
  };
  const c = {
    river: "c0000000-0000-4000-8000-000000000001",
    tutoring: "c0000000-0000-4000-8000-000000000002",
    plantation: "c0000000-0000-4000-8000-000000000003",
    shelter: "c0000000-0000-4000-8000-000000000004",
  };
  const t = {
    educators: "f0000000-0000-4000-8000-000000000001",
    core: "f0000000-0000-4000-8000-000000000002",
    night: "f0000000-0000-4000-8000-000000000003",
  };
  const r = {
    planning: "11000000-0000-4000-8000-000000000001",
    field: "11000000-0000-4000-8000-000000000002",
  };

  const users: DemoUser[] = [
    { id: u.admin, email: "admin@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(160) },
    { id: u.greenearth, email: "greenearth@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(150) },
    { id: u.brightfutures, email: "brightfutures@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(140) },
    { id: u.newhope, email: "newhope@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(5) },
    { id: u.meera, email: "meera@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(120) },
    { id: u.arvind, email: "arvind@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(110) },
    { id: u.priya, email: "priya@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(130) },
    { id: u.rahul, email: "rahul@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(100) },
    { id: u.aisha, email: "aisha@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(40) },
    { id: u.vikram, email: "vikram@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(90) },
    { id: u.sneha, email: "sneha@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(80) },
    { id: u.tarun, email: "tarun@sanjivani.test", password: DEMO_PASSWORD, created_at: iso(70) },
  ];

  const tables: Record<string, Row[]> = {
    profiles: [
      { id: u.admin, role: "admin", name: "Platform Admin", location: "Pune", avatar_url: null, suspended: false, created_at: iso(160) },
      { id: u.greenearth, role: "ngo", name: "Green Earth Foundation", location: "Pune", avatar_url: null, suspended: false, created_at: iso(150) },
      { id: u.brightfutures, role: "ngo", name: "Bright Futures Trust", location: "Mumbai", avatar_url: null, suspended: false, created_at: iso(140) },
      { id: u.newhope, role: "ngo", name: "New Hope Collective", location: "Nashik", avatar_url: null, suspended: false, created_at: iso(5) },
      { id: u.meera, role: "staff", name: "Meera Deshpande", location: "Pune", avatar_url: null, suspended: false, created_at: iso(120) },
      { id: u.arvind, role: "staff", name: "Arvind Kulkarni", location: "Mumbai", avatar_url: null, suspended: false, created_at: iso(110) },
      { id: u.priya, role: "volunteer", name: "Priya Sharma", location: "Pune", avatar_url: null, suspended: false, created_at: iso(130) },
      { id: u.rahul, role: "volunteer", name: "Rahul Patil", location: "Pune", avatar_url: null, suspended: false, created_at: iso(100) },
      { id: u.aisha, role: "volunteer", name: "Aisha Khan", location: "Mumbai", avatar_url: null, suspended: false, created_at: iso(40) },
      { id: u.vikram, role: "volunteer", name: "Vikram Joshi", location: "Pune", avatar_url: null, suspended: false, created_at: iso(90) },
      { id: u.sneha, role: "volunteer", name: "Sneha Iyer", location: "Nashik", avatar_url: null, suspended: false, created_at: iso(80) },
      { id: u.tarun, role: "volunteer", name: "Tarun Mehta", location: "Pune", avatar_url: null, suspended: true, created_at: iso(70) },
    ],
    ngos: [
      { profile_id: u.greenearth, org_name: "Green Earth Foundation", registration_number: "GE-2019-114", verification_status: "approved", logo_url: null, avg_rating: 4.5, created_at: iso(148) },
      { profile_id: u.brightfutures, org_name: "Bright Futures Trust", registration_number: "BF-2017-052", verification_status: "approved", logo_url: null, avg_rating: 4.3, created_at: iso(138) },
      { profile_id: u.newhope, org_name: "New Hope Collective", registration_number: "NH-2026-003", verification_status: "pending", logo_url: null, avg_rating: 0, created_at: iso(5) },
    ],
    volunteers: [
      { profile_id: u.priya, skills: ["Teaching", "First Aid", "Event Coordination"], interests: ["Education", "Environment"], availability: "Weekends", verification_status: "approved", avg_rating: 5, created_at: iso(130) },
      { profile_id: u.rahul, skills: ["Photography", "Logistics"], interests: ["Environment", "Animals"], availability: "Evenings", verification_status: "approved", avg_rating: 4, created_at: iso(100) },
      { profile_id: u.aisha, skills: ["Writing", "Social Media"], interests: ["Education", "Health"], availability: "Weekends", verification_status: "pending", avg_rating: 0, created_at: iso(40) },
      { profile_id: u.vikram, skills: ["Driving", "Inventory Management"], interests: ["Community Kitchens"], availability: "Flexible", verification_status: "pending", avg_rating: 3, created_at: iso(90) },
      { profile_id: u.sneha, skills: ["Graphic Design", "Poster Making"], interests: ["Arts", "Culture"], availability: "Weekends", verification_status: "rejected", avg_rating: 0, created_at: iso(80) },
      { profile_id: u.tarun, skills: ["General Volunteering"], interests: ["Any Cause"], availability: "Unspecified", verification_status: "pending", avg_rating: 0, created_at: iso(70) },
    ],
    ngo_staff: [
      { id: uuid(), ngo_id: u.greenearth, profile_id: u.meera, invited_email: "meera@sanjivani.test", invited_name: "Meera Deshpande", status: "active", created_at: iso(120) },
      { id: uuid(), ngo_id: u.greenearth, profile_id: null, invited_email: "kavita@sanjivani.test", invited_name: "Kavita Rao", status: "invited", created_at: iso(3) },
      { id: uuid(), ngo_id: u.brightfutures, profile_id: u.arvind, invited_email: "arvind@sanjivani.test", invited_name: "Arvind Kulkarni", status: "active", created_at: iso(110) },
      { id: uuid(), ngo_id: u.brightfutures, profile_id: null, invited_email: "deepak@sanjivani.test", invited_name: "Deepak Naik", status: "invited", created_at: iso(2) },
    ],
    campaigns: [
      {
        id: c.river, ngo_id: u.greenearth, title: "River Clean-Up Drive",
        description:
          "A community drive to remove plastic and solid waste from the Mula riverbank, followed by a segregation and awareness session with local schools.",
        objectives:
          "Clear 3 km of riverbank; segregate and weigh collected waste; run 2 awareness sessions with schools; document before/after conditions.",
        location: "Mula Riverbank, Pune", start_date: dateIn(14), end_date: dateIn(21),
        type: "public", status: "upcoming", total_budget: 20000, remaining_budget: 20000, image_url: null, created_at: iso(7),
      },
      {
        id: c.tutoring, ngo_id: u.brightfutures, title: "After-School Tutoring Program",
        description:
          "Ongoing evening tutoring for 60 students from low-income families, covering maths, reading and computer basics, run in two batches.",
        objectives:
          "Reach 60 students weekly; maintain 80% attendance; train 4 new volunteer tutors; publish a monthly progress report for parents.",
        location: "Dharavi Community Centre, Mumbai", start_date: dateIn(-30), end_date: dateIn(30),
        type: "public", status: "ongoing", total_budget: 50000, remaining_budget: 46500, image_url: null, created_at: iso(45),
      },
      {
        id: c.plantation, ngo_id: u.greenearth, title: "Tree Plantation Marathon",
        description:
          "A one-day marathon planting 1,000 native saplings along the city ring road with 40 volunteers, followed by a 3-month care rota.",
        objectives:
          "Plant 1,000 saplings; achieve 85% survival at 3 months; assign a care buddy to every 25 saplings.",
        location: "Ring Road Green Belt, Pune", start_date: dateIn(-90), end_date: dateIn(-20),
        type: "public", status: "completed", total_budget: 30000, remaining_budget: 30000, image_url: null, created_at: iso(95),
      },
      {
        id: c.shelter, ngo_id: u.brightfutures, title: "Winter Shelter Support",
        description:
          "Invite-only campaign for trusted volunteers to run night shelters: bedding, hot meals and health checks for 80 homeless residents.",
        objectives:
          "Staff 2 shelters nightly for 6 weeks; serve 1 meal per guest per night; conduct weekly health checks.",
        location: "Byculla & Dadar Shelters, Mumbai", start_date: dateIn(21), end_date: dateIn(77),
        type: "invite", status: "upcoming", total_budget: 40000, remaining_budget: 40000, image_url: null, created_at: iso(4),
      },
    ],
    applications: [
      { id: "d0000000-0000-4000-8000-000000000001", volunteer_id: u.priya, campaign_id: c.tutoring, status: "accepted", created_at: iso(44) },
      { id: "d0000000-0000-4000-8000-000000000002", volunteer_id: u.rahul, campaign_id: c.tutoring, status: "accepted", created_at: iso(43) },
      { id: "d0000000-0000-4000-8000-000000000003", volunteer_id: u.priya, campaign_id: c.plantation, status: "accepted", created_at: iso(92) },
      { id: "d0000000-0000-4000-8000-000000000004", volunteer_id: u.rahul, campaign_id: c.plantation, status: "accepted", created_at: iso(92) },
      { id: "d0000000-0000-4000-8000-000000000005", volunteer_id: u.vikram, campaign_id: c.plantation, status: "accepted", created_at: iso(91) },
      { id: "d0000000-0000-4000-8000-000000000006", volunteer_id: u.aisha, campaign_id: c.tutoring, status: "pending", created_at: iso(2) },
      { id: "d0000000-0000-4000-8000-000000000007", volunteer_id: u.aisha, campaign_id: c.river, status: "pending", created_at: iso(1) },
      { id: "d0000000-0000-4000-8000-000000000008", volunteer_id: u.vikram, campaign_id: c.river, status: "pending", created_at: iso(1) },
      { id: "d0000000-0000-4000-8000-000000000009", volunteer_id: u.priya, campaign_id: c.shelter, status: "accepted", created_at: iso(3) },
    ],
    campaign_invites: [
      { id: "e0000000-0000-4000-8000-000000000001", campaign_id: c.shelter, volunteer_id: u.priya, invited_by: u.brightfutures, status: "accepted", created_at: iso(3) },
      { id: "e0000000-0000-4000-8000-000000000002", campaign_id: c.shelter, volunteer_id: u.aisha, invited_by: u.brightfutures, status: "pending", created_at: iso(2) },
    ],
    teams: [
      { id: t.educators, campaign_id: c.tutoring, name: "Educators", created_at: iso(42) },
      { id: t.core, campaign_id: c.plantation, name: "Core Team", created_at: iso(90) },
      { id: t.night, campaign_id: c.shelter, name: "Night Crew", created_at: iso(2) },
    ],
    team_members: [
      { id: uuid(), team_id: t.educators, user_id: u.meera, member_type: "staff", hours_logged: 0 },
      { id: uuid(), team_id: t.educators, user_id: u.priya, member_type: "volunteer", hours_logged: 0 },
      { id: uuid(), team_id: t.educators, user_id: u.rahul, member_type: "volunteer", hours_logged: 0 },
      { id: uuid(), team_id: t.core, user_id: u.meera, member_type: "staff", hours_logged: 24 },
      { id: uuid(), team_id: t.core, user_id: u.priya, member_type: "volunteer", hours_logged: 18 },
      { id: uuid(), team_id: t.core, user_id: u.rahul, member_type: "volunteer", hours_logged: 15 },
      { id: uuid(), team_id: t.core, user_id: u.vikram, member_type: "volunteer", hours_logged: 9 },
      { id: uuid(), team_id: t.night, user_id: u.arvind, member_type: "staff", hours_logged: 0 },
      { id: uuid(), team_id: t.night, user_id: u.priya, member_type: "volunteer", hours_logged: 0 },
    ],
    fund_allocations: [
      { id: uuid(), campaign_id: c.tutoring, member_id: u.meera, amount: 1500, note: "Travel reimbursement for site visits", status: "paid", created_at: iso(20) },
      { id: uuid(), campaign_id: c.tutoring, member_id: u.priya, amount: 2000, note: "Teaching materials for batch A", status: "pending", created_at: iso(5) },
    ],
    chat_rooms: [
      { id: r.planning, campaign_id: c.tutoring, name: "Planning Room", created_by: u.brightfutures, created_at: iso(40) },
      { id: r.field, campaign_id: c.tutoring, name: "Field Updates", created_by: u.brightfutures, created_at: iso(12) },
    ],
    chat_room_members: [
      { id: uuid(), room_id: r.planning, user_id: u.brightfutures },
      { id: uuid(), room_id: r.planning, user_id: u.meera },
      { id: uuid(), room_id: r.planning, user_id: u.priya },
      { id: uuid(), room_id: r.planning, user_id: u.rahul },
      { id: uuid(), room_id: r.field, user_id: u.brightfutures },
      { id: uuid(), room_id: r.field, user_id: u.meera },
      { id: uuid(), room_id: r.field, user_id: u.rahul },
    ],
    messages: [
      { id: uuid(), room_id: r.planning, sender_id: u.brightfutures, text: "Welcome everyone! Batch A starts Monday at 5 pm. Meera, can you confirm the centre is unlocked?", created_at: iso(39, 12) },
      { id: uuid(), room_id: r.planning, sender_id: u.meera, text: "Confirmed. I will pick up the keys from the trust office by 4:30.", created_at: iso(39, 13) },
      { id: uuid(), room_id: r.planning, sender_id: u.priya, text: "I can bring the maths workbooks I prepared. 30 copies should be enough for Monday.", created_at: iso(38, 9) },
      { id: uuid(), room_id: r.planning, sender_id: u.rahul, text: "I will handle attendance and click photos for the monthly report.", created_at: iso(38, 10) },
      { id: uuid(), room_id: r.planning, sender_id: u.brightfutures, text: "Perfect. Priya, your material budget has been recorded in the fund ledger.", created_at: iso(5, 15) },
      { id: uuid(), room_id: r.field, sender_id: u.meera, text: "Reminder: field visit tomorrow. Please reach the centre by 4 pm.", created_at: iso(11, 16) },
      { id: uuid(), room_id: r.field, sender_id: u.rahul, text: "On my way with the projector. Traffic is heavy, may be 10 minutes late.", created_at: iso(11, 17) },
    ],
    ratings: [
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.greenearth, to_user_id: u.priya, score: 5, comment: "Priya took charge of the care rota and kept every buddy group on track. Outstanding.", created_at: iso(18) },
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.greenearth, to_user_id: u.rahul, score: 4, comment: "Reliable volunteer, great photo documentation for our report.", created_at: iso(18) },
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.greenearth, to_user_id: u.vikram, score: 3, comment: "Slow to respond on coordination day but fine in the field.", created_at: iso(18) },
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.priya, to_user_id: u.greenearth, score: 5, comment: "Well-organized campaign. Materials and route maps were ready before time.", created_at: iso(17) },
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.rahul, to_user_id: u.greenearth, score: 4, comment: "Good coordination overall; transport could have been planned better.", created_at: iso(17) },
      { id: uuid(), campaign_id: c.plantation, from_user_id: u.vikram, to_user_id: u.greenearth, score: 4, comment: "Clear instructions and friendly team leads.", created_at: iso(17) },
    ],
    volunteer_reports: [
      {
        id: uuid(), volunteer_id: u.vikram, reported_by: u.greenearth, campaign_id: c.plantation,
        reason:
          "Missed two of the four care-rota rounds without notice and was unreachable on the plantation weekend. Other volunteers had to cover the assigned sapling zone.",
        status: "open", created_at: iso(10),
      },
    ],
    notifications: [
      { id: uuid(), user_id: u.greenearth, type: "ngo_verification", message: 'Your NGO "Green Earth Foundation" was approved.', read: true, created_at: iso(147) },
      { id: uuid(), user_id: u.greenearth, type: "system", message: "Welcome to Sanjivani! Create your first campaign to get started.", read: true, created_at: iso(147) },
      { id: uuid(), user_id: u.brightfutures, type: "ngo_verification", message: 'Your NGO "Bright Futures Trust" was approved.', read: true, created_at: iso(137) },
      { id: uuid(), user_id: u.priya, type: "volunteer_verification", message: "Your volunteer verification was approved.", read: true, created_at: iso(60) },
      { id: uuid(), user_id: u.priya, type: "system", message: "Welcome to Sanjivani! Browse campaigns to find one you like.", read: true, created_at: iso(130) },
      { id: uuid(), user_id: u.rahul, type: "volunteer_verification", message: "Your volunteer verification was approved.", read: true, created_at: iso(55) },
    ],
  };

  return { users, tables, seq: 1 };
}

const KEY = Symbol.for("sanjivani-demo-store");

export function getStore(): DemoStore {
  const g = globalThis as Record<symbol, DemoStore | undefined>;
  if (!g[KEY]) g[KEY] = seed();
  return g[KEY];
}

export function resetStore(): void {
  const g = globalThis as Record<symbol, DemoStore | undefined>;
  g[KEY] = seed();
}

/** Tables whose rows get an `id` / `created_at` default on insert. */
export const DEFAULT_ID_TABLES = new Set([
  "ngo_staff",
  "campaigns",
  "volunteer_reports",
  "teams",
  "team_members",
  "applications",
  "campaign_invites",
  "fund_allocations",
  "chat_rooms",
  "chat_room_members",
  "messages",
  "notifications",
  "ratings",
]);
