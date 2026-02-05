// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/notifications/page.tsx
/**
 * ✅ PHASE 1.5c: Simplified notifications page
 * - No duplicate auth checks (layout handles it)
 * - MIGRATED from: export const revalidate = 120
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife({ revalidate: 120 }) if caching needed
 */
import type { ReactElement } from "react";
import { createClient } from "@workspace/supabase/server";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement | null> {
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
