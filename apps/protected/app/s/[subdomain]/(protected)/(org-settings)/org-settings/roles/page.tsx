// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/roles/page.tsx
/**
 * ✅ TIER-GATED: Roles page with Business+ access control
 * - Wrapped with RequireTierAccess for tier checking
 * - Simple role check (owner only)
 * - Caching enabled (revalidate = 60)
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllCapabilities, getOrgCustomCapabilities } from "@actions/rbac";
import { RoleCapabilitiesManager } from "@/components/org-settings/roles/role-capabilities-manager";
import { RequireTierAccess } from "@/components/shared/require-tier-access";
import { UserRole } from "@/lib/rbac/permissions";

// ✅ Roles change infrequently - cache for 60 seconds
export const revalidate = 60;

export default async function RolesCustomizationPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  await params; // Consume params
  const supabase = await createClient();

  // ✅ Simple role check - owner only
  const { data: claims } = await supabase.auth.getClaims();
  const userRole = claims?.claims.user_role || "member";

  if (userRole !== "owner") {
    redirect("/dashboard?error=unauthorized");
  }

  const orgId = claims?.claims.org_id;
  if (!orgId) {
    redirect("/dashboard?error=no_organization");
  }

  // Get all capabilities and custom capabilities
  const [allCapabilitiesResponse, customCapabilitiesResponse] =
    await Promise.all([getAllCapabilities(), getOrgCustomCapabilities()]);

  const allCapabilities = (
    allCapabilitiesResponse.success ? allCapabilitiesResponse.data || [] : []
  ) as Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    min_role_required?: UserRole; // Database field for default role access
  }>;

  const customCapabilities = (
    customCapabilitiesResponse.success
      ? customCapabilitiesResponse.data || []
      : []
  ) as Array<{
    role: UserRole;
    granted: boolean;
    updated_at: string;
    capabilities: {
      id: string;
      key: string;
      name: string;
      description: string;
      category: string;
    };
  }>;

  return (
    <RequireTierAccess
      featureName="Custom Role Management"
      featureDescription="Define custom capabilities for each role in your organization. Control exactly what each team member can access and modify with granular permissions."
    >
      <RoleCapabilitiesManager
        orgId={orgId}
        allCapabilities={allCapabilities}
        customCapabilities={customCapabilities}
      />
    </RequireTierAccess>
  );
}
