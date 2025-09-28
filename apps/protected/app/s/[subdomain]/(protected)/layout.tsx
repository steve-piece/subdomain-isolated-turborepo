// apps/protected/app/s/[subdomain]/(protected)/layout.tsx
/**
 * Route-group layout that protects all nested routes under (protected)
 * by enforcing tenant auth once at the layout boundary.
 */
import RequireTenantAuth from "@/components/require-tenant-auth";
import * as Sentry from "@sentry/nextjs";

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
      {(claims) => {
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

        return children;
      }}
    </RequireTenantAuth>
  );
}
