// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/roles/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  canCustomizeRoles,
  getAllCapabilities,
  getOrgCustomCapabilities,
} from "@/app/actions";
import { RoleCapabilitiesManager } from "@/components/role-capabilities-manager";
import { UpgradePrompt } from "@/components/upgrade-prompt";

export default async function RolesCustomizationPage({
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

  const organizationName = claims.claims.company_name || subdomain;
  const userRole = claims.claims.user_role || "member";
  const orgId = claims.claims.org_id;

  // Only owners can customize roles
  if (userRole !== "owner") {
    redirect(
      "/org-settings?error=unauthorized&message=Only owners can customize roles"
    );
  }

  // Check if org can customize
  const tierCheck = await canCustomizeRoles();

  if (!tierCheck.success || !tierCheck.canCustomize) {
    return (
      <UpgradePrompt
        feature="Custom Role Capabilities"
        requiredTier="Business"
        currentTier={tierCheck.tier || "free"}
        description="Customize what each role can do in your organization with fine-grained permission control."
        benefits={[
          "Grant additional capabilities to lower roles",
          "Revoke default capabilities from any role",
          "Create custom permission workflows",
          "Full audit trail of all changes",
        ]}
      />
    );
  }

  // Fetch all capabilities
  const capabilitiesResult = await getAllCapabilities();
  const customCapabilitiesResult = await getOrgCustomCapabilities();

  if (!capabilitiesResult.success) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{capabilitiesResult.message}</p>
      </div>
    );
  }

  return (
    <RoleCapabilitiesManager
      capabilities={capabilitiesResult.data || []}
      customCapabilities={customCapabilitiesResult.data || []}
      orgId={orgId}
      organizationName={organizationName}
    />
  );
}
