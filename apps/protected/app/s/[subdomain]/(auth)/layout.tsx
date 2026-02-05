// apps/protected/app/s/[subdomain]/(auth)/layout.tsx
// Layout for authentication routes that redirects already-authenticated users to dashboard
// NOTE: Uses connection() to explicitly opt into dynamic rendering for auth checks
import type { ReactElement } from "react";
import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  // Explicitly opt into dynamic rendering for auth state checks
  await connection();
  const { subdomain } = await params;
  const supabase = await createClient();

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, check if they belong to this subdomain
  if (user) {
    const { data: claims } = await supabase.auth.getClaims();

    // If user has valid JWT claims and belongs to this subdomain, redirect to dashboard
    if (claims?.claims && claims.claims.subdomain === subdomain) {
      redirect("/dashboard");
    }

    // If user is authenticated but doesn't belong to this subdomain,
    // sign them out and let them continue to login page
    if (claims?.claims && claims.claims.subdomain !== subdomain) {
      await supabase.auth.signOut();
    }
  }

  // User is not authenticated or doesn't belong to this subdomain - show auth pages
  return <>{children}</>;
}
