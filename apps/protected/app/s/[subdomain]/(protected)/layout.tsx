// apps/protected/app/s/[subdomain]/(protected)/layout.tsx
/**
 * Route-group layout that protects all nested routes under (protected)
 * by enforcing tenant auth once at the layout boundary.
 * Now includes the AppSidebar for consistent navigation with RBAC enforcement.
 */
import RequireTenantAuth from "@/components/require-tenant-auth";
import { AppSidebar } from "@/components/app-sidebar";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  return (
    <RequireTenantAuth subdomain={subdomain}>
      {async (claims) => {
        const sanitizedClaimSummary = {
          claimKeys: Object.keys(claims.claims ?? {}),
          hasOrgId: Boolean(claims.claims?.org_id),
          hasUserRole: Boolean(claims.claims?.user_role),
        };

        if (!claims.claims.org_id) {
          Sentry.logger.warn("require_tenant_auth_missing_org_id", {
            subdomain,
            sanitizedClaimSummary,
          });
        }

        if (!claims.claims.user_role) {
          Sentry.logger.warn("require_tenant_auth_missing_user_role", {
            subdomain,
            sanitizedClaimSummary,
          });
        }

        const organizationName = claims.claims.company_name || subdomain;
        const userRole = claims.claims.user_role || "member";
        const orgId = claims.claims.org_id;

        // Get user capabilities from database
        let userCapabilities: string[] = [];
        if (orgId) {
          try {
            const supabase = await createClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              // Get user's role-based capabilities
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("user_id", user.id)
                .eq("org_id", orgId)
                .single();

              if (profile) {
                const { data: capabilities } = await supabase
                  .from("role_capabilities")
                  .select("capabilities(key)")
                  .eq("role", profile.role)
                  .eq("is_default", true);

                if (capabilities) {
                  userCapabilities = capabilities
                    .map((cap: any) => cap.capabilities?.key)
                    .filter(Boolean);
                }
              }
            }
          } catch (error) {
            Sentry.captureException(error, {
              tags: {
                context: "protected_layout_capabilities",
                org_id: orgId,
              },
            });
          }
        }

        return (
          <div className="flex h-screen overflow-hidden bg-background">
            <AppSidebar
              subdomain={subdomain}
              organizationName={organizationName}
              userRole={userRole}
              orgId={orgId}
              userCapabilities={userCapabilities}
            />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        );
      }}
    </RequireTenantAuth>
  );
}
