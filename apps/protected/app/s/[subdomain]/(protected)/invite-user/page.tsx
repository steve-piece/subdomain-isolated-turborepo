// apps/protected/app/s/[subdomain]/(protected)/invite-user/page.tsx
import { InviteUserForm } from "@/components/invite-user-form";
import { ClientRoleGuard } from "@/components/client-role-guard";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

interface InviteUserPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function InviteUserPage({ params }: InviteUserPageProps) {
  const { subdomain } = await params;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ClientRoleGuard
        subdomain={subdomain}
        allowedRoles={["owner", "admin", "superadmin"]}
        redirectToLogin={true}
        fallbackMessage="Only owners and admins can invite team members"
      >
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
      </ClientRoleGuard>
    </div>
  );
}
