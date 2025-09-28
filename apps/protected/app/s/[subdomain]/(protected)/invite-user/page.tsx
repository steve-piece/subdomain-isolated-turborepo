// apps/protected/app/s/[subdomain]/(protected)/invite-user/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteUserForm } from "@/components/invite-user-form";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

interface InviteUserPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function InviteUserPage({ params }: InviteUserPageProps) {
  const { subdomain } = await params;

  try {
    const supabase = await createClient();

    // Get claims for authentication and permission verification
    const { data: claims, error } = await supabase.auth.getClaims();

    // If no claims or auth error, redirect to login
    if (!claims || error) {
      redirect("/auth/login");
    }

    // Verify user belongs to this specific subdomain/organization
    if (claims.claims.subdomain !== subdomain) {
      redirect("/auth/login?error=unauthorized");
    }

    // Verify user has permission to invite (admin or superadmin only)
    if (!["admin", "superadmin"].includes(claims.claims.user_role)) {
      redirect("/dashboard?error=insufficient_permissions");
    }
  } catch (error) {
    Sentry.captureException(error);
    Sentry.logger.error("invite_user_page_error", {
      message: error instanceof Error ? error.message : "Unknown error",
      subdomain,
    });
    return redirect("/auth/login");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
        <InviteUserForm subdomain={subdomain} />
      </div>
    </div>
  );
}
