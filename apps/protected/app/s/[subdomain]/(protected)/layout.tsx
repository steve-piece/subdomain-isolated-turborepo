/**
 * Route-group layout that protects all nested routes under (protected)
 * by enforcing tenant auth once at the layout boundary.
 */
import RequireTenantAuth from "@/components/require-tenant-auth";

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
          console.warn(
            "RequireTenantAuth missing org_id for user",
            sanitizedClaimSummary
          );
        }

        if (!claims.claims.user_role) {
          console.warn(
            "RequireTenantAuth missing user_role for user",
            sanitizedClaimSummary
          );
        }

        return children;
      }}
    </RequireTenantAuth>
  );
}
