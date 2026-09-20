/** Row shapes returned from Supabase queries (spec §7). */

export type Role = "admin" | "ngo" | "volunteer" | "staff";

export interface Profile {
  id: string;
  role: Role;
  name: string | null;
  location: string | null;
  avatar_url: string | null;
  suspended: boolean;
  created_at: string;
}

export interface Ngo {
  profile_id: string;
  org_name: string;
  registration_number: string | null;
  verification_status: "pending" | "approved" | "rejected";
  logo_url: string | null;
  avg_rating: number;
  profile?: Profile;
}

export interface Volunteer {
  profile_id: string;
  skills: string[] | null;
  interests: string[] | null;
  availability: string | null;
  avg_rating: number;
  verification_status: "pending" | "approved" | "rejected";
  profile?: Profile;
}

export interface VolunteerReport {
  id: string;
  volunteer_id: string;
  reported_by: string;
  campaign_id: string | null;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  volunteer?: Profile;
  reporter?: Profile;
  campaign?: { id: string; title: string } | null;
}

export interface NgoStaff {
  id: string;
  ngo_id: string;
  profile_id: string | null;
  invited_email: string;
  invited_name: string | null;
  status: "invited" | "active";
  created_at: string;
  profile?: Profile | null;
}

export interface Campaign {
  id: string;
  ngo_id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  type: "public" | "invite";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  total_budget: number;
  remaining_budget: number;
  image_url: string | null;
  created_at: string;
  ngo?: Ngo;
}

export interface Team {
  id: string;
  campaign_id: string;
  name: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  member_type: "staff" | "volunteer";
  hours_logged: number;
  profile?: Profile;
}

export interface Application {
  id: string;
  volunteer_id: string;
  campaign_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  volunteer?: Profile & { volunteers?: Volunteer };
  campaign?: Pick<Campaign, "id" | "title" | "status" | "type"> & { ngo?: Pick<Ngo, "org_name"> };
}

export interface CampaignInvite {
  id: string;
  campaign_id: string;
  volunteer_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  volunteer?: Profile & { volunteers?: Volunteer };
  campaign?: Pick<
    Campaign,
    "id" | "title" | "status" | "type" | "start_date" | "end_date" | "location"
  > & {
    ngo?: Pick<Ngo, "org_name" | "profile_id" | "verification_status">;
  };
}

export interface FundAllocation {
  id: string;
  campaign_id: string;
  member_id: string;
  amount: number;
  note: string | null;
  status: "pending" | "paid";
  created_at: string;
  profile?: Profile;
}

export interface ChatRoom {
  id: string;
  campaign_id: string;
  name: string;
  created_by: string;
  created_at: string;
  members?: Array<{ user_id: string; profile?: Profile }>;
  last_message_at?: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
}

export interface Rating {
  id: string;
  campaign_id: string;
  from_user_id: string;
  to_user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  from_user?: Profile;
  to_user?: Profile;
  campaign?: Pick<Campaign, "id" | "title">;
}
