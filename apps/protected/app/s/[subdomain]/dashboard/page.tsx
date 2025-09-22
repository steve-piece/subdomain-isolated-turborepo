import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationDashboard } from "@/components/organization-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // Check authentication on the server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If no user or auth error, redirect to login
  if (!user || error) {
    redirect("/auth/login");
  }

  // TODO: Add organization membership verification here
  // Check if user belongs to this specific subdomain/organization
  // const { data: membership } = await supabase
  //   .from('user_profiles')
  //   .select('role, tenant_id')
  //   .eq('user_id', user.id)
  //   .single()

  // For now, assume user is authorized if they have a valid session
  const userName =
    user.user_metadata?.full_name || user.email || "Unknown User";

  return <OrganizationDashboard subdomain={subdomain} userEmail={userName} />;
}
