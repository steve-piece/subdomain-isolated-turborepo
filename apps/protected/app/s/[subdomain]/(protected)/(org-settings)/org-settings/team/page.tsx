// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/team/page.tsx
/**
 * ✅ PHASE 1.5e: Simplified team page
 * - Simple role check (no RequireTenantAuth wrapper)
 * - Caching enabled (revalidate = 30)
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { UserPlus, Users } from "lucide-react";
import { InviteUserDialog } from "@/components/shared/invite-user-dialog";

// ✅ Team page is more dynamic - cache for 30 seconds
export const revalidate = 30;

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Simple role check
  const { data: claims } = await supabase.auth.getClaims();
  const userRole = claims?.claims.user_role || "member";

  if (!["owner", "admin", "superadmin"].includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  const orgId = claims?.claims.org_id;

  // Fetch team members
  const { data: teamMembers } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("org_id", orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </div>
          <InviteUserDialog
            subdomain={subdomain}
            trigger={
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers?.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{member.full_name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
