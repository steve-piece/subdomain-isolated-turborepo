// apps/protected/app/s/[subdomain]/auth/reauthenticate/page.tsx
import { ReauthenticateForm } from "@/components/reauthenticate-form";
import RequireTenantAuth from "@/components/require-tenant-auth";

interface ReauthenticatePageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReauthenticatePage({
  params,
  searchParams,
}: ReauthenticatePageProps) {
  const { subdomain } = await params;
  const query = await searchParams;

  const actionParam = query.action;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  return (
    <RequireTenantAuth subdomain={subdomain}>
      {() => (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <ReauthenticateForm subdomain={subdomain} pendingAction={action} />
          </div>
        </div>
      )}
    </RequireTenantAuth>
  );
}
