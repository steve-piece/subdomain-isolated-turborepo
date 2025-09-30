// apps/protected/app/s/[subdomain]/(user-settings)/settings/notifications/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  noStore();
  const { subdomain } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?reason=no_session");
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

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
