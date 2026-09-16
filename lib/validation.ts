import { z } from "zod";

/* ============================================================
 * Auth (spec §6 / §12)
 * ============================================================ */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ngo", "volunteer", "staff"]),
    name: z.string().trim().min(1, "Name is required").max(100),
    location: z.string().trim().max(100).optional().or(z.literal("")),
    // NGO fields
    orgName: z.string().trim().max(120).optional().or(z.literal("")),
    registrationNumber: z.string().trim().max(60).optional().or(z.literal("")),
    // Volunteer fields (comma separated in the form)
    skills: z.string().trim().max(200).optional().or(z.literal("")),
    interests: z.string().trim().max(200).optional().or(z.literal("")),
    availability: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.role === "ngo") {
      if (!data.orgName || !data.orgName.trim()) {
        ctx.addIssue({ code: "custom", path: ["orgName"], message: "Organisation name is required" });
      }
      if (!data.registrationNumber || !data.registrationNumber.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["registrationNumber"],
          message: "Registration number is required",
        });
      }
    }
  });

/* ============================================================
 * Campaigns (spec §12)
 * ============================================================ */

export const campaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(140),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    objectives: z.string().trim().max(2000).optional().or(z.literal("")),
    location: z.string().trim().max(140).optional().or(z.literal("")),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker (YYYY-MM-DD)")
      .optional()
      .or(z.literal("")),
    type: z.enum(["public", "invite"]).default("public"),
    status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming"),
    total_budget: z.coerce
      .number()
      .min(0, "Budget must be zero or more")
      .optional()
      .or(z.literal("").transform(() => 0)),
    image_url: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      !data.start_date || !data.end_date || data.end_date >= data.start_date,
    { message: "End date must be on or after the start date", path: ["end_date"] }
  );

export const campaignStatusSchema = z.object({
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]),
});

/* ============================================================
 * Funds (spec §12)
 * ============================================================ */

export const fundAllocationSchema = z.object({
  member_id: z.uuid("Pick a team member"),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .refine((v) => Math.round(v * 100) === v * 100, "Use at most two decimal places"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ============================================================
 * Ratings (spec §12)
 * ============================================================ */

export const ratingSchema = z.object({
  score: z.coerce.number().int("Score must be a whole number").min(1, "Score must be 1–5").max(5, "Score must be 1–5"),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ============================================================
 * Volunteer reports (spec §12)
 * ============================================================ */

export const volunteerReportSchema = z.object({
  volunteer_id: z.uuid("Pick a volunteer"),
  campaign_id: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "A reason is required")
    .max(1000, "Reason must be 1000 characters or fewer"),
});

/* ============================================================
 * Staff invites (spec §12)
 * ============================================================ */

export const staffInviteSchema = z.object({
  invited_email: z.email("Enter a valid email address"),
  invited_name: z.string().trim().min(1, "Name is required").max(100),
});

/* ============================================================
 * Chat (spec §12)
 * ============================================================ */

export const chatRoomSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(100, "Room name must be 100 characters or fewer"),
  campaign_id: z.uuid(),
  member_ids: z.array(z.uuid()).min(1, "Pick at least one team member"),
});

export const messageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or fewer"),
});

export const roomMembersSchema = z.object({
  add: z.array(z.uuid()).default([]),
  remove: z.array(z.uuid()).default([]),
});

export const roomRenameSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(100),
});

/* ============================================================
 * Campaign invites (spec §8 / §12)
 * ============================================================ */

export const campaignInviteSchema = z.object({
  volunteer_id: z.uuid("Pick a volunteer"),
});

export const inviteRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

/* ============================================================
 * Applications / hours / profiles
 * ============================================================ */

export const hoursSchema = z.object({
  hours: z.coerce.number().min(0, "Hours must be zero or more"),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  avatar_url: z.string().trim().max(500).optional().or(z.literal("")),
});

export const ngoProfileUpdateSchema = profileUpdateSchema.extend({
  org_name: z.string().trim().min(1, "Organisation name is required").max(120),
  registration_number: z.string().trim().min(1, "Registration number is required").max(60),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
});

export const volunteerProfileUpdateSchema = profileUpdateSchema.extend({
  skills: z.array(z.string().trim().min(1).max(40)).max(10),
  interests: z.array(z.string().trim().min(1).max(40)).max(10),
  availability: z.string().trim().max(100).optional().or(z.literal("")),
});

/* ============================================================
 * Notifications (internal API)
 * ============================================================ */

export const notifySchema = z.object({
  user_id: z.uuid(),
  type: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(500),
});

/* ============================================================
 * Types
 * ============================================================ */

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type FundAllocationInput = z.infer<typeof fundAllocationSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type VolunteerReportInput = z.infer<typeof volunteerReportSchema>;
export type StaffInviteInput = z.infer<typeof staffInviteSchema>;
export type ChatRoomInput = z.infer<typeof chatRoomSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
