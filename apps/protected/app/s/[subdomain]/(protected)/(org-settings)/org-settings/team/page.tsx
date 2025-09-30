// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/team/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { UserPlus, Users, Mail, Shield, MoreVertical } from "lucide-react";
import { InviteUserDialog } from "@/components/invite-user-dialog";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  noStore();
  const { subdomain } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?reason=no_session");
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  const organizationName = claims.claims.company_name || subdomain;
  const userRole = claims.claims.user_role || "member";

  // Check if user has permission to view team settings
  const allowedRoles = ["owner", "admin", "superadmin"];
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  // Mock team data - in production, fetch from your database
  const teamMembers = [
    {
      id: user.id,
      name: claims.claims.full_name || "You",
      email: user.email,
      role: userRole,
      status: "active",
      joinedAt: user.created_at,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Team Members</CardTitle>
              </div>
              <CardDescription>
                Manage who has access to {organizationName}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {member.name?.charAt(0)?.toUpperCase() ||
                        member.email?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {member.name}
                      {member.id === user.id && (
                        <span className="text-xs text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Joined{" "}
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Team members who haven't accepted their invitation yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No pending invitations</p>
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>
            Understanding access levels in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Owner
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to all organization settings, billing, and team
                management. Can delete the organization.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  Admin
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Can manage team members, projects, and most organization
                settings. Cannot access billing or delete the organization.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  Member
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Can access projects and collaborate with the team. Cannot manage
                organization settings or invite new members.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>
            Configure how your team collaborates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="text-sm font-medium">Require Admin Approval</h4>
              <p className="text-sm text-muted-foreground">
                New invitations require approval from an admin before being sent
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4" />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="text-sm font-medium">Allow Member Invites</h4>
              <p className="text-sm text-muted-foreground">
                Let regular members invite new team members
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
