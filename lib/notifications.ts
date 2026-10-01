import { createAdminClient } from "./supabase/admin";

/**
 * Insert a notification row server-side (spec §8 /api/notify equivalent).
 * Most notifications are produced by the database triggers in
 * supabase/migrations/00004_triggers.sql; this helper covers server
 * actions that need one-off notifications.
 */
export async function createNotification(
  userId: string,
  type: string,
  message: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({ user_id: userId, type, message });
  } catch (err) {
    // Notification failures must never break the primary operation.
    console.error("[notifications] insert failed:", err);
  }
}
