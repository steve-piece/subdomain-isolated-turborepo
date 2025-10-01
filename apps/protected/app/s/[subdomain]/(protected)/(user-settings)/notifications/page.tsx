// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/notifications/page.tsx
/**
 * ✅ PHASE 1.5c: Simplified notifications page
 * - No duplicate auth checks (layout handles it)
 * - Caching enabled (revalidate = 120)
 */
import { createClient } from "@/lib/supabase/server";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";

// ✅ Notification preferences change infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  await params; // Consume params
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user notification preferences
  const { data: preferences } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <NotificationPreferencesForm
      initialPreferences={preferences || undefined}
    />
  );
}
