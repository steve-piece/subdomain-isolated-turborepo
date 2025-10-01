// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/roles/page.tsx
/**
 * ✅ PHASE 1.5g: Simplified roles page
 * - Simple role check (owner only)
 * - Caching enabled (revalidate = 60)
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  canCustomizeRoles,
  getAllCapabilities,
  getOrgCustomCapabilities,
} from "@actions/rbac";
import { RoleCapabilitiesManager } from "@/components/org-settings/roles/role-capabilities-manager";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
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

  // Check if org can customize roles
  const canCustomizeResponse = await canCustomizeRoles();

  if (!canCustomizeResponse.success || !canCustomizeResponse.canCustomize) {
    // Fetch organization to get current tier
    const { data: organization } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", orgId)
      .single();

    return (
      <UpgradePrompt
        feature="Custom Roles & Permissions"
        requiredTier="Business"
        currentTier={organization?.plan || "Free"}
      />
    );
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
    <RoleCapabilitiesManager
      orgId={orgId}
      allCapabilities={allCapabilities}
      customCapabilities={customCapabilities}
    />
  );
}
