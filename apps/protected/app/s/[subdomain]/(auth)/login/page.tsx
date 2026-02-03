// apps/protected/app/s/[subdomain]/(auth)/login/page.tsx
import type { ReactElement } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;
  const search = await searchParams;

  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();

  // If we have a valid session cookie and it belongs to this tenant, skip login
  if (
    !error &&
    claims &&
    claims.claims.subdomain === subdomain &&
    claims.claims.email_confirmed === true
  ) {
    // Check if this is a first-time login or new organization
    const isFirstLogin = search.first_login === "true";
    const isNewOrg = search.new_org === "true";

    let dashboardUrl = "/dashboard";
    const params = new URLSearchParams();

    if (isFirstLogin) params.set("welcome", "true");
    if (isNewOrg) params.set("new_organization", "true");

    if (params.toString()) {
      dashboardUrl += `?${params.toString()}`;
    }

    redirect(dashboardUrl);
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to {subdomain}</p>
        </div>
        <LoginForm subdomain={subdomain} />
      </div>
    </div>
  );
}
