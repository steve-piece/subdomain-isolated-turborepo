// apps/protected/app/s/[subdomain]/auth/reauthenticate/page.tsx
import type { ReactElement } from "react";
import { ReauthenticateForm } from "@/components/auth/reauthenticate-form";
import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";

interface ReauthenticatePageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReauthenticatePage({
  params,
  searchParams,
}: ReauthenticatePageProps): Promise<ReactElement> {
  const { subdomain } = await params;
  const query = await searchParams;

  const actionParam = query.action;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  // Tight tenant gating (server-side) for this auth route
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims) redirect("/auth/login?reason=no_session");
  if (claims.claims.subdomain !== subdomain)
    redirect("/auth/login?error=unauthorized");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <ReauthenticateForm subdomain={subdomain} pendingAction={action} />
      </div>
    </div>
  );
}
